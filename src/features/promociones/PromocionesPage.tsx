// Pantalla de Promociones. Ruta exclusiva de administrador.

import { useState, useMemo, type FormEvent, type ChangeEvent } from 'react'
import {
    usePromociones,
    useCrearPromocion,
    useActualizarPromocion,
    useAsignarPromocionProductos,
    TIPOS_DE_PROMOCION,
    type Promocion,
    type DatosPromocion,
} from './usePromociones'
import { useProductos } from '../productos/useProductos'
import { useDepartamentos } from '../departamentos/useDepartamentos'
import { useToast } from '../../shared/components/feedback/toast-context'
import Modal, { BotonCancelarModal } from '../../shared/components/Modal'
import '../../shared/styles/pos.css'

const hoy = () => new Date().toISOString().split('T')[0]

/** Convierte una fecha de la base (timestamptz) al formato de <input type="date"> */
const aFechaInput = (valor: string | null): string =>
    valor ? new Date(valor).toISOString().split('T')[0] : ''

const formularioVacio = (): DatosPromocion => ({
    nombre: '',
    tipo_promocion: TIPOS_DE_PROMOCION[0].value,
    valor: 0,
    cantidad_pago: 1,
    precio_promocional: null,
    descripcion: '',
    fecha_inicio: hoy(),
    fecha_fin: null,
    activo: true,
})

/** Estado de vigencia para el badge de la lista. */
const estadoPromocion = (promocion: Promocion): { texto: string; clase: string } => {
    if (!promocion.activo) return { texto: 'Inactiva', clase: 'badge--muted' }
    const ahora = new Date()
    if (new Date(promocion.fecha_inicio) > ahora) return { texto: 'Programada', clase: 'badge--info' }
    if (promocion.fecha_fin && new Date(promocion.fecha_fin) < ahora) return { texto: 'Expirada', clase: 'badge--danger' }
    return { texto: 'Vigente', clase: 'badge--success' }
}

/** Presentación del valor en la tabla: "15%", "3×1", "$10.00 c/u", "10+ a $4.00". */
const formatearValor = (promocion: Promocion): string => {
    switch (promocion.tipo_promocion) {
        case 'CANTIDAD_X_CANTIDAD':
            return `${Number(promocion.valor)}×${Number(promocion.cantidad_pago ?? 1)}`
        case 'PRECIO_ESPECIAL':
            return `$${Number(promocion.precio_promocional ?? 0).toFixed(2)} c/u`
        case 'MAYOREO':
            return `${Number(promocion.valor)}+ a $${Number(promocion.precio_promocional ?? 0).toFixed(2)}`
        default:
            return `${Number(promocion.valor)}%`
    }
}

