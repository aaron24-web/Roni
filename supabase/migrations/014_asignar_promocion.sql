-- 014: Asignación de productos a una promoción en bloque.
--
-- Permite, desde la pantalla de Promociones, marcar con checkboxes qué
-- productos llevan la promo. Semántica de "conjunto": los productos
-- seleccionados quedan con la promoción; a los que la tenían y ya no están
-- en la lista se les quita. Solo Administrador (exigir_admin).

CREATE OR REPLACE FUNCTION public.asignar_promocion_productos(
    p_promocion_id integer,
    p_producto_ids integer[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
begin
    perform exigir_admin();

    if not exists (select 1 from promociones where promocion_id = p_promocion_id) then
        raise exception 'La promoción % no existe.', p_promocion_id;
    end if;

    -- Quitar la promo a los productos que ya no están en la selección.
    update productos
    set promocion_id = null
    where promocion_id = p_promocion_id
      and not (producto_id = any (coalesce(p_producto_ids, '{}')));

    -- Asignarla a los seleccionados (si alguno tenía otra promo, se reemplaza).
    update productos
    set promocion_id = p_promocion_id
    where producto_id = any (coalesce(p_producto_ids, '{}'));
end;
$function$;

REVOKE ALL ON FUNCTION public.asignar_promocion_productos(integer, integer[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.asignar_promocion_productos(integer, integer[]) TO authenticated;
