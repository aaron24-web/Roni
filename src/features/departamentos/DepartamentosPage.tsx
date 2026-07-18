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
import '../../components/PantallaVenta.css'

interface FormularioDepartamento {
    id: number | null
    nombre: string
    descripcion: string
}

const FORMULARIO_VACIO: FormularioDepartamento = { id: null, nombre: '', descripcion: '' }

export default function DepartamentosPage() {
    const { data: departamentos = [], isPending, error } = useDepartamentos()
    const crear = useCrearDepartamento()
    const actualizar = useActualizarDepartamento()
    const eliminar = useEliminarDepartamento()

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
        })
        setModalAbierto(true)
    }

    const handleGuardar = async (e: FormEvent) => {
        e.preventDefault()
        const datos = {
            nombre: formulario.nombre,
            descripcion: formulario.descripcion || null,
        }
        try {
            if (editando && formulario.id !== null) {
                await actualizar.mutateAsync({ id: formulario.id, datos })
            } else {
                await crear.mutateAsync(datos)
            }
            setModalAbierto(false)
        } catch (err) {
            alert(`Error: ${(err as Error).message}`)
        }
    }

    const handleEliminar = async (id: number) => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar este departamento?')) return
        try {
            await eliminar.mutateAsync(id)
        } catch (err) {
            alert(`Error al eliminar: ${(err as Error).message}`)
        }
    }

    return (
        <div className="pos-container">
            {modalAbierto && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>{editando ? 'Editar' : 'Nuevo'} Departamento</h2>
                        <form onSubmit={handleGuardar} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                            <div className="footer">
                                <button
                                    type="button"
                                    className="pos-button"
                                    style={{ backgroundColor: '#6c757d' }}
                                    onClick={() => setModalAbierto(false)}
                                    disabled={guardando}
                                >Cancelar</button>
                                <button type="submit" className="checkout-btn" disabled={guardando}>
                                    {guardando ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="search-bar" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Gestión de Departamentos</h2>
                <button className="pos-button" onClick={abrirNuevo}>Añadir Nuevo Departamento</button>
            </div>

            <div className="table-container">
                {isPending && <p>Cargando departamentos...</p>}
                {error && <p style={{ color: '#dc3545' }}>Error al cargar: {error.message}</p>}

                {!isPending && !error && (
                    <table className="sales-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Descripción</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {departamentos.length === 0 ? (
                                <tr><td colSpan={3} style={{ textAlign: 'center' }}>No hay departamentos registrados.</td></tr>
                            ) : departamentos.map(departamento => (
                                <tr key={departamento.departamento_id}>
                                    <td>{departamento.nombre}</td>
                                    <td>{departamento.descripcion}</td>
                                    <td>
                                        <button onClick={() => abrirEdicion(departamento)}>Editar</button>
                                        <button
                                            onClick={() => handleEliminar(departamento.departamento_id)}
                                            style={{ marginLeft: '10px', backgroundColor: '#dc3545', color: 'white' }}
                                            disabled={eliminar.isPending}
                                        >Eliminar</button>
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
