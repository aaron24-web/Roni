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
import { useToast } from '../../shared/components/feedback/toast-context'
import { useConfirm } from '../../shared/components/feedback/dialog-context'
import Modal, { BotonCancelarModal } from '../../shared/components/Modal'
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
    const toast = useToast()
    const confirmar = useConfirm()

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
                toast.success('Proveedor actualizado.')
            } else {
                await crear.mutateAsync(formulario)
                toast.success('Proveedor creado.')
            }
            setModalAbierto(false)
        } catch (err) {
            toast.error(`Error: ${(err as Error).message}`)
        }
    }

    const handleEliminar = async (id: number) => {
        const confirmado = await confirmar({
            titulo: 'Eliminar proveedor',
            mensaje: '¿Estás seguro de que quieres eliminar este proveedor?',
            textoConfirmar: 'Eliminar',
            peligro: true,
        })
        if (!confirmado) return
        try {
            await desactivar.mutateAsync(id)
            toast.success('Proveedor eliminado.')
        } catch (err) {
            toast.error(`Error al eliminar: ${(err as Error).message}`)
        }
    }

    return (
        <div className="pos-container">
            {modalAbierto && (
                <Modal
                    titulo={`${editando ? 'Editar' : 'Nuevo'} Proveedor`}
                    onClose={() => setModalAbierto(false)}
                    confirmarDescarte
                >
                    <form onSubmit={handleGuardar} className="form-vertical">
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
                            <BotonCancelarModal disabled={guardando} />
                            <button type="submit" className="btn btn--primary" disabled={guardando}>
                                {guardando ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            <div className="search-bar" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Gestión de Proveedores</h2>
                <button className="btn btn--primary" onClick={abrirNuevo}>+ Nuevo proveedor</button>
            </div>

            <div className="table-container">
                {isPending && <p>Cargando proveedores...</p>}
                {error && <p className="texto-error">Error al cargar: {error.message}</p>}

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
                                        <div className="acciones">
                                            <button className="btn btn--secondary" onClick={() => abrirEdicion(proveedor)}>Editar</button>
                                            <button
                                                className="btn btn--danger"
                                                onClick={() => handleEliminar(proveedor.proveedor_id)}
                                                disabled={desactivar.isPending}
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
