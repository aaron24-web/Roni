-- =====================================================================
-- Migración 002: Row Level Security (RLS)
-- =====================================================================
-- Cierra el hueco crítico: hoy cualquiera con la anon key (que va pública
-- en el frontend) puede leer/escribir TODA la base de datos sin iniciar
-- sesión. Con RLS, solo usuarios AUTENTICADOS (rol `authenticated`, es decir
-- con sesión de Supabase Auth) pueden acceder a los datos.
--
-- Las funciones RPC de negocio son SECURITY DEFINER (corren como owner) y
-- por lo tanto siguen funcionando sin verse afectadas por RLS.
--
-- Nota: esta es la línea base (todo usuario autenticado tiene acceso). La
-- restricción granular por rol (cajero vs administrador) se hará en una
-- migración posterior validando el rol dentro de cada función sensible.
-- =====================================================================

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
    EXECUTE format('DROP POLICY IF EXISTS p_authenticated_all ON public.%I;', r.tablename);
    EXECUTE format(
      'CREATE POLICY p_authenticated_all ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);',
      r.tablename
    );
  END LOOP;
END $$;

-- Quitar el backdoor de login inseguro (comparaba contraseñas en texto plano
-- y devolvía perfiles sin autenticación). Ya reemplazado por Supabase Auth.
DROP FUNCTION IF EXISTS public.iniciar_sesion_directo(character varying, character varying);
DROP FUNCTION IF EXISTS public.iniciar_sesion_directo(text, text);
