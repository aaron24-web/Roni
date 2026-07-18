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
                alert('Empleado actualizado exitosamente.')
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
                alert('Empleado creado exitosamente. Ya puede iniciar sesión con su correo.')
            }
            setModalAbierto(false)
        } catch (err) {
            alert(`Error: ${(err as Error).message}`)
        }
    }

    const handleEliminar = async (empleadoId: number) => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar a este empleado?')) return
        try {
            await desactivar.mutateAsync(empleadoId)
            alert('Empleado desactivado exitosamente.')
        } catch (err) {
            alert(`Error: ${(err as Error).message}`)
        }
    }

    return (
        <div className="pos-container">
            {modalAbierto && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>{editando ? 'Editar Empleado' : 'Nuevo Empleado'}</h2>
                        <form onSubmit={handleGuardar} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                <h2>Gestión de Empleados</h2>
                <button className="pos-button" onClick={abrirNuevo}>Añadir Nuevo Empleado</button>
            </div>

            <div className="table-container">
                {isPending && <p>Cargando empleados...</p>}
                {error && <p style={{ color: '#dc3545' }}>Error al cargar: {error.message}</p>}

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
                                    <td>{empleado.email || <span style={{ color: '#999' }}>— sin acceso —</span>}</td>
                                    <td>{empleado.roles?.nombre_rol}</td>
                                    <td>{empleado.fecha_contratacion ? new Date(empleado.fecha_contratacion).toLocaleDateString() : '—'}</td>
                                    <td>
                                        <button onClick={() => abrirEdicion(empleado)}>Editar</button>
                                        <button
                                            onClick={() => handleEliminar(empleado.empleado_id)}
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
