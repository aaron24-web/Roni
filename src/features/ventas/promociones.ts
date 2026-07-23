// Cálculo del importe de un renglón del carrito aplicando su promoción.
//
// Es una función pura: no modifica el item que recibe. (La versión anterior
// escribía `item.importe` como efecto secundario durante el render.)

import type { ItemCarrito } from '../../shared/types/domain'

/** Indica si la promoción está vigente en este momento. */
function promocionVigente(promocion: NonNullable<ItemCarrito['promociones']>): boolean {
    const ahora = new Date()
    if (!promocion.activo) return false
    if (new Date(promocion.fecha_inicio) > ahora) return false
    if (promocion.fecha_fin && new Date(promocion.fecha_fin) < ahora) return false
    return true
}

/** Importe del renglón sin aplicar promociones. */
export function importeSinPromocion(item: ItemCarrito): number {
    return item.cantidad * item.precio_unitario_registrado
}

/** Importe final del renglón, con la promoción aplicada si corresponde. */
export function calcularImporteFinal(item: ItemCarrito): number {
    const importe = importeSinPromocion(item)
    const promocion = item.promociones
    if (!promocion || !promocionVigente(promocion)) return importe

    const valor = Number(promocion.valor)

    switch (promocion.tipo_promocion) {
        case 'PORCENTAJE': {
            return importe - importe * (valor / 100)
        }
        case 'CANTIDAD_X_CANTIDAD': {
            // "Lleva N, paga M": de cada grupo de `valor` (N) unidades se
            // cobran `cantidad_pago` (M). Ej.: 3x1 → valor=3, cantidad_pago=1.
            //
            // Sin cantidad_pago se cobra 1 por grupo: es lo que este cálculo
            // hizo SIEMPRE (aunque la UI vieja decía "3 para un 3x2", el
            // código cobraba 1 de cada 3). La migración 011 rellena las
            // promociones existentes con cantidad_pago=1 para hacerlo explícito.
            if (valor <= 0) return importe
            const paga = promocion.cantidad_pago != null
                ? Number(promocion.cantidad_pago)
                : 1
            const gruposCompletos = Math.floor(item.cantidad / valor)
            const sobrantes = item.cantidad % valor
            return (gruposCompletos * paga + sobrantes) * item.precio_unitario_registrado
        }
        case 'PRECIO_ESPECIAL': {
            // Precio fijo por unidad (nunca más caro que el normal).
            const precio = Number(promocion.precio_promocional ?? 0)
            if (precio <= 0) return importe
            return item.cantidad * Math.min(precio, item.precio_unitario_registrado)
        }
        case 'MAYOREO': {
            // Al llevar `valor` piezas o más, todas a precio de mayoreo.
            const precio = Number(promocion.precio_promocional ?? 0)
            if (valor <= 0 || precio <= 0 || item.cantidad < valor) return importe
            return item.cantidad * Math.min(precio, item.precio_unitario_registrado)
        }
        default:
            return importe
    }
}

/** Total del carrito con promociones aplicadas. */
export function calcularTotal(carrito: ItemCarrito[]): number {
    return carrito.reduce((suma, item) => suma + calcularImporteFinal(item), 0)
}
