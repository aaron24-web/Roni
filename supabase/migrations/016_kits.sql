-- 016: Paquetes (KIT) virtuales.
--
-- Hasta ahora el tipo de producto KIT era DECORATIVO: la etiqueta existía en
-- el desplegable pero no había ni tabla de componentes ni lógica, así que un
-- paquete se vendía como un producto normal y NO descontaba su contenido.
--
-- Modelo elegido: **paquete virtual**. El paquete no se arma físicamente ni
-- tiene existencias propias; al venderlo se descuentan sus componentes. Su
-- "stock" es un cálculo: cuántos se pueden armar con lo que hay.
--
-- Reglas:
--   - Un paquete NO puede contener otro paquete (sin recursión).
--   - El precio del paquete es el suyo propio; el costo se calcula sumando
--     el de sus componentes, para que el margen de los reportes sea real.
--   - Dentro de un paquete se IGNORAN las promociones de los componentes:
--     si no, el descuento se aplicaría dos veces. Solo cuenta la del paquete.
--   - Un renglón de venta = un paquete (no se explota en `detalleventa`), pero
--     el inventario registra un movimiento POR COMPONENTE.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Contenido de los paquetes
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.kit_componentes (
    kit_producto_id        integer NOT NULL REFERENCES public.productos(producto_id) ON DELETE CASCADE,
    componente_producto_id integer NOT NULL REFERENCES public.productos(producto_id),
    cantidad               numeric NOT NULL CHECK (cantidad > 0),
    PRIMARY KEY (kit_producto_id, componente_producto_id),
    CONSTRAINT chk_kit_no_se_contiene CHECK (kit_producto_id <> componente_producto_id)
);

COMMENT ON TABLE public.kit_componentes IS
    'Contenido de un paquete virtual. Un componente aparece UNA vez: para dos libretas, cantidad = 2.';

CREATE INDEX IF NOT EXISTS idx_kit_componentes_componente
    ON public.kit_componentes(componente_producto_id);

-- Un componente no puede ser a su vez un paquete. No cabe en un CHECK porque
-- hay que consultar otra tabla.
CREATE OR REPLACE FUNCTION public.validar_componente_kit()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
declare
    tipo_kit text;
    tipo_componente text;
begin
    select tipo_producto into tipo_kit
    from public.productos where producto_id = new.kit_producto_id;
    if tipo_kit is distinct from 'KIT' then
        raise exception 'El producto % no es un paquete.', new.kit_producto_id;
    end if;

    select tipo_producto into tipo_componente
    from public.productos where producto_id = new.componente_producto_id;
    if tipo_componente = 'KIT' then
        raise exception 'Un paquete no puede contener otro paquete.';
    end if;

    return new;
end;
$function$;

DROP TRIGGER IF EXISTS trg_validar_componente_kit ON public.kit_componentes;
CREATE TRIGGER trg_validar_componente_kit
    BEFORE INSERT OR UPDATE ON public.kit_componentes
    FOR EACH ROW EXECUTE FUNCTION public.validar_componente_kit();

-- Mismo criterio que el resto del catálogo: todos leen, solo admin escribe.
ALTER TABLE public.kit_componentes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_select_all ON public.kit_componentes;
DROP POLICY IF EXISTS p_admin_write ON public.kit_componentes;
CREATE POLICY p_select_all ON public.kit_componentes FOR SELECT TO authenticated USING (true);
CREATE POLICY p_admin_write ON public.kit_componentes FOR ALL TO authenticated
  USING (public.mi_rol() = 'Administrador') WITH CHECK (public.mi_rol() = 'Administrador');

-- Vista para la interfaz: el contenido con precio y existencias resueltos.
-- `security_invoker` para que respete las políticas de quien consulta.
DROP VIEW IF EXISTS public.vista_kit_componentes;
CREATE VIEW public.vista_kit_componentes
WITH (security_invoker = true) AS
SELECT kc.kit_producto_id,
       kc.componente_producto_id,
       kc.cantidad,
       p.descripcion,
       p.precio_venta,
       p.precio_costo,
       p.tipo_producto,
       COALESCE(i.cantidad_actual, 0) AS stock_componente
