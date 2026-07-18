-- =====================================================================
-- Migración 005: Gestión de empleados con Auth y autorización por rol
-- =====================================================================
-- - Blinda actualizar/desactivar empleado para que solo un Administrador
--   pueda ejecutarlas.
-- - Elimina las funciones inseguras de creación con contraseña en texto
--   plano (reemplazadas por crear_empleado_con_auth).
-- =====================================================================

BEGIN;

-- Actualizar empleado: solo Administrador
CREATE OR REPLACE FUNCTION public.actualizar_empleado_directo(
  empleado_id_param integer,
  nombre_completo_param character varying,
  usuario_param character varying,
  rol_id_param integer,
  fecha_contratacion_param date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
begin
    perform public.exigir_admin();
    update public.empleados
    set
        nombre_completo = nombre_completo_param,
        usuario = usuario_param,
        rol_id = rol_id_param,
        fecha_contratacion = fecha_contratacion_param
    where
        empleado_id = empleado_id_param;
end;
$function$;

-- Desactivar empleado (soft delete): solo Administrador
CREATE OR REPLACE FUNCTION public.desactivar_empleado_directo(empleado_id_param integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
begin
    perform public.exigir_admin();
    -- "soft delete" para no perder el historial de ventas
    update public.empleados
    set activo = false
    where empleado_id = empleado_id_param;
end;
$function$;

-- Eliminar las funciones inseguras de creación con contraseña en texto plano
DROP FUNCTION IF EXISTS public.crear_empleado_directo(character varying, character varying, character varying, integer);
DROP FUNCTION IF EXISTS public.crear_empleado_directo(character varying, character varying, character varying, integer, date);

COMMIT;
