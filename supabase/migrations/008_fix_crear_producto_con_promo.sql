-- =====================================================================
-- Migración 008: Corregir crear_producto_con_promo
-- =====================================================================
-- Bug: la función insertaba en `inventario` sin `almacen_id` (columna
-- NOT NULL), por lo que crear un producto siempre fallaba (23502).
-- Se agrega almacen_id = 1 (Tienda Principal), igual que crear_producto.
-- Se conserva el guard exigir_admin().
-- =====================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.crear_producto_con_promo(
  descripcion_param text,
  codigo_barras_param text,
  precio_costo_param numeric,
  precio_venta_param numeric,
  departamento_id_param integer,
  tipo_producto_param text,
  cantidad_actual_param numeric,
  stock_minimo_param numeric,
  promocion_id_param integer
)
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

    INSERT INTO inventario (producto_id, almacen_id, cantidad_actual, stock_minimo)
    VALUES (nuevo_producto_id, 1, cantidad_actual_param, stock_minimo_param);
END;
$function$;

COMMIT;