FROM public.kit_componentes kc
JOIN public.productos p ON p.producto_id = kc.componente_producto_id
LEFT JOIN public.inventario i ON i.producto_id = kc.componente_producto_id AND i.almacen_id = 1;

-- ---------------------------------------------------------------------------
-- 2. Alta y edición de productos con su contenido, en UNA transacción
-- ---------------------------------------------------------------------------
-- Se eliminan las firmas anteriores (mismo criterio que la migración 012): un
-- único punto de entrada evita que quede un paquete creado y vacío.

DROP FUNCTION IF EXISTS public.crear_producto_con_promo(text, text, numeric, numeric, integer, text, numeric, numeric, integer);
DROP FUNCTION IF EXISTS public.actualizar_producto_con_promo(integer, text, text, numeric, numeric, integer, text, numeric, integer);

-- Guarda el contenido de un paquete y devuelve el costo sumado de sus piezas.
CREATE OR REPLACE FUNCTION public.aplicar_componentes_kit(
    p_producto_id integer,
    p_tipo_producto text,
    p_componentes jsonb
) RETURNS numeric
LANGUAGE plpgsql
AS $function$
declare
    comp record;
    costo_total numeric := 0;
begin
    -- Si deja de ser un paquete, su contenido se va con él.
    if coalesce(p_tipo_producto, 'UNITARIO') <> 'KIT' then
        delete from public.kit_componentes where kit_producto_id = p_producto_id;
        return null;
    end if;

    if p_componentes is null or jsonb_typeof(p_componentes) <> 'array'
       or jsonb_array_length(p_componentes) = 0 then
        raise exception 'Un paquete necesita al menos un producto en su contenido.';
    end if;

    delete from public.kit_componentes where kit_producto_id = p_producto_id;

    for comp in
        select (e->>'producto_id')::int as producto_id,
               (e->>'cantidad')::numeric as cantidad
        from jsonb_array_elements(p_componentes) e
    loop
        if comp.producto_id is null or comp.cantidad is null or comp.cantidad <= 0 then
            raise exception 'Contenido inválido del paquete (producto %, cantidad %).',
                comp.producto_id, comp.cantidad;
        end if;

        insert into public.kit_componentes (kit_producto_id, componente_producto_id, cantidad)
        values (p_producto_id, comp.producto_id, comp.cantidad);

        costo_total := costo_total
            + comp.cantidad * (select coalesce(precio_costo, 0)
                               from public.productos where producto_id = comp.producto_id);
    end loop;

    return round(costo_total, 2);
end;
$function$;

CREATE OR REPLACE FUNCTION public.crear_producto_con_promo(
    descripcion_param text,
    codigo_barras_param text,
    precio_costo_param numeric,
    precio_venta_param numeric,
    departamento_id_param integer,
    tipo_producto_param text,
    cantidad_actual_param numeric,
    stock_minimo_param numeric,
    promocion_id_param integer,
    componentes_param jsonb DEFAULT NULL   -- [{"producto_id": int, "cantidad": num}]
) RETURNS void
LANGUAGE plpgsql
AS $function$
declare
    nuevo_producto_id int;
    costo_kit numeric;
