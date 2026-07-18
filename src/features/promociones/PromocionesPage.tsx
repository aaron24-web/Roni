// Pantalla de Promociones. Ruta exclusiva de administrador.

import { useState, type FormEvent, type ChangeEvent } from 'react'
import {
    usePromociones,
    useCrearPromocion,
    useActualizarPromocion,
    TIPOS_DE_PROMOCION,
    type Promocion,
    type DatosPromocion,
} from './usePromociones'
import '../../shared/styles/pos.css'

const hoy = () => new Date().toISOString().split('T')[0]

/** Convierte una fecha de la base (timestamptz) al formato de <input type="date"> */
const aFechaInput = (valor: string | null): string =>
    valor ? new Date(valor).toISOString().split('T')[0] : ''

const formularioVacio = (): DatosPromocion => ({
    nombre: '',
    tipo_promocion: TIPOS_DE_PROMOCION[0].value,
    valor: 0,
    descripcion: '',
    fecha_inicio: hoy(),
    fecha_fin: null,
    activo: true,
})

export default function PromocionesPage() {
    const { data: promociones = [], isPending, error } = usePromociones()
    const crear = useCrearPromocion()
    const actualizar = useActualizarPromocion()

    const [modalAbierto, setModalAbierto] = useState(false)
    const [editandoId, setEditandoId] = useState<number | null>(null)
    const [formulario, setFormulario] = useState<DatosPromocion>(formularioVacio)

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
            valor: Number(promocion.valor),
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

    const handleGuardar = async (e: FormEvent) => {
        e.preventDefault()
        if (!Number.isFinite(formulario.valor) || formulario.valor <= 0) {
            alert("El 'valor' de la promoción debe ser un número mayor que cero.")
            return
        }
        const datos: DatosPromocion = {
            ...formulario,
            // Una fecha de fin vacía significa "sin caducidad".
            fecha_fin: formulario.fecha_fin || null,
            descripcion: formulario.descripcion || null,
        }
        try {
            if (editando && editandoId !== null) {
                await actualizar.mutateAsync({ id: editandoId, datos })
            } else {
                await crear.mutateAsync(datos)
            }
            setModalAbierto(false)
        } catch (err) {
            alert(`Error al guardar: ${(err as Error).message}`)
        }
    }

    // La etiqueta del campo "valor" cambia según el tipo de promoción.
    const etiquetaValor = () => {
        switch (formulario.tipo_promocion) {
            case 'PORCENTAJE':
                return 'Porcentaje de Descuento (ej: 15 para 15%)'
            case 'CANTIDAD_X_CANTIDAD':
                return 'Cantidad de la Oferta (ej: 2 para un 2x1, 3 para un 3x2)'
            default:
                return 'Valor'
        }
    }

    return (
        <div className="pos-container">
            {modalAbierto && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>{editando ? 'Editar' : 'Nueva'} Promoción</h2>
                        <form onSubmit={handleGuardar} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <label>Nombre de la Promoción (ej: "Verano 2x1"):</label>
                            <input type="text" name="nombre" value={formulario.nombre} onChange={handleChange} required className="pos-input" />

                            <label>Tipo de Promoción:</label>
                            <select name="tipo_promocion" value={formulario.tipo_promocion} onChange={handleChange} required className="pos-input">
                                {TIPOS_DE_PROMOCION.map(tipo => (
                                    <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                                ))}
                            </select>

                            <label>{etiquetaValor()}:</label>
                            <input type="number" name="valor" value={formulario.valor} onChange={handleChange} required className="pos-input" />

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
                                <button type="button" onClick={() => setModalAbierto(false)} className="pos-button" style={{ backgroundColor: '#6c757d' }} disabled={guardando}>Cancelar</button>
                                <button type="submit" className="checkout-btn" disabled={guardando}>
                                    {guardando ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="search-bar" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Gestión de Promociones</h2>
                <button className="pos-button" onClick={abrirNuevo}>Añadir Promoción</button>
            </div>

            <div className="table-container">
                {isPending && <p>Cargando promociones...</p>}
                {error && <p style={{ color: '#dc3545' }}>Error al cargar: {error.message}</p>}

                {!isPending && !error && (
                    <table className="sales-table">
                        <thead><tr><th>Nombre</th><th>Tipo</th><th>Valor</th><th>Activo</th><th>Acciones</th></tr></thead>
                        <tbody>
                            {promociones.length === 0 ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center' }}>No hay promociones registradas.</td></tr>
                            ) : promociones.map(promocion => (
                                <tr key={promocion.promocion_id}>
                                    <td>{promocion.nombre}</td>
                                    <td>{TIPOS_DE_PROMOCION.find(t => t.value === promocion.tipo_promocion)?.label ?? promocion.tipo_promocion}</td>
                                    <td>{promocion.valor}</td>
                                    <td>{promocion.activo ? 'Sí' : 'No'}</td>
                                    <td>
                                        <button onClick={() => abrirEdicion(promocion)}>Editar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
