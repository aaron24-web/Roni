-- =====================================================================
-- Migración 009: Tickets persistentes y caja por terminal
-- =====================================================================
-- Contexto: el POS se usará en dos computadoras. Antes:
--   * Los tickets (ventas en curso) vivían solo en memoria del navegador
--     y se perdían al recargar o cerrar la página.
--   * abrir_caja bloqueaba si CUALQUIER corte estaba abierto, por lo que
--     solo una computadora podía tener caja abierta.
--
-- Ahora:
--   * Cada computadora se identifica con un `terminal_id` (generado y
--     guardado en su localStorage).
--   * La caja es POR TERMINAL: cada una abre y cuadra la suya.
--   * Los tickets se guardan en la base de datos, asociados a su terminal
--     y a su corte, y sobreviven a recargas o cortes de luz.
-- =====================================================================

BEGIN;

-- 1) Identificación de terminal en los cortes de caja
ALTER TABLE public.cortescaja
  ADD COLUMN IF NOT EXISTS terminal_id text;

-- Evita dos cajas abiertas simultáneas en la misma terminal
CREATE UNIQUE INDEX IF NOT EXISTS cortescaja_una_abierta_por_terminal
  ON public.cortescaja (terminal_id)
  WHERE fecha_hora_cierre IS NULL;

-- 2) Tabla de tickets (ventas en curso / carritos aparcados)
CREATE TABLE IF NOT EXISTS public.tickets (
    ticket_id      serial PRIMARY KEY,
    corte_id       integer NOT NULL REFERENCES public.cortescaja(corte_id),
    empleado_id    integer NOT NULL REFERENCES public.empleados(empleado_id),
    terminal_id    text NOT NULL,
    nombre         text,
    -- El carrito es un borrador: al cobrar se convierte en ventas +
    -- detalleventa (que sí están normalizadas). Por eso jsonb.
    carrito        jsonb NOT NULL DEFAULT '[]'::jsonb,
    estado         text NOT NULL DEFAULT 'ABIERTO'
                   CHECK (estado IN ('ABIERTO', 'COBRADO', 'CANCELADO')),
    venta_id       integer REFERENCES public.ventas(venta_id),
    creado_en      timestamptz NOT NULL DEFAULT now(),
    actualizado_en timestamptz NOT NULL DEFAULT now()
);

-- Búsqueda típica: tickets abiertos de esta terminal en este corte
CREATE INDEX IF NOT EXISTS idx_tickets_abiertos
  ON public.tickets (terminal_id, corte_id)
  WHERE estado = 'ABIERTO';

-- 3) Mantener actualizado_en al día
CREATE OR REPLACE FUNCTION public.tickets_touch_updated()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.actualizado_en = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tickets_touch ON public.tickets;
CREATE TRIGGER trg_tickets_touch
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.tickets_touch_updated();

-- 4) RLS: solo usuarios autenticados (línea base del resto del esquema)
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_authenticated_all ON public.tickets;
CREATE POLICY p_authenticated_all ON public.tickets
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5) abrir_caja ahora es por terminal
DROP FUNCTION IF EXISTS public.abrir_caja(integer, numeric);

CREATE OR REPLACE FUNCTION public.abrir_caja(
    empleado_id_param   integer,
    saldo_inicial_param numeric,
    terminal_id_param   text
)
RETURNS TABLE(
    corte_id               integer,
    fecha_hora_apertura    timestamptz,
    saldo_inicial_efectivo numeric,
    terminal_id            text
)
LANGUAGE plpgsql
AS $function$
begin
    if terminal_id_param is null or length(trim(terminal_id_param)) = 0 then
        raise exception 'Se requiere identificar la terminal para abrir caja.';
    end if;

    -- Antes se bloqueaba si CUALQUIER caja estaba abierta; ahora solo si
    -- esta misma terminal ya tiene una sesión activa.
    if exists (
        select 1 from public.cortescaja c
        where c.fecha_hora_cierre is null
          and c.terminal_id = terminal_id_param
    ) then
        raise exception 'Ya existe una sesión de caja activa en esta terminal.';
    end if;

    return query
    insert into public.cortescaja (empleado_id, fecha_hora_apertura, saldo_inicial_efectivo, terminal_id)
    values (empleado_id_param, now(), saldo_inicial_param, terminal_id_param)
    returning cortescaja.corte_id,
              cortescaja.fecha_hora_apertura,
              cortescaja.saldo_inicial_efectivo,
              cortescaja.terminal_id;
end;
$function$;

COMMIT;