begin
    perform public.exigir_admin();

    insert into productos (descripcion, codigo_barras, precio_costo, precio_venta,
                           departamento_id, tipo_producto, promocion_id)
    values (descripcion_param, codigo_barras_param, precio_costo_param, precio_venta_param,
            departamento_id_param, tipo_producto_param, promocion_id_param)
    returning producto_id into nuevo_producto_id;

    costo_kit := public.aplicar_componentes_kit(nuevo_producto_id, tipo_producto_param, componentes_param);
    if costo_kit is not null then
        update productos set precio_costo = costo_kit where producto_id = nuevo_producto_id;
    end if;

    -- Ni los paquetes ni los servicios llevan existencias propias.
    if coalesce(tipo_producto_param, 'UNITARIO') not in ('KIT', 'SERVICIO') then
        insert into inventario (producto_id, almacen_id, cantidad_actual, stock_minimo)
        values (nuevo_producto_id, 1, cantidad_actual_param, stock_minimo_param);
    end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.actualizar_producto_con_promo(
    producto_id_param integer,
    descripcion_param text,
    codigo_barras_param text,
    precio_costo_param numeric,
    precio_venta_param numeric,
    departamento_id_param integer,
    tipo_producto_param text,
    stock_minimo_param numeric,
    promocion_id_param integer,
    componentes_param jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
AS $function$
declare
    costo_kit numeric;
begin
    perform public.exigir_admin();

    update productos
    set descripcion     = descripcion_param,
        codigo_barras   = codigo_barras_param,
        precio_costo    = precio_costo_param,
        precio_venta    = precio_venta_param,
        departamento_id = departamento_id_param,
        tipo_producto   = tipo_producto_param,
        promocion_id    = promocion_id_param
    where producto_id = producto_id_param;

    costo_kit := public.aplicar_componentes_kit(producto_id_param, tipo_producto_param, componentes_param);
    if costo_kit is not null then
        update productos set precio_costo = costo_kit where producto_id = producto_id_param;
    end if;

    if coalesce(tipo_producto_param, 'UNITARIO') not in ('KIT', 'SERVICIO') then
        -- Si pasó a controlar existencias y no tenía fila, se le crea en cero:
        -- sin ella la venta fallaría con "stock insuficiente".
        insert into inventario (producto_id, almacen_id, cantidad_actual, stock_minimo)
        values (producto_id_param, 1, 0, stock_minimo_param)
        on conflict (producto_id, almacen_id) do update set stock_minimo = excluded.stock_minimo;
    end if;
end;
$function$;

-- ---------------------------------------------------------------------------
-- 3. Un paquete no se surte: se surten sus componentes
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.registrar_entrada_stock(
    producto_id_param integer,
    cantidad_param numeric,
    empleado_id_param integer
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
declare
    tipo_movimiento_entrada_id int;
    prod record;
begin
    select descripcion, tipo_producto into prod
    from productos where producto_id = producto_id_param;
    if not found then
        raise exception 'El producto % no existe.', producto_id_param;
    end if;

    if prod.tipo_producto = 'KIT' then
        raise exception 'Un paquete no se surte: da entrada a sus componentes por separado.';
    end if;
    if prod.tipo_producto = 'SERVICIO' then
        raise exception 'Un servicio no lleva existencias.';
    end if;

    select tipo_movimiento_id into tipo_movimiento_entrada_id
    from tiposmovimientoinventario
    where lower(nombre) like '%compra%' and lower(nombre) like '%proveedor%'
    limit 1;

    if tipo_movimiento_entrada_id is null then
        raise exception 'No se encontró un tipo de movimiento para COMPRA A PROVEEDOR. Verifica que exista en la tabla tiposmovimientoinventario.';
    end if;

    update inventario
    set cantidad_actual = cantidad_actual + cantidad_param
    where producto_id = producto_id_param and almacen_id = 1;

    insert into movimientosinventario(producto_id, almacen_id, tipo_movimiento_id,
                                      cantidad, empleado_id, notas)
    values (producto_id_param, 1, tipo_movimiento_entrada_id, cantidad_param,
            empleado_id_param, 'Entrada de stock desde el sistema');
end;
$function$;

-- ---------------------------------------------------------------------------
-- 4. Venta: al cobrar un paquete se descuentan sus componentes
-- ---------------------------------------------------------------------------
-- Copia de la versión de la migración 015 con la explosión de paquetes.

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
    req record;
    -- %rowtype y no `record`: a un record sin asignar no se le pueden leer
    -- campos (falla con productos sin promoción); al rowtype sí (quedan null).
    promo promociones%rowtype;
    tipo_movimiento_salida_id int;
    stock_disponible numeric;
    controla_stock boolean;
    es_paquete boolean;
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
        select p.producto_id, p.descripcion, p.precio_venta, p.promocion_id,
               p.departamento_id, p.tipo_producto
        into prod
        from productos p
        where p.producto_id = item.producto_id;
        if not found then
            raise exception 'El producto % no existe.', item.producto_id;
        end if;

        es_paquete := prod.tipo_producto = 'KIT';
        -- Un servicio no tiene existencias; un paquete descuenta las de su contenido.
        controla_stock := coalesce(prod.tipo_producto, 'UNITARIO') <> 'SERVICIO' and not es_paquete;

        if es_paquete then
            if not exists (select 1 from kit_componentes where kit_producto_id = prod.producto_id) then
                raise exception 'El paquete "%" no tiene contenido definido.', prod.descripcion;
            end if;

            -- Primera pasada: validar TODO el contenido antes de tocar nada, para
            -- poder decir qué componente falta. (La transacción ya garantiza el
            -- todo-o-nada; esto es por el mensaje de error.)
            -- El orden por producto_id hace determinista el bloqueo y evita
            -- interbloqueos entre dos cajas que vendan paquetes con piezas comunes.
            for req in
                select kc.componente_producto_id as pid,
                       kc.cantidad * item.cantidad as necesario,
                       pc.descripcion as descripcion,
                       pc.tipo_producto as tipo
                from kit_componentes kc
                join productos pc on pc.producto_id = kc.componente_producto_id
                where kc.kit_producto_id = prod.producto_id
                order by kc.componente_producto_id
            loop
                if req.tipo <> 'SERVICIO' then
                    select cantidad_actual into stock_disponible
                    from inventario
                    where producto_id = req.pid and almacen_id = 1
                    for update;
                    if stock_disponible is null or stock_disponible < req.necesario then
                        raise exception 'No hay suficiente "%" para el paquete "%". Disponible: %, se necesitan: %',
                            req.descripcion, prod.descripcion,
                            coalesce(stock_disponible, 0), req.necesario;
                    end if;
                end if;
            end loop;
        elsif controla_stock then
            -- Bloquea el renglón de inventario para evitar carreras entre cajas.
            select cantidad_actual into stock_disponible
            from inventario
            where producto_id = item.producto_id and almacen_id = 1
            for update;
            if stock_disponible is null or stock_disponible < item.cantidad then
                raise exception 'Stock insuficiente para "%". Disponible: %, solicitado: %',
                    prod.descripcion, coalesce(stock_disponible, 0), item.cantidad;
            end if;
        end if;

        importe_linea := item.cantidad * prod.precio_venta;
        descuento_linea := 0;
        promo := null;

        -- Resolución de promoción (reloj del SERVIDOR):
        -- 1º la del producto; si no tiene, la de su departamento.
        -- Dentro de un paquete NO se miran las promociones de los componentes:
        -- el descuento ya está en el precio del paquete y se aplicaría dos veces.
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

        -- Un renglón por paquete: el ticket dice "Paquete escolar", no sus piezas.
        insert into detalleventa (venta_id, producto_id, cantidad,
                                  precio_unitario_registrado, descuento_aplicado,
                                  impuesto_aplicado, importe_total,
                                  descripcion_registrada, promocion_id)
        values (new_venta_id, item.producto_id, item.cantidad,
                prod.precio_venta, descuento_linea,
                0, importe_linea,
                prod.descripcion, promo.promocion_id);

        if es_paquete then
            -- Segunda pasada: descontar. El inventario sí registra el detalle,
            -- un movimiento por componente, para que la auditoría sea exacta.
            for req in
                select kc.componente_producto_id as pid,
                       kc.cantidad * item.cantidad as necesario,
                       pc.tipo_producto as tipo
                from kit_componentes kc
                join productos pc on pc.producto_id = kc.componente_producto_id
                where kc.kit_producto_id = prod.producto_id
                order by kc.componente_producto_id
            loop
                if req.tipo <> 'SERVICIO' then
                    update inventario
                    set cantidad_actual = cantidad_actual - req.necesario
                    where producto_id = req.pid and almacen_id = 1;

                    insert into movimientosinventario (producto_id, almacen_id, tipo_movimiento_id,
                                                       cantidad, referencia_id, referencia_tabla, empleado_id)
                    values (req.pid, 1, tipo_movimiento_salida_id,
                            req.necesario, new_venta_id, 'ventas', empleado_id_param);
                end if;
            end loop;
        elsif controla_stock then
            update inventario
            set cantidad_actual = cantidad_actual - item.cantidad
            where producto_id = item.producto_id and almacen_id = 1;

            insert into movimientosinventario (producto_id, almacen_id, tipo_movimiento_id,
                                               cantidad, referencia_id, referencia_tabla, empleado_id)
            values (item.producto_id, 1, tipo_movimiento_salida_id,
                    item.cantidad, new_venta_id, 'ventas', empleado_id_param);
        end if;
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

-- ---------------------------------------------------------------------------
-- 5. Cancelación: devolver lo que de verdad salió del almacén
-- ---------------------------------------------------------------------------
-- Antes recorría detalleventa y sumaba al `producto_id` del renglón. Con un
-- paquete —que no tiene fila en `inventario`— ese UPDATE afectaba a CERO filas
-- SIN dar error: los componentes nunca volvían. Con un servicio inventaba un
-- movimiento de devolución que no correspondía a nada.

CREATE OR REPLACE FUNCTION public.cancelar_venta_completa(args jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
declare
    venta_id_param int;
    supervisor_id_param int;
    motivo_param text;
    detalle record;
    comp record;
    venta_info record;
    tipo_producto_detalle text;
    tipo_movimiento_entrada_id int;
begin
    perform public.exigir_admin();

    venta_id_param := (args->>'venta_id_param')::int;
    supervisor_id_param := (args->>'supervisor_id_param')::int;
    motivo_param := args->>'motivo_param';

    select * into venta_info from ventas where venta_id = venta_id_param;

    update ventas set estado = 'CANCELADA' where venta_id = venta_id_param;

    select tipo_movimiento_id into tipo_movimiento_entrada_id
    from tiposmovimientoinventario where lower(nombre) = 'devolucion_cliente' limit 1;

    if tipo_movimiento_entrada_id is null then
        insert into tiposmovimientoinventario (nombre, efecto)
        values ('Devolucion_Cliente', 'ENTRADA')
        returning tipo_movimiento_id into tipo_movimiento_entrada_id;
    end if;

    for detalle in select * from detalleventa where venta_id = venta_id_param
    loop
        select tipo_producto into tipo_producto_detalle
        from productos where producto_id = detalle.producto_id;

        if tipo_producto_detalle = 'KIT' then
            -- Devuelve el contenido, que es lo que salió del almacén.
            for comp in
                select kc.componente_producto_id as pid,
                       kc.cantidad * detalle.cantidad as devolver,
                       pc.tipo_producto as tipo
                from kit_componentes kc
                join productos pc on pc.producto_id = kc.componente_producto_id
                where kc.kit_producto_id = detalle.producto_id
                order by kc.componente_producto_id
            loop
                if comp.tipo <> 'SERVICIO' then
                    update inventario
                    set cantidad_actual = cantidad_actual + comp.devolver
                    where producto_id = comp.pid and almacen_id = 1;

                    insert into movimientosinventario(producto_id, almacen_id, tipo_movimiento_id,
                                                      cantidad, referencia_id, referencia_tabla, empleado_id)
                    values (comp.pid, 1, tipo_movimiento_entrada_id, comp.devolver,
                            venta_id_param, 'ventas_canceladas', supervisor_id_param);
                end if;
            end loop;
        elsif coalesce(tipo_producto_detalle, 'UNITARIO') <> 'SERVICIO' then
            update inventario
            set cantidad_actual = cantidad_actual + detalle.cantidad
            where producto_id = detalle.producto_id and almacen_id = 1;

            insert into movimientosinventario(producto_id, almacen_id, tipo_movimiento_id,
                                              cantidad, referencia_id, referencia_tabla, empleado_id)
            values (detalle.producto_id, 1, tipo_movimiento_entrada_id, detalle.cantidad,
                    venta_id_param, 'ventas_canceladas', supervisor_id_param);
        end if;

        -- La autorización se registra por renglón vendido: el paquete, no sus piezas.
        insert into cancelacionesautorizadas (venta_id, producto_id, cantidad_cancelada,
                                              importe_cancelado, cajero_id, supervisor_id, motivo)
        values (venta_id_param, detalle.producto_id, detalle.cantidad, detalle.importe_total,
                venta_info.empleado_id, supervisor_id_param, motivo_param);
    end loop;
end;
$function$;

COMMIT;
