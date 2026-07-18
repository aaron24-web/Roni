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
            // Ej.: en un 3x2 (valor = 3) se cobran 2 de cada 3 unidades.
            if (valor <= 0) return importe
            const gruposCompletos = Math.floor(item.cantidad / valor)
            const sobrantes = item.cantidad % valor
            return (gruposCompletos + sobrantes) * item.precio_unitario_registrado
        }
        default:
            return importe
    }
}

/** Total del carrito con promociones aplicadas. */
export function calcularTotal(carrito: ItemCarrito[]): number {
    return carrito.reduce((suma, item) => suma + calcularImporteFinal(item), 0)
}
