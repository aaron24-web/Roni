// Pantalla de Clientes. Ruta compartida (administrador y cajero).
//
// Nota: crear y editar clientes sigue restringido a administrador, igual que
// antes de la migración. La matriz de roles contempla Clientes como módulo
// compartido, así que si quieres que el cajero también pueda darlos de alta,
// basta con quitar la condición `esAdmin` de los botones.

import { useState, type FormEvent, type ChangeEvent } from 'react'
import {
    useClientes,
    useCrearCliente,
    useActualizarCliente,
    type Cliente,
    type DatosCliente,
} from './useClientes'
import EstadoCuentaModal from './EstadoCuentaModal'
import { useAuth } from '../../shared/context/auth-context'
import { useToast } from '../../shared/components/feedback/toast-context'
import Modal, { BotonCancelarModal } from '../../shared/components/Modal'
import '../../shared/styles/pos.css'

const FORMULARIO_VACIO: DatosCliente = {
    nombre: '',
    telefono: '',
    email: '',
    rfc: '',
    direccion: '',
    permite_credito: false,
    limite_credito: 0,
}

export default function ClientesPage() {
    const { esAdmin } = useAuth()
    const { data: clientes = [], isPending, error } = useClientes()
    const crear = useCrearCliente()
    const actualizar = useActualizarCliente()
    const toast = useToast()

    const [modalAbierto, setModalAbierto] = useState(false)
    const [editandoId, setEditandoId] = useState<number | null>(null)
    const [formulario, setFormulario] = useState<DatosCliente>(FORMULARIO_VACIO)
    const [clienteEstadoCuenta, setClienteEstadoCuenta] = useState<Cliente | null>(null)

    const editando = editandoId !== null
    const guardando = crear.isPending || actualizar.isPending

    const abrirNuevo = () => {
        setEditandoId(null)
        setFormulario(FORMULARIO_VACIO)
        setModalAbierto(true)
    }

    const abrirEdicion = (cliente: Cliente) => {
        const { cliente_id, fecha_registro: _fecha, activo: _activo, ...datos } = cliente
        setEditandoId(cliente_id)
        setFormulario(datos)
        setModalAbierto(true)
    }

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target
        const valorCampo = type === 'checkbox'
            ? (e.target as HTMLInputElement).checked
            : type === 'number' ? Number(value) : value
        setFormulario(prev => ({ ...prev, [name]: valorCampo }))
    }

    const handleGuardar = async (e: FormEvent) => {
        e.preventDefault()
        try {
            if (editando && editandoId !== null) {
                await actualizar.mutateAsync({ id: editandoId, datos: formulario })
                toast.success('Cliente actualizado.')
            } else {
                await crear.mutateAsync(formulario)
                toast.success('Cliente creado.')
            }
            setModalAbierto(false)
        } catch (err) {
            toast.error(`Error: ${(err as Error).message}`)
        }
    }

    return (
        <div className="pos-container">
            {modalAbierto && (
                <Modal
                    titulo={`${editando ? 'Editar' : 'Nuevo'} Cliente`}
                    onClose={() => setModalAbierto(false)}
                    confirmarDescarte
                >
                    <form onSubmit={handleGuardar} className="form-vertical">
                            <label>Nombre:</label>
                            <input type="text" name="nombre" value={formulario.nombre} onChange={handleChange} required className="pos-input" />
                            <label>Teléfono:</label>
                            <input type="tel" name="telefono" value={formulario.telefono ?? ''} onChange={handleChange} className="pos-input" />
                            <label>Email:</label>
                            <input type="email" name="email" value={formulario.email ?? ''} onChange={handleChange} className="pos-input" />
                            <label>RFC:</label>
                            <input type="text" name="rfc" value={formulario.rfc ?? ''} onChange={handleChange} className="pos-input" />
                            <label>Dirección:</label>
                            <textarea name="direccion" value={formulario.direccion ?? ''} onChange={handleChange} className="pos-input" />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <label htmlFor="permite_credito">Permite Crédito:</label>
                                <input
                                    type="checkbox"
                                    id="permite_credito"
                                    name="permite_credito"
                                    checked={formulario.permite_credito ?? false}
                                    onChange={handleChange}
                                />
                            </div>
                            <label>Límite de Crédito:</label>
                            <input
                                type="number"
                                step="0.01"
                                name="limite_credito"
                                value={formulario.limite_credito ?? 0}
                                onChange={handleChange}
                                required
                                className="pos-input"
                            />
                            <div className="footer">
                                <BotonCancelarModal disabled={guardando} />
                                <button type="submit" className="btn btn--primary" disabled={guardando}>
                                    {guardando ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                    </form>
                </Modal>
            )}

            {clienteEstadoCuenta && (
                <EstadoCuentaModal
                    cliente={clienteEstadoCuenta}
                    onClose={() => setClienteEstadoCuenta(null)}
                />
            )}

            <div className="search-bar" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Gestión de Clientes</h2>
                {esAdmin && <button className="btn btn--primary" onClick={abrirNuevo}>+ Nuevo cliente</button>}
            </div>

            <div className="table-container">
                {isPending && <p>Cargando clientes...</p>}
                {error && <p className="texto-error">Error al cargar: {error.message}</p>}

                {!isPending && !error && (
                    <table className="sales-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Teléfono</th>
                                <th>Email</th>
                                <th>Límite de Crédito</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clientes.length === 0 ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center' }}>No hay clientes registrados.</td></tr>
                            ) : clientes.map(cliente => (
                                <tr key={cliente.cliente_id}>
                                    <td>{cliente.nombre}</td>
                                    <td>{cliente.telefono || 'N/A'}</td>
                                    <td>{cliente.email || 'N/A'}</td>
                                    <td>${Number(cliente.limite_credito ?? 0).toFixed(2)}</td>
                                    <td>
                                        <div className="acciones">
                                            {esAdmin && <button className="btn btn--secondary" onClick={() => abrirEdicion(cliente)}>Editar</button>}
                                            <button className="btn btn--primary" onClick={() => setClienteEstadoCuenta(cliente)}>
                                                Estado de cuenta
                                            </button>
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
