// Pantalla de Proveedores. Ruta exclusiva de administrador.

import { useState, type FormEvent } from 'react'
import {
    useProveedores,
    useCrearProveedor,
    useActualizarProveedor,
    useDesactivarProveedor,
    type Proveedor,
    type DatosProveedor,
} from './useProveedores'
import '../../shared/styles/pos.css'

const FORMULARIO_VACIO: DatosProveedor = {
    nombre_empresa: '',
    nombre_contacto: '',
    rfc: '',
    telefono: '',
    email: '',
    direccion: '',
}

export default function ProveedoresPage() {
    const { data: proveedores = [], isPending, error } = useProveedores()
    const crear = useCrearProveedor()
    const actualizar = useActualizarProveedor()
    const desactivar = useDesactivarProveedor()

    const [modalAbierto, setModalAbierto] = useState(false)
    const [editandoId, setEditandoId] = useState<number | null>(null)
    const [formulario, setFormulario] = useState<DatosProveedor>(FORMULARIO_VACIO)

    const editando = editandoId !== null
    const guardando = crear.isPending || actualizar.isPending

    const campo = (nombre: keyof DatosProveedor) => ({
        value: formulario[nombre] ?? '',
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setFormulario({ ...formulario, [nombre]: e.target.value }),
        className: 'pos-input',
    })

    const abrirNuevo = () => {
        setEditandoId(null)
        setFormulario(FORMULARIO_VACIO)
        setModalAbierto(true)
    }

    const abrirEdicion = (proveedor: Proveedor) => {
        const { proveedor_id, activo: _activo, fecha_registro: _fecha, ...datos } = proveedor
        setEditandoId(proveedor_id)
        setFormulario(datos)
        setModalAbierto(true)
    }

    const handleGuardar = async (e: FormEvent) => {
        e.preventDefault()
        try {
            if (editando && editandoId !== null) {
                await actualizar.mutateAsync({ id: editandoId, datos: formulario })
            } else {
                await crear.mutateAsync(formulario)
            }
            setModalAbierto(false)
        } catch (err) {
            alert(`Error: ${(err as Error).message}`)
        }
    }

    const handleEliminar = async (id: number) => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar este proveedor?')) return
        try {
            await desactivar.mutateAsync(id)
        } catch (err) {
            alert(`Error al eliminar: ${(err as Error).message}`)
        }
    }

    return (
        <div className="pos-container">
            {modalAbierto && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>{editando ? 'Editar' : 'Nuevo'} Proveedor</h2>
                        <form onSubmit={handleGuardar} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <label>Nombre de la Empresa:</label>
                            <input type="text" required {...campo('nombre_empresa')} />
                            <label>Nombre de Contacto:</label>
                            <input type="text" {...campo('nombre_contacto')} />
                            <label>RFC:</label>
                            <input type="text" {...campo('rfc')} />
                            <label>Teléfono:</label>
                            <input type="tel" {...campo('telefono')} />
                            <label>Email:</label>
                            <input type="email" {...campo('email')} />
                            <label>Dirección:</label>
                            <textarea {...campo('direccion')} />
                            <div className="footer">
                                <button type="button" className="pos-button" onClick={() => setModalAbierto(false)} disabled={guardando}>Cancelar</button>
                                <button type="submit" className="checkout-btn" disabled={guardando}>
                                    {guardando ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="search-bar" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Gestión de Proveedores</h2>
                <button className="pos-button" onClick={abrirNuevo}>Añadir Nuevo Proveedor</button>
            </div>

            <div className="table-container">
                {isPending && <p>Cargando proveedores...</p>}
                {error && <p style={{ color: '#dc3545' }}>Error al cargar: {error.message}</p>}

                {!isPending && !error && (
                    <table className="sales-table">
                        <thead>
                            <tr><th>Nombre Empresa</th><th>Contacto</th><th>Teléfono</th><th>Email</th><th>Acciones</th></tr>
                        </thead>
                        <tbody>
                            {proveedores.length === 0 ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center' }}>No hay proveedores registrados.</td></tr>
                            ) : proveedores.map(proveedor => (
                                <tr key={proveedor.proveedor_id}>
                                    <td>{proveedor.nombre_empresa}</td>
                                    <td>{proveedor.nombre_contacto || 'N/A'}</td>
                                    <td>{proveedor.telefono || 'N/A'}</td>
                                    <td>{proveedor.email || 'N/A'}</td>
                                    <td>
                                        <button onClick={() => abrirEdicion(proveedor)}>Editar</button>
                                        <button
                                            onClick={() => handleEliminar(proveedor.proveedor_id)}
                                            style={{ marginLeft: '10px', backgroundColor: '#dc3545', color: 'white' }}
                                            disabled={desactivar.isPending}
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
