-- =====================================================================
-- Migración 006: Matriz de roles completa
-- =====================================================================
-- Admin-only (guard exigir_admin en funciones):
--   crear_producto (todas las sobrecargas), actualizar_producto (todas),
--   cancelar_venta_completa, obtener_historial_cortes,
--   obtener_ventas_por_corte, obtener_ventas_por_depto.
-- Admin-only (políticas RLS de escritura en tablas de catálogo):
--   departamentos, proveedores, promociones, promocion_reglas.
-- Compartido (sin cambios): ventas, caja (abrir/cerrar/resumen),
--   clientes + abono, registrar_entrada_stock.
-- =====================================================================

BEGIN;

-- public.crear_producto(character varying, character varying, numeric, numeric, integer)
CREATE OR REPLACE FUNCTION public.crear_producto(descripcion_param character varying, codigo_barras_param character varying, precio_costo_param numeric, precio_venta_param numeric, departamento_id_param integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
    new_producto_id int;
begin
    perform public.exigir_admin();
    -- 1. Insertar en la tabla 'productos' y obtener el ID
    insert into public.productos(descripcion, codigo_barras, precio_costo, precio_venta, departamento_id)
    values (descripcion_param, codigo_barras_param, precio_costo_param, precio_venta_param, departamento_id_param)
    returning producto_id into new_producto_id;

    -- 2. Inicializar el stock para ese nuevo producto en el almacén principal (ID 1)
    insert into public.inventario(producto_id, almacen_id, cantidad_actual, stock_minimo)
    values (new_producto_id, 1, 0, 0);

    -- 3. Devolver el ID del producto creado
    return new_producto_id;
end;
$function$;

-- public.crear_producto(character varying, character varying, numeric, numeric, integer, character varying)
CREATE OR REPLACE FUNCTION public.crear_producto(descripcion_param character varying, codigo_barras_param character varying, precio_costo_param numeric, precio_venta_param numeric, departamento_id_param integer, tipo_producto_param character varying)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
    new_producto_id int;
begin
    perform public.exigir_admin();
    -- Añadimos la nueva columna al INSERT
    insert into public.productos(descripcion, codigo_barras, precio_costo, precio_venta, departamento_id, tipo_producto)
    values (descripcion_param, codigo_barras_param, precio_costo_param, precio_venta_param, departamento_id_param, tipo_producto_param)
    returning producto_id into new_producto_id;

    insert into public.inventario(producto_id, almacen_id, cantidad_actual, stock_minimo)
    values (new_producto_id, 1, 0, 0);

    return new_producto_id;
end;
$function$;

-- public.crear_producto(character varying, character varying, numeric, numeric, integer, character varying, numeric, numeric)
CREATE OR REPLACE FUNCTION public.crear_producto(descripcion_param character varying, codigo_barras_param character varying, precio_costo_param numeric, precio_venta_param numeric, departamento_id_param integer, tipo_producto_param character varying, cantidad_actual_param numeric, stock_minimo_param numeric)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
    new_producto_id int;
begin
    perform public.exigir_admin();
    insert into public.productos(descripcion, codigo_barras, precio_costo, precio_venta, departamento_id, tipo_producto)
    values (descripcion_param, codigo_barras_param, precio_costo_param, precio_venta_param, departamento_id_param, tipo_producto_param)
    returning producto_id into new_producto_id;

    -- Usamos los nuevos parámetros para inicializar el inventario
    insert into public.inventario(producto_id, almacen_id, cantidad_actual, stock_minimo)
    values (new_producto_id, 1, cantidad_actual_param, stock_minimo_param);

    return new_producto_id;
end;
$function$;

-- public.actualizar_producto(integer, character varying, character varying, numeric, numeric, integer)
CREATE OR REPLACE FUNCTION public.actualizar_producto(producto_id_param integer, descripcion_param character varying, codigo_barras_param character varying, precio_costo_param numeric, precio_venta_param numeric, departamento_id_param integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
    perform public.exigir_admin();
    update public.productos
    set
        descripcion = descripcion_param,
        codigo_barras = codigo_barras_param,
        precio_costo = precio_costo_param,
        precio_venta = precio_venta_param,
        departamento_id = departamento_id_param
    where
        producto_id = producto_id_param;
end;
$function$;

-- public.actualizar_producto(integer, character varying, character varying, numeric, numeric, integer, character varying)
CREATE OR REPLACE FUNCTION public.actualizar_producto(producto_id_param integer, descripcion_param character varying, codigo_barras_param character varying, precio_costo_param numeric, precio_venta_param numeric, departamento_id_param integer, tipo_producto_param character varying)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
    perform public.exigir_admin();
    update public.productos
    set
        descripcion = descripcion_param,
        codigo_barras = codigo_barras_param,
        precio_costo = precio_costo_param,
        precio_venta = precio_venta_param,
        departamento_id = departamento_id_param,
        tipo_producto = tipo_producto_param -- NUEVA LÍNEA
    where
        producto_id = producto_id_param;
end;
$function$;

-- public.actualizar_producto(integer, character varying, character varying, numeric, numeric, integer, character varying, numeric, numeric)
CREATE OR REPLACE FUNCTION public.actualizar_producto(producto_id_param integer, descripcion_param character varying, codigo_barras_param character varying, precio_costo_param numeric, precio_venta_param numeric, departamento_id_param integer, tipo_producto_param character varying, cantidad_actual_param numeric, stock_minimo_param numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
    perform public.exigir_admin();
    -- Primero, actualizamos la tabla de productos
    update public.productos
    set
        descripcion = descripcion_param,
        codigo_barras = codigo_barras_param,
        precio_costo = precio_costo_param,
        precio_venta = precio_venta_param,
        departamento_id = departamento_id_param,
        tipo_producto = tipo_producto_param
    where
        producto_id = producto_id_param;

    -- Segundo, actualizamos la tabla de inventario
    update public.inventario
    set
        cantidad_actual = cantidad_actual_param,
        stock_minimo = stock_minimo_param
    where
        producto_id = producto_id_param and almacen_id = 1; -- Asumimos almacén 1
end;
$function$;

-- public.cancelar_venta_completa(jsonb)
CREATE OR REPLACE FUNCTION public.cancelar_venta_completa(args jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
    venta_id_param int;
    supervisor_id_param int;
    motivo_param text;
    detalle record;
    venta_info record;
    tipo_movimiento_entrada_id int;
begin
    perform public.exigir_admin();
    -- Extraemos los valores del objeto JSON
    venta_id_param := (args->>'venta_id_param')::int;
    supervisor_id_param := (args->>'supervisor_id_param')::int;
    motivo_param := args->>'motivo_param';

    -- 1. Obtener información de la venta original
    select * into venta_info from public.ventas where venta_id = venta_id_param;

    -- 2. Actualizar el estado de la venta a 'CANCELADA'
    update public.ventas set estado = 'CANCELADA' where venta_id = venta_id_param;

    -- 3. Obtener el ID del tipo de movimiento para la devolución
    select tipo_movimiento_id into tipo_movimiento_entrada_id
    from public.tiposmovimientoinventario where lower(nombre) = 'devolucion_cliente' limit 1;

    if tipo_movimiento_entrada_id is null then
        insert into public.tiposmovimientoinventario (nombre, efecto)
        values ('Devolucion_Cliente', 'ENTRADA')
        returning tipo_movimiento_id into tipo_movimiento_entrada_id;
    end if;

    -- 4. Revertir el inventario por cada producto en el detalle de la venta
    for detalle in select * from public.detalleventa where venta_id = venta_id_param
    loop
        update public.inventario
        set cantidad_actual = cantidad_actual + detalle.cantidad
        where producto_id = detalle.producto_id and almacen_id = 1;

        insert into public.movimientosinventario(producto_id, almacen_id, tipo_movimiento_id, cantidad, referencia_id, referencia_tabla, empleado_id)
        values (detalle.producto_id, 1, tipo_movimiento_entrada_id, detalle.cantidad, venta_id_param, 'ventas_canceladas', supervisor_id_param);

        insert into public.cancelacionesautorizadas (venta_id, producto_id, cantidad_cancelada, importe_cancelado, cajero_id, supervisor_id, motivo)
        values (venta_id_param, detalle.producto_id, detalle.cantidad, detalle.importe_total, venta_info.empleado_id, supervisor_id_param, motivo_param);
    end loop;
end;
$function$;

-- public.obtener_historial_cortes()
CREATE OR REPLACE FUNCTION public.obtener_historial_cortes()
 RETURNS TABLE(corte_id integer, fecha_apertura timestamp with time zone, fecha_cierre timestamp with time zone, saldo_inicial numeric, saldo_final_real numeric, diferencia numeric, nombre_empleado character varying)
 LANGUAGE plpgsql
AS $function$
begin
    perform public.exigir_admin();
    return query
    select
        c.corte_id,
        c.fecha_hora_apertura as fecha_apertura,
        c.fecha_hora_cierre as fecha_cierre,
        c.saldo_inicial_efectivo as saldo_inicial,
        c.saldo_final_real,
        c.diferencia,
        e.nombre_completo as nombre_empleado
    from
        public.cortescaja as c
    join
        public.empleados as e on c.empleado_id = e.empleado_id
    where
        c.fecha_hora_cierre is not null -- Solo los que ya están cerrados
    order by
        c.fecha_hora_cierre desc;
end;
$function$;

-- public.obtener_ventas_por_corte(integer)
CREATE OR REPLACE FUNCTION public.obtener_ventas_por_corte(corte_id_param integer)
 RETURNS TABLE(venta_id integer, fecha_hora timestamp with time zone, total numeric, nombre_cliente character varying, nombre_empleado character varying)
 LANGUAGE plpgsql
AS $function$
begin
    perform public.exigir_admin();
    return query
    select
        v.venta_id,
        v.fecha_hora,
        v.total,
        c.nombre as nombre_cliente,
        e.nombre_completo as nombre_empleado
    from
        public.ventas v
    join
        public.clientes c on v.cliente_id = c.cliente_id
    join
        public.empleados e on v.empleado_id = e.empleado_id
    where
        v.corte_id = corte_id_param
    order by
        v.fecha_hora asc;
end;
$function$;

-- public.obtener_ventas_por_depto(integer)
CREATE OR REPLACE FUNCTION public.obtener_ventas_por_depto(corte_id_param integer)
 RETURNS TABLE(departamento_nombre character varying, total_vendido numeric)
 LANGUAGE plpgsql
AS $function$
begin
    perform public.exigir_admin();
    return query
    select
        d.nombre as departamento_nombre,
        sum(dv.importe_total) as total_vendido
    from
        public.ventas v
    join
        public.detalleventa dv on v.venta_id = dv.venta_id
    join
        public.productos p on dv.producto_id = p.producto_id
    join
        public.departamentos d on p.departamento_id = d.departamento_id
    where
        v.corte_id = corte_id_param and v.estado = 'COMPLETADA'
    group by
        d.nombre
    order by
        total_vendido desc;
end;
$function$;

-- Políticas RLS de escritura solo-Administrador en tablas de catálogo
DROP POLICY IF EXISTS p_authenticated_all ON public.departamentos;
DROP POLICY IF EXISTS p_select_all ON public.departamentos;
DROP POLICY IF EXISTS p_admin_write ON public.departamentos;
CREATE POLICY p_select_all ON public.departamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY p_admin_write ON public.departamentos FOR ALL TO authenticated
  USING (public.mi_rol() = 'Administrador') WITH CHECK (public.mi_rol() = 'Administrador');

DROP POLICY IF EXISTS p_authenticated_all ON public.proveedores;
DROP POLICY IF EXISTS p_select_all ON public.proveedores;
DROP POLICY IF EXISTS p_admin_write ON public.proveedores;
CREATE POLICY p_select_all ON public.proveedores FOR SELECT TO authenticated USING (true);
CREATE POLICY p_admin_write ON public.proveedores FOR ALL TO authenticated
  USING (public.mi_rol() = 'Administrador') WITH CHECK (public.mi_rol() = 'Administrador');

DROP POLICY IF EXISTS p_authenticated_all ON public.promociones;
DROP POLICY IF EXISTS p_select_all ON public.promociones;
DROP POLICY IF EXISTS p_admin_write ON public.promociones;
CREATE POLICY p_select_all ON public.promociones FOR SELECT TO authenticated USING (true);
CREATE POLICY p_admin_write ON public.promociones FOR ALL TO authenticated
  USING (public.mi_rol() = 'Administrador') WITH CHECK (public.mi_rol() = 'Administrador');

DROP POLICY IF EXISTS p_authenticated_all ON public.promocion_reglas;
DROP POLICY IF EXISTS p_select_all ON public.promocion_reglas;
DROP POLICY IF EXISTS p_admin_write ON public.promocion_reglas;
CREATE POLICY p_select_all ON public.promocion_reglas FOR SELECT TO authenticated USING (true);
CREATE POLICY p_admin_write ON public.promocion_reglas FOR ALL TO authenticated
  USING (public.mi_rol() = 'Administrador') WITH CHECK (public.mi_rol() = 'Administrador');

COMMIT;