-- =====================================================================
-- Migración 010: Aprobación de supervisor contra Supabase Auth
-- =====================================================================
-- Problema: `verificar_supervisor` comparaba `empleados.contrasena_hash`,
-- la contraseña en texto plano del sistema anterior. Tras migrar a Supabase
-- Auth esa columna quedó vacía para todos los empleados, por lo que ningún
-- supervisor podía aprobar nada (un cajero no podía quitar productos del
-- ticket).
--
-- Solución: verificar el correo y la contraseña contra `auth.users`,
-- comparando el hash bcrypt real. No se toca la sesión del cajero.
--
-- Además se corrige un problema de seguridad heredado: la función anterior
-- podía ser ejecutada por el rol `anon`, es decir, sin iniciar sesión, lo
-- que permitía intentar fuerza bruta contra las credenciales. La nueva solo
-- es ejecutable por usuarios autenticados.
-- =====================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.verificar_supervisor_auth(
    p_email    text,
    p_password text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_supervisor_id integer;
BEGIN
    -- Devuelve el empleado_id del supervisor si las credenciales son válidas
    -- y tiene rol Administrador activo; NULL en cualquier otro caso.
    SELECT e.empleado_id INTO v_supervisor_id
    FROM auth.users u
    JOIN public.empleados e ON e.auth_user_id = u.id
    JOIN public.roles r ON r.rol_id = e.rol_id
    WHERE lower(u.email) = lower(trim(p_email))
      -- crypt() vuelve a cifrar la contraseña con el salt almacenado y
      -- compara: así se valida contra el bcrypt real de Supabase Auth.
      AND u.encrypted_password = extensions.crypt(p_password, u.encrypted_password)
      AND lower(r.nombre_rol) = 'administrador'
      AND e.activo = true;

    RETURN v_supervisor_id;
END;
$$;

-- Solo quien ya inició sesión puede pedir una aprobación.
REVOKE EXECUTE ON FUNCTION public.verificar_supervisor_auth(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.verificar_supervisor_auth(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.verificar_supervisor_auth(text, text) TO authenticated;

-- Retirar la función insegura basada en contraseñas en texto plano.
DROP FUNCTION IF EXISTS public.verificar_supervisor(text, text);

COMMIT;
