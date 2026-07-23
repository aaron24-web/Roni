// Pantalla de Departamentos.
//
// Es una ruta exclusiva de administrador (ver RequireAdmin en App.tsx) y la
// escritura está restringida por políticas RLS en la base de datos, así que
// aquí no hacen falta comprobaciones de rol adicionales.

import { useState, type FormEvent } from 'react'
import {
    useDepartamentos,
    useCrearDepartamento,
    useActualizarDepartamento,
    useEliminarDepartamento,
    type Departamento,
} from './useDepartamentos'
import { usePromociones } from '../promociones/usePromociones'
import { useToast } from '../../shared/components/feedback/toast-context'
import { useConfirm } from '../../shared/components/feedback/dialog-context'
import Modal, { BotonCancelarModal } from '../../shared/components/Modal'
import '../../shared/styles/pos.css'

interface FormularioDepartamento {
    id: number | null
    nombre: string
    descripcion: string
    promocionId: string
}

const FORMULARIO_VACIO: FormularioDepartamento = { id: null, nombre: '', descripcion: '', promocionId: '' }

export default function DepartamentosPage() {
    const { data: departamentos = [], isPending, error } = useDepartamentos()
    const { data: promociones = [] } = usePromociones()
    const crear = useCrearDepartamento()
    const actualizar = useActualizarDepartamento()
    const eliminar = useEliminarDepartamento()
    const toast = useToast()
    const confirmar = useConfirm()

    const promocionesActivas = promociones.filter(p => p.activo)
    const nombrePromocion = (id: number | null) =>
        id == null ? '—' : (promociones.find(p => p.promocion_id === id)?.nombre ?? `#${id}`)

    const [modalAbierto, setModalAbierto] = useState(false)
    const [formulario, setFormulario] = useState<FormularioDepartamento>(FORMULARIO_VACIO)

    const editando = formulario.id !== null
    const guardando = crear.isPending || actualizar.isPending

    const abrirNuevo = () => {
        setFormulario(FORMULARIO_VACIO)
        setModalAbierto(true)
    }

    const abrirEdicion = (departamento: Departamento) => {
        setFormulario({
            id: departamento.departamento_id,
            nombre: departamento.nombre,
            descripcion: departamento.descripcion ?? '',
            promocionId: departamento.promocion_id ? String(departamento.promocion_id) : '',
        })
        setModalAbierto(true)
    }

    const handleGuardar = async (e: FormEvent) => {
        e.preventDefault()
        const datos = {
            nombre: formulario.nombre,
            descripcion: formulario.descripcion || null,
            promocion_id: formulario.promocionId ? parseInt(formulario.promocionId, 10) : null,
        }
        try {
            if (editando && formulario.id !== null) {
                await actualizar.mutateAsync({ id: formulario.id, datos })
                toast.success('Departamento actualizado.')
            } else {
                await crear.mutateAsync(datos)
                toast.success('Departamento creado.')
            }
            setModalAbierto(false)
        } catch (err) {
            toast.error(`Error: ${(err as Error).message}`)
        }
    }

    const handleEliminar = async (id: number) => {
        const confirmado = await confirmar({
            titulo: 'Eliminar departamento',
            mensaje: '¿Estás seguro de que quieres eliminar este departamento?',
            textoConfirmar: 'Eliminar',
            peligro: true,
        })
        if (!confirmado) return
        try {
            await eliminar.mutateAsync(id)
            toast.success('Departamento eliminado.')
        } catch (err) {
            toast.error(`Error al eliminar: ${(err as Error).message}`)
        }
    }

    return (
        <div className="pos-container">
            {modalAbierto && (
                <Modal
                    titulo={`${editando ? 'Editar' : 'Nuevo'} Departamento`}
                    onClose={() => setModalAbierto(false)}
                    confirmarDescarte
                >
                    <form onSubmit={handleGuardar} className="form-vertical">
                        <label>Nombre:</label>
                        <input
                            type="text"
                            value={formulario.nombre}
                            onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })}
                            required
                            className="pos-input"
                        />
                        <label>Descripción:</label>
                        <textarea
                            value={formulario.descripcion}
                            onChange={(e) => setFormulario({ ...formulario, descripcion: e.target.value })}
                            className="pos-input"
                        />
                        <label>Promoción del departamento (opcional):</label>
                        {/* Aplica a todos sus productos; si un producto tiene promo propia, esa gana. */}
                        <select
                            value={formulario.promocionId}
                            onChange={(e) => setFormulario({ ...formulario, promocionId: e.target.value })}
                            className="pos-input"
                        >
                            <option value="">— Sin promoción —</option>
                            {promocionesActivas.map(promocion => (
                                <option key={promocion.promocion_id} value={promocion.promocion_id}>
                                    {promocion.nombre}
                                </option>
                            ))}
                        </select>
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
                <h2>Gestión de Departamentos</h2>
                <button className="btn btn--primary" onClick={abrirNuevo}>+ Nuevo departamento</button>
            </div>

            <div className="table-container">
                {isPending && <p>Cargando departamentos...</p>}
                {error && <p className="texto-error">Error al cargar: {error.message}</p>}

                {!isPending && !error && (
                    <table className="sales-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Descripción</th>
                                <th>Promoción</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {departamentos.length === 0 ? (
                                <tr><td colSpan={4} style={{ textAlign: 'center' }}>No hay departamentos registrados.</td></tr>
                            ) : departamentos.map(departamento => (
                                <tr key={departamento.departamento_id}>
                                    <td>{departamento.nombre}</td>
                                    <td>{departamento.descripcion}</td>
                                    <td>{nombrePromocion(departamento.promocion_id)}</td>
                                    <td>
                                        <div className="acciones">
                                            <button className="btn btn--secondary" onClick={() => abrirEdicion(departamento)}>Editar</button>
                                            <button
                                                className="btn btn--danger"
                                                onClick={() => handleEliminar(departamento.departamento_id)}
                                                disabled={eliminar.isPending}
                                            >Eliminar</button>
                                        </div>
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
