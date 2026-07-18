-- =====================================================================
-- Migración 003: Limpieza de datos de prueba (alcance "Media")
-- =====================================================================
-- Borra datos transaccionales y catálogo de prueba, conservando la
-- configuración esencial (roles, métodos de pago, tipos de movimiento,
-- departamentos, almacenes, diccionarios) y el usuario Administrador.
-- Reinicia los IDs (RESTART IDENTITY) para empezar limpio.
--
-- Respaldo previo: Backups/backup_pre_limpieza_*.sql
-- =====================================================================

BEGIN;

TRUNCATE TABLE
  public.detalleventa,
  public.pagos,
  public.cancelacionesautorizadas,
  public.movimientoscuentacliente,
  public.movimientosinventario,
  public.inventario,
  public.ventas,
  public.cortescaja,
  public.promocion_reglas,
  public.productos,
  public.promociones,
  public.clientes,
  public.proveedores
RESTART IDENTITY CASCADE;

-- Recrear el cliente por defecto "Público en General" (la app usa cliente_id = 1)
INSERT INTO public.clientes (cliente_id, nombre, permite_credito, limite_credito, activo)
VALUES (1, 'Público en General', true, 800.00, true);
SELECT setval('public.clientes_cliente_id_seq', 1, true);

-- Borrar empleados de prueba (sin usuario de Auth), conservar el Administrador
DELETE FROM public.empleados WHERE auth_user_id IS NULL;

COMMIT;
