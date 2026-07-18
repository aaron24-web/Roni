-- =====================================================================
-- Migración 001: Autenticación profesional con Supabase Auth
-- =====================================================================
-- - Agrega `email` a empleados y lo vincula con auth.users.
-- - Deprecia la contraseña en texto plano (contrasena_hash ya no es
--   obligatoria; las contraseñas viven cifradas en auth.users).
-- - Crea funciones SECURITY DEFINER para crear empleados con su usuario
--   de Auth en una sola transacción y para obtener el perfil de la sesión.
-- Idempotente: se puede correr varias veces sin romper nada.
-- =====================================================================

BEGIN;

-- 1) Columna email en empleados (única, opcional para legados)
ALTER TABLE public.empleados
  ADD COLUMN IF NOT EXISTS email text;

CREATE UNIQUE INDEX IF NOT EXISTS empleados_email_key
  ON public.empleados (lower(email))
  WHERE email IS NOT NULL;

-- 2) La contraseña en texto plano deja de ser obligatoria (Auth la reemplaza)
ALTER TABLE public.empleados
  ALTER COLUMN contrasena_hash DROP NOT NULL;

-- 3) Re-vincular auth_user_id -> auth.users con borrado seguro
--    (ON DELETE SET NULL: borrar un usuario de Auth NO borra al empleado
--     ni su historial de ventas)
ALTER TABLE public.empleados
  DROP CONSTRAINT IF EXISTS empleados_auth_user_id_fkey;
ALTER TABLE public.empleados
  ADD CONSTRAINT empleados_auth_user_id_fkey
  FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4) Función: crea un usuario de Auth (email + password con bcrypt) y su
--    empleado vinculado, en una sola transacción. Reutilizable desde la
--    pantalla de "Empleados".
CREATE OR REPLACE FUNCTION public.crear_empleado_con_auth(
  p_email    text,
  p_password text,
  p_nombre   text,
  p_rol_id   integer,
  p_fecha_contratacion date DEFAULT CURRENT_DATE
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_empleado_id integer;
  v_usuario text := split_part(p_email, '@', 1);
BEGIN
  IF p_email IS NULL OR p_password IS NULL OR length(p_password) < 6 THEN
    RAISE EXCEPTION 'Email requerido y contraseña de al menos 6 caracteres';
  END IF;

  -- Usuario de autenticación (contraseña cifrada con bcrypt, email confirmado)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    is_sso_user, is_anonymous
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
    lower(p_email), extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('nombre_completo', p_nombre),
    '', '', '', '',
    false, false
  );

  -- Identidad de email (requerida por GoTrue para login por contraseña)
  INSERT INTO auth.identities (
    id, provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_user_id::text, v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', lower(p_email)),
    'email', now(), now(), now()
  );

  -- Empleado vinculado
  INSERT INTO public.empleados (
    nombre_completo, usuario, email, rol_id, fecha_contratacion, activo, auth_user_id
  ) VALUES (
    p_nombre, v_usuario, lower(p_email), p_rol_id, p_fecha_contratacion, true, v_user_id
  )
  RETURNING empleado_id INTO v_empleado_id;

  RETURN v_empleado_id;
END;
$$;

-- 5) Función: devuelve el perfil del empleado de la sesión actual (auth.uid()).
--    La usa el frontend después de iniciar sesión.
CREATE OR REPLACE FUNCTION public.get_mi_perfil()
RETURNS TABLE (
  empleado_id integer,
  nombre_completo character varying,
  email text,
  rol_id integer,
  nombre_rol character varying
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT e.empleado_id, e.nombre_completo, e.email, e.rol_id, r.nombre_rol
  FROM public.empleados e
  JOIN public.roles r ON r.rol_id = e.rol_id
  WHERE e.auth_user_id = auth.uid()
    AND e.activo = true;
$$;

COMMIT;
