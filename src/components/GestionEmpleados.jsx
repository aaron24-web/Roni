// src/components/GestionEmpleados.jsx

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './PantallaVenta.css';

const estadoInicialEmpleado = {
    nombre_completo: '',
    email: '',
    password: '',
    usuario: '',
    rol_id: '',
    fecha_contratacion: new Date().toISOString().split('T')[0]
};

export default function GestionEmpleados() {
    const [empleados, setEmpleados] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [currentEmpleado, setCurrentEmpleado] = useState(estadoInicialEmpleado);
    const [isEditing, setIsEditing] = useState(false);

    const fetchEmpleadosYRoles = async () => {
        setLoading(true);
        const { data: empleadosData, error: empleadosError } = await supabase
            .from('empleados')
            .select('*, roles(nombre_rol)')
            .eq('activo', true)
            .order('nombre_completo');

        const { data: rolesData, error: rolesError } = await supabase
            .from('roles')
            .select('*');

        if (empleadosError || rolesError) {
            console.error("Error al cargar datos:", empleadosError || rolesError);
        } else {
            setEmpleados(empleadosData);
            setRoles(rolesData);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchEmpleadosYRoles();
    }, []);

    const openModalNuevo = () => {
        setIsEditing(false);
        setCurrentEmpleado({
            ...estadoInicialEmpleado,
            rol_id: roles.length > 0 ? roles[0].rol_id : ''
        });
        setShowModal(true);
    };

    const openModalEditar = (empleado) => {
        setIsEditing(true);
        setCurrentEmpleado({ ...empleado, password: '' });
        setShowModal(true);
    };

    const handleGuardar = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (isEditing) {
                const { error } = await supabase.rpc('actualizar_empleado_directo', {
                    empleado_id_param: currentEmpleado.empleado_id,
                    nombre_completo_param: currentEmpleado.nombre_completo,
                    usuario_param: currentEmpleado.usuario,
                    rol_id_param: currentEmpleado.rol_id,
                    fecha_contratacion_param: currentEmpleado.fecha_contratacion
                });
                if (error) throw error;
                alert('Empleado actualizado exitosamente.');
            } else {
                if (currentEmpleado.password.length < 6) {
                    throw new Error('La contraseña debe tener al menos 6 caracteres.');
                }
                // Crea el usuario de Supabase Auth + el empleado vinculado.
                const { error } = await supabase.rpc('crear_empleado_con_auth', {
                    p_email: currentEmpleado.email.trim(),
                    p_password: currentEmpleado.password,
                    p_nombre: currentEmpleado.nombre_completo,
                    p_rol_id: currentEmpleado.rol_id,
                    p_fecha_contratacion: currentEmpleado.fecha_contratacion
                });
                if (error) throw error;
                alert('Empleado creado exitosamente. Ya puede iniciar sesión con su correo.');
            }
            setShowModal(false);
            fetchEmpleadosYRoles();
        } catch (error) {
            const msg = error.message?.includes('duplicate') || error.message?.includes('unique')
                ? 'Ya existe un empleado con ese correo.'
                : error.message;
            alert(`Error: ${msg}`);
        } finally {
            setSaving(false);
        }
    };

    const handleEliminar = async (empleadoId) => {
        if (window.confirm("¿Estás seguro de que quieres eliminar a este empleado?")) {
            try {
                const { error } = await supabase.rpc('desactivar_empleado_directo', {
                    empleado_id_param: empleadoId
                });
                if (error) throw error;
                alert("Empleado desactivado exitosamente.");
                fetchEmpleadosYRoles();
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        }
    };

    return (
        <div className="pos-container">
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>{isEditing ? 'Editar Empleado' : 'Nuevo Empleado'}</h2>
                        <form onSubmit={handleGuardar} style={{display: 'flex', flexDirection:'column', gap:'10px'}}>
                            <label>Nombre Completo:</label>
                            <input type="text" value={currentEmpleado.nombre_completo} onChange={(e) => setCurrentEmpleado({...currentEmpleado, nombre_completo: e.target.value})} required className="pos-input" />

                            <label>Correo electrónico:</label>
                            <input
                                type="email"
                                value={currentEmpleado.email || ''}
                                onChange={(e) => setCurrentEmpleado({...currentEmpleado, email: e.target.value})}
                                required
                                disabled={isEditing}
                                title={isEditing ? 'El correo no se puede cambiar aquí' : ''}
                                className="pos-input"
                            />

                            {!isEditing && (
                                <>
                                    <label>Contraseña (mínimo 6 caracteres):</label>
                                    <input type="password" value={currentEmpleado.password} onChange={(e) => setCurrentEmpleado({...currentEmpleado, password: e.target.value})} required minLength={6} className="pos-input" />
                                </>
                            )}

                            <label>Fecha de Contratación:</label>
                            <input type="date" value={new Date(currentEmpleado.fecha_contratacion).toISOString().split('T')[0]} onChange={(e) => setCurrentEmpleado({...currentEmpleado, fecha_contratacion: e.target.value})} required className="pos-input" />

                            <label>Rol:</label>
                            <select value={currentEmpleado.rol_id} onChange={(e) => setCurrentEmpleado({...currentEmpleado, rol_id: e.target.value})} required className="pos-input">
                                {roles.map(rol => <option key={rol.rol_id} value={rol.rol_id}>{rol.nombre_rol}</option>)}
                            </select>

                            <div className="footer">
                                <button type="button" className="pos-button" onClick={() => setShowModal(false)} disabled={saving}>Cancelar</button>
                                <button type="submit" className="checkout-btn" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="search-bar" style={{justifyContent: 'space-between', alignItems: 'center'}}>
                <h2>Gestión de Empleados</h2>
                <button className="pos-button" onClick={openModalNuevo}>Añadir Nuevo Empleado</button>
            </div>
            <div className="table-container">
                {loading ? <p>Cargando...</p> : (
                <table className="sales-table">
                    <thead>
                        <tr><th>Nombre Completo</th><th>Correo</th><th>Rol</th><th>Fecha Contratación</th><th>Acciones</th></tr>
                    </thead>
                    <tbody>
                        {empleados.map(emp => (
                            <tr key={emp.empleado_id}>
                                <td>{emp.nombre_completo}</td>
                                <td>{emp.email || <span style={{color:'#999'}}>— sin acceso —</span>}</td>
                                <td>{emp.roles.nombre_rol}</td>
                                <td>{emp.fecha_contratacion ? new Date(emp.fecha_contratacion).toLocaleDateString() : '—'}</td>
                                <td>
                                    <button onClick={() => openModalEditar(emp)}>Editar</button>
                                    <button onClick={() => handleEliminar(emp.empleado_id)} style={{marginLeft: '10px', backgroundColor: '#dc3545', color: 'white'}}>Eliminar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                )}
            </div>
        </div>
    );
}
