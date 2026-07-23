-- 013: Nuevos tipos de promoción y promociones por departamento.
--
-- Tipos nuevos:
--   - PRECIO_ESPECIAL: cada unidad a `precio_promocional` mientras la promo
--     esté vigente (ej. "cuaderno a $10 en regreso a clases").
--   - MAYOREO: al llevar `valor` o más unidades, TODAS salen a
--     `precio_promocional` (ej. "10+ plumas a $4 c/u").
--
-- Promoción por departamento: `departamentos.promocion_id`. Si el producto
-- tiene promoción propia, esa gana (es más específica); si no, aplica la de
-- su departamento. En ambos casos nunca se cobra más que el precio normal.
--
-- registrar_venta_completa v3 resuelve y calcula los cuatro tipos en el
-- servidor (misma política de integridad de la migración 012).

ALTER TABLE public.promociones
    ADD COLUMN IF NOT EXISTS precio_promocional numeric NULL;

COMMENT ON COLUMN public.promociones.precio_promocional IS
    'PRECIO_ESPECIAL: precio por unidad. MAYOREO: precio por unidad al llegar a `valor` piezas.';

ALTER TABLE public.promociones
    DROP CONSTRAINT IF EXISTS promociones_tipo_promocion_check;
ALTER TABLE public.promociones
    ADD CONSTRAINT promociones_tipo_promocion_check
    CHECK (tipo_promocion::text = ANY (ARRAY[
        'PORCENTAJE', 'CANTIDAD_X_CANTIDAD', 'PRECIO_ESPECIAL', 'MAYOREO'
    ]::text[]));

ALTER TABLE public.promociones
    DROP CONSTRAINT IF EXISTS chk_precio_promocional;
ALTER TABLE public.promociones
    ADD CONSTRAINT chk_precio_promocional
    CHECK (precio_promocional IS NULL OR precio_promocional > 0);

ALTER TABLE public.departamentos
    ADD COLUMN IF NOT EXISTS promocion_id integer NULL
    REFERENCES public.promociones(promocion_id);

