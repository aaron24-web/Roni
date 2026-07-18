-- =====================================================================
-- Migración 004: Autorización por rol (base)
-- =====================================================================
-- Hasta ahora cualquier usuario autenticado podía llamar cualquier función.
-- Esta migración agrega la infraestructura para exigir rol de Administrador
-- del lado del servidor, y la aplica a la creación de empleados.
--
-- La restricción del resto de funciones sensibles (según la matriz de roles
-- del negocio) se hará en una migración posterior.
-- =====================================================================

BEGIN;

-- Rol del usuario de la sesión actual (por auth.uid()). SECURITY DEFINER
-- para poder leer empleados aunque RLS esté activo.
CREATE OR REPLACE FUNCTION public.mi_rol()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT r.nombre_rol
  FROM public.empleados e
  JOIN public.roles r ON r.rol_id = e.rol_id
  WHERE e.auth_user_id = auth.uid()
    AND e.activo = true
  LIMIT 1;
$$;

-- Lanza excepción si el usuario actual no es Administrador.
-- Nota: cuando se llama desde una sesión de backend sin JWT (psql como
-- superusuario) auth.uid() es NULL; en ese caso se permite, para poder
-- hacer seeding/migraciones administrativas.
CREATE OR REPLACE FUNCTION public.exigir_admin()
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN; -- contexto de backend/superusuario (no PostgREST)
  END IF;
  IF public.mi_rol() IS DISTINCT FROM 'Administrador' THEN
    RAISE EXCEPTION 'Acceso denegado: se requiere rol Administrador'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

-- Solo un administrador puede crear empleados/usuarios.
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
  PERFORM public.exigir_admin();

  IF p_email IS NULL OR p_password IS NULL OR length(p_password) < 6 THEN
    RAISE EXCEPTION 'Email requerido y contraseña de al menos 6 caracteres';
  END IF;

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

  INSERT INTO auth.identities (
    id, provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_user_id::text, v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', lower(p_email)),
    'email', now(), now(), now()
  );

  INSERT INTO public.empleados (
    nombre_completo, usuario, email, rol_id, fecha_contratacion, activo, auth_user_id
  ) VALUES (
    p_nombre, v_usuario, lower(p_email), p_rol_id, p_fecha_contratacion, true, v_user_id
  )
  RETURNING empleado_id INTO v_empleado_id;

  RETURN v_empleado_id;
END;
$$;

COMMIT;
