// Pantalla de Empleados. Ruta exclusiva de administrador.
//
// Al crear un empleado se le genera su usuario de Supabase Auth, de modo que
// puede iniciar sesión con su correo desde el primer momento.

import { useState, type FormEvent } from 'react'
import {
    useEmpleados,
    useRoles,
    useCrearEmpleado,
    useActualizarEmpleado,
    useDesactivarEmpleado,
    type EmpleadoConRol,
} from './useEmpleados'
import { useToast } from '../../shared/components/feedback/toast-context'
import { useConfirm } from '../../shared/components/feedback/dialog-context'
import Modal, { BotonCancelarModal } from '../../shared/components/Modal'
import '../../shared/styles/pos.css'

const hoy = () => new Date().toISOString().split('T')[0]

interface Formulario {
    empleadoId: number | null
    nombre: string
    email: string
    password: string
    usuario: string
    rolId: string
    fechaContratacion: string
}

const formularioVacio = (rolPorDefecto = ''): Formulario => ({
    empleadoId: null,
    nombre: '',
    email: '',
    password: '',
    usuario: '',
    rolId: rolPorDefecto,
    fechaContratacion: hoy(),
})

export default function EmpleadosPage() {
    const { data: empleados = [], isPending, error } = useEmpleados()
    const { data: roles = [] } = useRoles()
    const crear = useCrearEmpleado()
    const actualizar = useActualizarEmpleado()
    const desactivar = useDesactivarEmpleado()
    const toast = useToast()
    const confirmar = useConfirm()

    const [modalAbierto, setModalAbierto] = useState(false)
    const [formulario, setFormulario] = useState<Formulario>(formularioVacio)

    const editando = formulario.empleadoId !== null
    const guardando = crear.isPending || actualizar.isPending

    const abrirNuevo = () => {
        setFormulario(formularioVacio(roles[0] ? String(roles[0].rol_id) : ''))
        setModalAbierto(true)
    }

    const abrirEdicion = (empleado: EmpleadoConRol) => {
        setFormulario({
            empleadoId: empleado.empleado_id,
            nombre: empleado.nombre_completo,
            email: empleado.email ?? '',
            password: '',
            usuario: empleado.usuario,
            rolId: String(empleado.rol_id),
            fechaContratacion: empleado.fecha_contratacion ?? hoy(),
        })
        setModalAbierto(true)
    }

    const handleGuardar = async (e: FormEvent) => {
        e.preventDefault()
        try {
            if (editando && formulario.empleadoId !== null) {
                await actualizar.mutateAsync({
                    empleadoId: formulario.empleadoId,
                    nombre: formulario.nombre,
                    usuario: formulario.usuario,
                    rolId: Number(formulario.rolId),
                    fechaContratacion: formulario.fechaContratacion,
                })
                toast.success('Empleado actualizado exitosamente.')
            } else {
                if (formulario.password.length < 6) {
                    throw new Error('La contraseña debe tener al menos 6 caracteres.')
                }
                await crear.mutateAsync({
                    email: formulario.email,
                    password: formulario.password,
                    nombre: formulario.nombre,
                    rolId: Number(formulario.rolId),
                    fechaContratacion: formulario.fechaContratacion,
                })
                toast.success('Empleado creado exitosamente. Ya puede iniciar sesión con su correo.')
            }
            setModalAbierto(false)
        } catch (err) {
            toast.error(`Error: ${(err as Error).message}`)
        }
    }

    const handleEliminar = async (empleadoId: number) => {
        const confirmado = await confirmar({
            titulo: 'Eliminar empleado',
            mensaje: '¿Estás seguro de que quieres eliminar a este empleado?',
            textoConfirmar: 'Eliminar',
            peligro: true,
        })
        if (!confirmado) return
        try {
            await desactivar.mutateAsync(empleadoId)
            toast.success('Empleado desactivado exitosamente.')
        } catch (err) {
            toast.error(`Error: ${(err as Error).message}`)
        }
    }

    return (
        <div className="pos-container">
            {modalAbierto && (
                <Modal
                    titulo={editando ? 'Editar Empleado' : 'Nuevo Empleado'}
                    onClose={() => setModalAbierto(false)}
                    confirmarDescarte
                >
                    <form onSubmit={handleGuardar} className="form-vertical">
                            <label>Nombre Completo:</label>
                            <input
                                type="text"
                                value={formulario.nombre}
                                onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })}
                                required
                                className="pos-input"
                            />

                            <label>Correo electrónico:</label>
                            <input
                                type="email"
                                value={formulario.email}
                                onChange={(e) => setFormulario({ ...formulario, email: e.target.value })}
                                required
                                disabled={editando}
                                title={editando ? 'El correo no se puede cambiar aquí' : ''}
                                className="pos-input"
                            />

                            {!editando && (
                                <>
                                    <label>Contraseña (mínimo 6 caracteres):</label>
                                    <input
                                        type="password"
                                        value={formulario.password}
                                        onChange={(e) => setFormulario({ ...formulario, password: e.target.value })}
                                        required
                                        minLength={6}
                                        className="pos-input"
                                    />
                                </>
                            )}

                            <label>Fecha de Contratación:</label>
                            <input
                                type="date"
                                value={formulario.fechaContratacion}
                                onChange={(e) => setFormulario({ ...formulario, fechaContratacion: e.target.value })}
                                required
                                className="pos-input"
                            />

                            <label>Rol:</label>
                            <select
                                value={formulario.rolId}
                                onChange={(e) => setFormulario({ ...formulario, rolId: e.target.value })}
                                required
                                className="pos-input"
                            >
                                {roles.map(rol => (
                                    <option key={rol.rol_id} value={rol.rol_id}>{rol.nombre_rol}</option>
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
                <h2>Gestión de Empleados</h2>
                <button className="btn btn--primary" onClick={abrirNuevo}>+ Nuevo empleado</button>
            </div>

            <div className="table-container">
                {isPending && <p>Cargando empleados...</p>}
                {error && <p className="texto-error">Error al cargar: {error.message}</p>}

                {!isPending && !error && (
                    <table className="sales-table">
                        <thead>
                            <tr><th>Nombre Completo</th><th>Correo</th><th>Rol</th><th>Fecha Contratación</th><th>Acciones</th></tr>
                        </thead>
                        <tbody>
                            {empleados.length === 0 ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center' }}>No hay empleados activos.</td></tr>
                            ) : empleados.map(empleado => (
                                <tr key={empleado.empleado_id}>
                                    <td>{empleado.nombre_completo}</td>
                                    <td>{empleado.email || <span style={{ color: 'var(--color-text-muted)' }}>— sin acceso —</span>}</td>
                                    <td>{empleado.roles?.nombre_rol}</td>
                                    <td>{empleado.fecha_contratacion ? new Date(empleado.fecha_contratacion).toLocaleDateString() : '—'}</td>
                                    <td>
                                        <div className="acciones">
                                            <button className="btn btn--secondary" onClick={() => abrirEdicion(empleado)}>Editar</button>
                                            <button
                                                className="btn btn--danger"
                                                onClick={() => handleEliminar(empleado.empleado_id)}
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
