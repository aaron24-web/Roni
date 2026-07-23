-- 011: Promociones N×M reales ("lleva N, paga M").
--
-- Hasta ahora CANTIDAD_X_CANTIDAD guardaba un solo número (`valor` = N) que
-- significaba "de cada N unidades se cobran N-1", por lo que solo podían
-- expresarse 2x1, 3x2, 4x3... Se agrega `cantidad_pago` (M) para poder
-- expresar cualquier N×M: un 3x1 es valor=3, cantidad_pago=1.
--
-- Nota de compatibilidad: aunque la UI vieja decía "3 para un 3x2", el
-- cálculo del carrito siempre cobró 1 unidad por grupo (N×1). Por eso las
-- promociones existentes se rellenan con cantidad_pago = 1: conserva el
-- comportamiento que el cliente veía en caja, ahora de forma explícita.

ALTER TABLE public.promociones
    ADD COLUMN IF NOT EXISTS cantidad_pago numeric NULL;

COMMENT ON COLUMN public.promociones.cantidad_pago IS
    'En CANTIDAD_X_CANTIDAD: unidades que se cobran por cada grupo de `valor`. NULL = 1 (comportamiento histórico).';

-- Backfill: hace explícito el comportamiento histórico (se cobraba 1 por grupo).
UPDATE public.promociones
SET cantidad_pago = 1
WHERE tipo_promocion = 'CANTIDAD_X_CANTIDAD' AND cantidad_pago IS NULL;

-- Sanidad: si se define, debe cobrarse al menos 1 unidad y menos que el grupo.
ALTER TABLE public.promociones
    ADD CONSTRAINT chk_cantidad_pago
    CHECK (cantidad_pago IS NULL OR (cantidad_pago >= 1 AND cantidad_pago < valor));
