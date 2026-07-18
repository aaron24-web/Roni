-- =====================================================================
-- Migración 007: Blindar variantes _con_promo (admin-only)
-- =====================================================================
BEGIN;

-- public.crear_producto_con_promo(text, text, numeric, numeric, integer, text, numeric, numeric, integer)
CREATE OR REPLACE FUNCTION public.crear_producto_con_promo(descripcion_param text, codigo_barras_param text, precio_costo_param numeric, precio_venta_param numeric, departamento_id_param integer, tipo_producto_param text, cantidad_actual_param numeric, stock_minimo_param numeric, promocion_id_param integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    nuevo_producto_id INT;
BEGIN
    perform public.exigir_admin();
    INSERT INTO productos (descripcion, codigo_barras, precio_costo, precio_venta, departamento_id, tipo_producto, promocion_id)
    VALUES (descripcion_param, codigo_barras_param, precio_costo_param, precio_venta_param, departamento_id_param, tipo_producto_param, promocion_id_param)
    RETURNING producto_id INTO nuevo_producto_id;

    INSERT INTO inventario (producto_id, cantidad_actual, stock_minimo)
    VALUES (nuevo_producto_id, cantidad_actual_param, stock_minimo_param);
END;
$function$;

-- public.actualizar_producto_con_promo(integer, text, text, numeric, numeric, integer, text, numeric, integer)
CREATE OR REPLACE FUNCTION public.actualizar_producto_con_promo(producto_id_param integer, descripcion_param text, codigo_barras_param text, precio_costo_param numeric, precio_venta_param numeric, departamento_id_param integer, tipo_producto_param text, stock_minimo_param numeric, promocion_id_param integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    perform public.exigir_admin();
    UPDATE productos
    SET 
        descripcion = descripcion_param,
        codigo_barras = codigo_barras_param,
        precio_costo = precio_costo_param,
        precio_venta = precio_venta_param,
        departamento_id = departamento_id_param,
        tipo_producto = tipo_producto_param,
        promocion_id = promocion_id_param
    WHERE producto_id = producto_id_param;

    UPDATE inventario
    SET stock_minimo = stock_minimo_param
    WHERE producto_id = producto_id_param;
END;
$function$;

COMMIT;