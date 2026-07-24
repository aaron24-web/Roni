// Editor del contenido de un paquete (tipo de producto KIT).
//
// El paquete es virtual: no se arma ni tiene existencias propias. Al venderlo,
// el servidor descuenta las piezas que se listan aquí (migración 016).

import { useMemo, useState } from 'react'
import type { ComponenteKit, ProductoConDetalle } from './useProductos'

interface Props {
    componentes: ComponenteKit[]
    /** Catálogo completo; se filtran los paquetes, que no pueden anidarse. */
    candidatos: ProductoConDetalle[]
    precioPaquete: number
    onCambiar: (componentes: ComponenteKit[]) => void
}

const dinero = (n: number) => `$${n.toFixed(2)}`

export default function EditorContenidoPaquete({ componentes, candidatos, precioPaquete, onCambiar }: Props) {
    const [busqueda, setBusqueda] = useState('')

    const porId = useMemo(
        () => new Map(candidatos.map(p => [p.producto_id, p])),
        [candidatos],
    )

    const yaPuestos = new Set(componentes.map(c => c.producto_id))

    const resultados = useMemo(() => {
        const termino = busqueda.trim().toLowerCase()
        if (!termino) return []
        return candidatos
            .filter(p => p.tipo_producto !== 'KIT' && !yaPuestos.has(p.producto_id))
            .filter(p =>
                p.descripcion.toLowerCase().includes(termino) ||
                (p.codigo_barras ?? '').toLowerCase().includes(termino))
            .slice(0, 6)
        // yaPuestos se deriva de `componentes`, que sí está en las dependencias.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [busqueda, candidatos, componentes])

    const anadir = (productoId: number) => {
        onCambiar([...componentes, { producto_id: productoId, cantidad: 1 }])
        setBusqueda('')
    }

    const cambiarCantidad = (productoId: number, cantidad: number) => {
        onCambiar(componentes.map(c => (c.producto_id === productoId ? { ...c, cantidad } : c)))
    }

    const quitar = (productoId: number) => {
        onCambiar(componentes.filter(c => c.producto_id !== productoId))
    }

    // Precio de comprar las piezas por separado, y cuántos paquetes salen del
    // stock actual: el mínimo de (existencias / piezas que lleva).
    const { totalSuelto, armables } = useMemo(() => {
        let suelto = 0
        let posibles = Infinity
        for (const componente of componentes) {
            const producto = porId.get(componente.producto_id)
            if (!producto) continue
            suelto += Number(producto.precio_venta ?? 0) * componente.cantidad
            if (producto.tipo_producto !== 'SERVICIO') {
                const stock = producto.inventario[0]?.cantidad_actual ?? 0
                posibles = Math.min(posibles, Math.floor(stock / componente.cantidad))
            }
        }
        return {
            totalSuelto: suelto,
            armables: componentes.length === 0 ? 0 : posibles,
        }
    }, [componentes, porId])

    const ahorro = totalSuelto - precioPaquete
    const porcentaje = totalSuelto > 0 ? Math.round((ahorro / totalSuelto) * 100) : 0

    return (
        // data-editable: añadir o quitar piezas son clics, no cambios de campo;
        // sin esto el aviso de "descartar cambios" no se enteraría.
        <div className="kit-editor" data-editable>
            <label>Contenido del paquete:</label>

            <input
                type="text"
                className="pos-input"
                data-sin-confirmar
                placeholder="Buscar producto para añadir..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
            />

            {resultados.length > 0 && (
                <ul className="kit-editor__sugerencias">
                    {resultados.map(producto => (
                        <li key={producto.producto_id}>
                            <button type="button" className="btn btn--secondary" onClick={() => anadir(producto.producto_id)}>
                                + {producto.descripcion} · {dinero(Number(producto.precio_venta ?? 0))}
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {componentes.length === 0 ? (
                <p className="texto-error">Añade al menos un producto: un paquete vacío no se puede vender.</p>
            ) : (
                <table className="sales-table kit-editor__tabla">
                    <thead>
                        <tr><th>Producto</th><th>Piezas</th><th>Subtotal</th><th></th></tr>
                    </thead>
                    <tbody>
                        {componentes.map(componente => {
                            const producto = porId.get(componente.producto_id)
                            const precio = Number(producto?.precio_venta ?? 0)
                            return (
                                <tr key={componente.producto_id}>
                                    <td>{producto?.descripcion ?? `#${componente.producto_id}`}</td>
                                    <td>
                                        <input
                                            type="number"
                                            step="any"
                                            min="0.01"
                                            className="pos-input"
                                            style={{ width: '5rem' }}
                                            value={componente.cantidad}
                                            onChange={(e) =>
                                                cambiarCantidad(componente.producto_id, parseFloat(e.target.value) || 0)}
                                            aria-label={`Piezas de ${producto?.descripcion ?? 'componente'}`}
                                        />
                                    </td>
                                    <td>{dinero(precio * componente.cantidad)}</td>
                                    <td>
                                        <button
                                            type="button"
                                            className="btn btn--danger"
                                            onClick={() => quitar(componente.producto_id)}
                                        >Quitar</button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            )}

            {componentes.length > 0 && (
                <p className="kit-editor__resumen">
                    Suelto: <strong>{dinero(totalSuelto)}</strong> ·
                    {' '}Paquete: <strong>{dinero(precioPaquete)}</strong> ·
                    {' '}{ahorro >= 0
                        ? <>Ahorro: <strong>{dinero(ahorro)}</strong> ({porcentaje}%)</>
                        : <strong className="texto-error">El paquete cuesta {dinero(-ahorro)} más que comprarlo suelto</strong>}
                    <br />
                    Se pueden armar ahora: <strong>{Number.isFinite(armables) ? armables : '—'}</strong>
                </p>
            )}
        </div>
    )
}