CREATE OR REPLACE FUNCTION public.registrar_venta_completa(
    empleado_id_param integer,
    cliente_id_param integer,
    metodo_pago_id_param integer,
    corte_id_param integer,
    carrito_param jsonb,                  -- [{"producto_id": int, "cantidad": num}]
    ticket_id_param integer DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
declare
    new_venta_id int;
    total_venta numeric := 0;
    item record;
    prod record;
    -- %rowtype y no `record`: a un record sin asignar no se le pueden leer
    -- campos (falla con productos sin promoción); al rowtype sí (quedan null).
    promo promociones%rowtype;
    tipo_movimiento_salida_id int;
    stock_disponible numeric;
    importe_linea numeric;
    descuento_linea numeric;
    paga numeric;
    grupos numeric;
    sobrantes numeric;
    es_credito boolean := false;
    cli record;
    saldo_ant numeric;
begin
    if carrito_param is null or jsonb_typeof(carrito_param) <> 'array'
       or jsonb_array_length(carrito_param) = 0 then
        raise exception 'El carrito está vacío.';
    end if;

    select tipo_movimiento_id into tipo_movimiento_salida_id
    from tiposmovimientoinventario where upper(nombre) = 'VENTA' limit 1;

    insert into ventas (empleado_id, cliente_id, subtotal, impuestos, total, estado, corte_id)
    values (empleado_id_param, cliente_id_param, 0, 0, 0, 'COMPLETADA', corte_id_param)
    returning venta_id into new_venta_id;

    for item in
        select (e->>'producto_id')::int as producto_id,
               (e->>'cantidad')::numeric as cantidad
        from jsonb_array_elements(carrito_param) e
    loop
        if item.producto_id is null or item.cantidad is null or item.cantidad <= 0 then
            raise exception 'Renglón inválido en el carrito (producto %, cantidad %).',
                item.producto_id, item.cantidad;
        end if;

        -- Precio y descripción REALES desde la base, no del navegador.
        select p.producto_id, p.descripcion, p.precio_venta, p.promocion_id, p.departamento_id
        into prod
        from productos p
        where p.producto_id = item.producto_id;
        if not found then
            raise exception 'El producto % no existe.', item.producto_id;
        end if;

        -- Bloquea el renglón de inventario para evitar carreras entre cajas.
        select cantidad_actual into stock_disponible
        from inventario
        where producto_id = item.producto_id and almacen_id = 1
        for update;
        if stock_disponible is null or stock_disponible < item.cantidad then
            raise exception 'Stock insuficiente para "%". Disponible: %, solicitado: %',
                prod.descripcion, coalesce(stock_disponible, 0), item.cantidad;
        end if;

        importe_linea := item.cantidad * prod.precio_venta;
        descuento_linea := 0;
        promo := null;

        -- Resolución de promoción (reloj del SERVIDOR):
        -- 1º la del producto; si no tiene, la de su departamento.
        if prod.promocion_id is not null then
            select * into promo
            from promociones pr
            where pr.promocion_id = prod.promocion_id
              and pr.activo
              and pr.fecha_inicio <= now()
              and (pr.fecha_fin is null or pr.fecha_fin >= now());
        end if;
        if promo.promocion_id is null and prod.departamento_id is not null then
            select pr.* into promo
            from departamentos d
            join promociones pr on pr.promocion_id = d.promocion_id
            where d.departamento_id = prod.departamento_id
              and pr.activo
              and pr.fecha_inicio <= now()
              and (pr.fecha_fin is null or pr.fecha_fin >= now());
        end if;

        if promo.promocion_id is not null then
            if promo.tipo_promocion = 'PORCENTAJE' and promo.valor > 0 then
                descuento_linea := round(importe_linea * promo.valor / 100, 2);
            elsif promo.tipo_promocion = 'CANTIDAD_X_CANTIDAD' and promo.valor > 0 then
                -- "Lleva N, paga M" (mismas reglas que el carrito del front).
                paga := coalesce(promo.cantidad_pago, 1);
                grupos := floor(item.cantidad / promo.valor);
                sobrantes := item.cantidad - grupos * promo.valor;
                descuento_linea := round(
                    importe_linea - (grupos * paga + sobrantes) * prod.precio_venta, 2);
            elsif promo.tipo_promocion = 'PRECIO_ESPECIAL'
                  and coalesce(promo.precio_promocional, 0) > 0 then
                -- Precio fijo por unidad (nunca más caro que el normal).
                descuento_linea := round(
                    importe_linea
                    - item.cantidad * least(promo.precio_promocional, prod.precio_venta), 2);
            elsif promo.tipo_promocion = 'MAYOREO'
                  and coalesce(promo.valor, 0) > 0
                  and item.cantidad >= promo.valor
                  and coalesce(promo.precio_promocional, 0) > 0 then
                -- Al llegar a `valor` piezas, todas a precio de mayoreo.
                descuento_linea := round(
                    importe_linea
                    - item.cantidad * least(promo.precio_promocional, prod.precio_venta), 2);
            end if;
        end if;

        -- Una promoción jamás aumenta el precio.
        descuento_linea := greatest(descuento_linea, 0);
        importe_linea := round(importe_linea - descuento_linea, 2);
        total_venta := total_venta + importe_linea;

        insert into detalleventa (venta_id, producto_id, cantidad,
                                  precio_unitario_registrado, descuento_aplicado,
                                  impuesto_aplicado, importe_total,
                                  descripcion_registrada, promocion_id)
        values (new_venta_id, item.producto_id, item.cantidad,
                prod.precio_venta, descuento_linea,
                0, importe_linea,
                prod.descripcion, promo.promocion_id);

        update inventario
        set cantidad_actual = cantidad_actual - item.cantidad
        where producto_id = item.producto_id and almacen_id = 1;

        insert into movimientosinventario (producto_id, almacen_id, tipo_movimiento_id,
                                           cantidad, referencia_id, referencia_tabla, empleado_id)
        values (item.producto_id, 1, tipo_movimiento_salida_id,
                item.cantidad, new_venta_id, 'ventas', empleado_id_param);
    end loop;

    update ventas set subtotal = total_venta, total = total_venta where venta_id = new_venta_id;

    insert into pagos (venta_id, metodo_pago_id, monto)
    values (new_venta_id, metodo_pago_id_param, total_venta);

    -- Crédito Tienda: registrar el CARGO con validación de límite.
    select nombre ilike 'crédito tienda' into es_credito
    from metodospago where metodo_pago_id = metodo_pago_id_param;

    if coalesce(es_credito, false) then
        select permite_credito, limite_credito into cli
        from clientes where cliente_id = cliente_id_param;
        if not coalesce(cli.permite_credito, false) then
            raise exception 'El cliente seleccionado no tiene crédito habilitado.';
        end if;

        select saldo_nuevo into saldo_ant
        from movimientoscuentacliente
        where cliente_id = cliente_id_param
        order by fecha_hora desc, movimiento_cuenta_id desc
        limit 1;
        saldo_ant := coalesce(saldo_ant, 0);

        if cli.limite_credito is not null and cli.limite_credito > 0
           and saldo_ant + total_venta > cli.limite_credito then
            raise exception 'La venta excede el límite de crédito del cliente (saldo: %, límite: %).',
                saldo_ant, cli.limite_credito;
        end if;

        insert into movimientoscuentacliente (cliente_id, tipo_movimiento, monto, empleado_id,
                                              saldo_anterior, saldo_nuevo,
                                              referencia_id, referencia_tabla, notas)
        values (cliente_id_param, 'CARGO', total_venta, empleado_id_param,
                saldo_ant, saldo_ant + total_venta,
                new_venta_id, 'ventas', 'Venta a crédito');
    end if;

    -- Cierra el ticket en la MISMA transacción: adiós tickets fantasma.
    if ticket_id_param is not null then
        update tickets
        set estado = 'COBRADO', venta_id = new_venta_id
        where ticket_id = ticket_id_param and estado = 'ABIERTO';
    end if;

    return new_venta_id;
end;
$function$;