export default function PromocionesPage() {
    const { data: promociones = [], isPending, error } = usePromociones()
    const { data: productos = [] } = useProductos()
    const { data: departamentos = [] } = useDepartamentos()
    const crear = useCrearPromocion()
    const actualizar = useActualizarPromocion()
    const asignar = useAsignarPromocionProductos()
    const toast = useToast()

    const [modalAbierto, setModalAbierto] = useState(false)
    const [editandoId, setEditandoId] = useState<number | null>(null)
    const [formulario, setFormulario] = useState<DatosPromocion>(formularioVacio)

    // Modal de asignación de productos a una promoción.
    const [promoAsignando, setPromoAsignando] = useState<Promocion | null>(null)
    const [seleccion, setSeleccion] = useState<Set<number>>(new Set())
    const [busquedaAsignar, setBusquedaAsignar] = useState('')

    // Uso por promoción: cuántos productos y departamentos la tienen puesta.
    const usoPorPromocion = useMemo(() => {
        const mapa = new Map<number, { productos: number; departamentos: number }>()
        const uso = (id: number) => {
            const actual = mapa.get(id) ?? { productos: 0, departamentos: 0 }
            mapa.set(id, actual)
            return actual
        }
        for (const producto of productos) {
            if (producto.promocion_id != null) uso(producto.promocion_id).productos += 1
        }
        for (const departamento of departamentos) {
            if (departamento.promocion_id != null) uso(departamento.promocion_id).departamentos += 1
        }
        return mapa
    }, [productos, departamentos])

    const productosFiltradosAsignar = useMemo(() => {
        const termino = busquedaAsignar.trim().toLowerCase()
        if (!termino) return productos
        return productos.filter(producto =>
            producto.descripcion.toLowerCase().includes(termino) ||
            (producto.codigo_barras ?? '').toLowerCase().includes(termino))
    }, [productos, busquedaAsignar])

    const abrirAsignacion = (promocion: Promocion) => {
        setPromoAsignando(promocion)
        setBusquedaAsignar('')
        setSeleccion(new Set(
            productos
                .filter(producto => producto.promocion_id === promocion.promocion_id)
                .map(producto => producto.producto_id),
        ))
    }

    const alternarSeleccion = (productoId: number) => {
        setSeleccion(prev => {
            const nueva = new Set(prev)
            if (nueva.has(productoId)) nueva.delete(productoId)
            else nueva.add(productoId)
            return nueva
        })
    }

    const guardarAsignacion = async () => {
        if (!promoAsignando) return
        try {
            await asignar.mutateAsync({
                promocionId: promoAsignando.promocion_id,
                productoIds: [...seleccion],
            })
            toast.success(`Productos de "${promoAsignando.nombre}" actualizados.`)
            setPromoAsignando(null)
        } catch (err) {
            toast.error(`Error al asignar: ${(err as Error).message}`)
        }
    }

    const nombrePromo = (id: number | null) =>
        id == null ? '—' : (promociones.find(p => p.promocion_id === id)?.nombre ?? `#${id}`)

    const editando = editandoId !== null
    const guardando = crear.isPending || actualizar.isPending

    const abrirNuevo = () => {
        setEditandoId(null)
        setFormulario(formularioVacio())
        setModalAbierto(true)
    }

    const abrirEdicion = (promocion: Promocion) => {
        setEditandoId(promocion.promocion_id)
        // Copiamos a un objeto nuevo: nunca mutamos el dato de la caché.
        setFormulario({
            nombre: promocion.nombre,
            tipo_promocion: promocion.tipo_promocion,
            valor: promocion.valor != null ? Number(promocion.valor) : null,
            cantidad_pago: promocion.cantidad_pago != null ? Number(promocion.cantidad_pago) : 1,
            precio_promocional: promocion.precio_promocional != null ? Number(promocion.precio_promocional) : null,
            descripcion: promocion.descripcion,
            fecha_inicio: aFechaInput(promocion.fecha_inicio),
            fecha_fin: aFechaInput(promocion.fecha_fin) || null,
            activo: promocion.activo ?? true,
        })
        setModalAbierto(true)
    }

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target
        const valorCampo = type === 'checkbox'
            ? (e.target as HTMLInputElement).checked
            : type === 'number' ? Number(value) : value
        setFormulario(prev => ({ ...prev, [name]: valorCampo }))
    }

    const esNxM = formulario.tipo_promocion === 'CANTIDAD_X_CANTIDAD'
    const esPrecioEspecial = formulario.tipo_promocion === 'PRECIO_ESPECIAL'
    const esMayoreo = formulario.tipo_promocion === 'MAYOREO'
    const llevaPrecio = esPrecioEspecial || esMayoreo

    const handleGuardar = async (e: FormEvent) => {
        e.preventDefault()
        const valor = formulario.valor ?? 0
        const precio = formulario.precio_promocional ?? 0
        if (esNxM) {
            const paga = formulario.cantidad_pago ?? 0
            if (!Number.isInteger(valor) || valor < 2) {
                toast.error('"Lleva" debe ser un número entero de al menos 2 (ej: 3 en un 3x1).')
                return
            }
            if (!Number.isInteger(paga) || paga < 1 || paga >= valor) {
                toast.error(`"Paga" debe ser un entero entre 1 y ${valor - 1} (ej: 1 en un 3x1).`)
                return
            }
        } else if (esPrecioEspecial) {
            if (!Number.isFinite(precio) || precio <= 0) {
                toast.error('El precio especial debe ser mayor que cero.')
                return
            }
        } else if (esMayoreo) {
            if (!Number.isInteger(valor) || valor < 2) {
                toast.error('La cantidad mínima de mayoreo debe ser un entero de al menos 2.')
                return
            }
            if (!Number.isFinite(precio) || precio <= 0) {
                toast.error('El precio de mayoreo debe ser mayor que cero.')
                return
            }
        } else if (!Number.isFinite(valor) || valor <= 0 || valor > 100) {
            toast.error('El porcentaje de descuento debe ser mayor que 0 y como máximo 100.')
            return
        }
        const datos: DatosPromocion = {
            ...formulario,
            // Una fecha de fin vacía significa "sin caducidad".
            fecha_fin: formulario.fecha_fin || null,
            descripcion: formulario.descripcion || null,
            // Cada campo numérico solo viaja en los tipos donde aplica.
            valor: esPrecioEspecial ? null : formulario.valor,
            cantidad_pago: esNxM ? formulario.cantidad_pago : null,
            precio_promocional: llevaPrecio ? formulario.precio_promocional : null,
        }
        try {
            if (editando && editandoId !== null) {
                await actualizar.mutateAsync({ id: editandoId, datos })
                toast.success('Promoción actualizada.')
            } else {
                await crear.mutateAsync(datos)
                toast.success('Promoción creada.')
            }
            setModalAbierto(false)
        } catch (err) {
            toast.error(`Error al guardar: ${(err as Error).message}`)
        }
    }

    // La etiqueta del campo "valor" cambia según el tipo de promoción.
    const etiquetaValor = () => {
        switch (formulario.tipo_promocion) {
            case 'PORCENTAJE':
                return 'Porcentaje de Descuento (ej: 15 para 15%)'
            case 'CANTIDAD_X_CANTIDAD':
                return 'Lleva — unidades del grupo (ej: 3 en un 3x1)'
            case 'MAYOREO':
                return 'Cantidad mínima para mayoreo (ej: 10 para "10+")'
            default:
                return 'Valor'
        }
    }

    return (
        <div className="pos-container">
            {promoAsignando && (
                <Modal
                    titulo={`Productos con "${promoAsignando.nombre}"`}
                    onClose={() => setPromoAsignando(null)}
                    cerrarAlClickFuera={false}
                    confirmarDescarte
                >
                    {/* El filtro no cuenta como cambio: escribir aquí no debe disparar el aviso. */}
                    <input
                        className="pos-input"
                        data-sin-confirmar
                        placeholder="Filtrar por nombre o código..."
                        value={busquedaAsignar}
                        onChange={(e) => setBusquedaAsignar(e.target.value)}
                    />
                    <div className="table-container" style={{ maxHeight: '45vh', marginTop: '12px' }}>
                        <table className="sales-table">
                            <thead><tr><th style={{ width: 40 }}></th><th>Producto</th><th>Promo actual</th></tr></thead>
                            {/* Marcar una fila cuenta como cambio aunque no pase por un campo. */}
                            <tbody data-editable>
                                {productosFiltradosAsignar.length === 0 ? (
                                    <tr><td colSpan={3} style={{ textAlign: 'center' }}>Sin resultados.</td></tr>
                                ) : productosFiltradosAsignar.map(producto => (
                                    <tr
                                        key={producto.producto_id}
                                        onClick={() => alternarSeleccion(producto.producto_id)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={seleccion.has(producto.producto_id)}
                                                onChange={() => alternarSeleccion(producto.producto_id)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </td>
                                        <td>{producto.descripcion}</td>
                                        <td>{nombrePromo(producto.promocion_id)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="dialog__acciones">
                        <span className="toolbar__count" style={{ marginRight: 'auto', marginLeft: 0 }}>
                            {seleccion.size} seleccionado{seleccion.size === 1 ? '' : 's'}
                        </span>
                        <BotonCancelarModal disabled={asignar.isPending} />
                        <button className="btn btn--primary" onClick={guardarAsignacion} disabled={asignar.isPending}>
                            {asignar.isPending ? 'Guardando...' : 'Guardar asignación'}
                        </button>
                    </div>
                </Modal>
            )}

            {modalAbierto && (
                <Modal
                    titulo={`${editando ? 'Editar' : 'Nueva'} Promoción`}
                    onClose={() => setModalAbierto(false)}
                    confirmarDescarte
                >
                    <form onSubmit={handleGuardar} className="form-vertical">
                            <label>Nombre de la Promoción (ej: "Verano 2x1"):</label>
                            <input type="text" name="nombre" value={formulario.nombre} onChange={handleChange} required className="pos-input" />

                            <label>Tipo de Promoción:</label>
                            <select name="tipo_promocion" value={formulario.tipo_promocion} onChange={handleChange} required className="pos-input">
                                {TIPOS_DE_PROMOCION.map(tipo => (
                                    <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                                ))}
                            </select>

                            {!esPrecioEspecial && (
                                <>
                                    <label>{etiquetaValor()}:</label>
                                    <input type="number" name="valor" value={formulario.valor ?? ''} onChange={handleChange} required className="pos-input" />
                                </>
                            )}

                            {esNxM && (
                                <>
                                    <label>Paga — unidades que se cobran (ej: 1 en un 3x1):</label>
                                    <input
                                        type="number"
                                        name="cantidad_pago"
                                        min={1}
                                        value={formulario.cantidad_pago ?? ''}
                                        onChange={handleChange}
                                        required
                                        className="pos-input"
                                    />
                                </>
                            )}

                            {llevaPrecio && (
                                <>
                                    <label>{esMayoreo ? 'Precio por unidad al llegar al mínimo:' : 'Precio especial por unidad:'}</label>
                                    <input
                                        type="number"
                                        name="precio_promocional"
                                        step="0.01"
                                        min={0.01}
                                        value={formulario.precio_promocional ?? ''}
                                        onChange={handleChange}
                                        required
                                        className="pos-input"
                                    />
                                </>
                            )}

                            <label>Descripción:</label>
                            <textarea name="descripcion" value={formulario.descripcion ?? ''} onChange={handleChange} className="pos-input" />

                            <label>Fecha de Inicio:</label>
                            <input type="date" name="fecha_inicio" value={formulario.fecha_inicio} onChange={handleChange} required className="pos-input" />

                            <label>Fecha de Fin (Opcional):</label>
                            <input type="date" name="fecha_fin" value={formulario.fecha_fin ?? ''} onChange={handleChange} className="pos-input" />

                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <label htmlFor="activo">Activa:</label>
                                <input type="checkbox" id="activo" name="activo" checked={formulario.activo} onChange={handleChange} />
                            </div>

                            <div className="footer">
                                <BotonCancelarModal disabled={guardando} />
                                <button type="submit" className="btn btn--primary" disabled={guardando}>
                                    {guardando ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                    </form>
                </Modal>
            )}

            <div className="search-bar" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Gestión de Promociones</h2>
                <button className="btn btn--primary" onClick={abrirNuevo}>+ Nueva promoción</button>
            </div>

            <div className="table-container">
                {isPending && <p>Cargando promociones...</p>}
                {error && <p className="texto-error">Error al cargar: {error.message}</p>}

                {!isPending && !error && (
                    <table className="sales-table">
                        <thead><tr><th>Nombre</th><th>Tipo</th><th>Valor</th><th>Estado</th><th>Se aplica a</th><th>Acciones</th></tr></thead>
                        <tbody>
                            {promociones.length === 0 ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center' }}>No hay promociones registradas.</td></tr>
                            ) : promociones.map(promocion => {
                                const estado = estadoPromocion(promocion)
                                const uso = usoPorPromocion.get(promocion.promocion_id) ?? { productos: 0, departamentos: 0 }
                                const seAplicaA = [
                                    uso.productos > 0 ? `${uso.productos} producto${uso.productos === 1 ? '' : 's'}` : null,
                                    uso.departamentos > 0 ? `${uso.departamentos} depto${uso.departamentos === 1 ? '' : 's'}` : null,
                                ].filter(Boolean).join(' · ') || '—'
                                return (
                                    <tr key={promocion.promocion_id}>
                                        <td>{promocion.nombre}</td>
                                        <td>{TIPOS_DE_PROMOCION.find(t => t.value === promocion.tipo_promocion)?.label ?? promocion.tipo_promocion}</td>
                                        <td>{formatearValor(promocion)}</td>
                                        <td><span className={`badge ${estado.clase}`}>{estado.texto}</span></td>
                                        <td>{seAplicaA}</td>
                                        <td>
                                            <div className="acciones">
                                                <button className="btn btn--secondary" onClick={() => abrirEdicion(promocion)}>Editar</button>
                                                <button className="btn btn--primary" onClick={() => abrirAsignacion(promocion)}>Asignar productos</button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
