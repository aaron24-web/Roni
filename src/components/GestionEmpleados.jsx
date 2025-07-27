// src/components/GestionEmpleados.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './PantallaVenta.css';

const estadoInicialEmpleado = {
    nombre_completo: '',
    usuario: '',
    contrasena_hash: '',
    rol_id: '',
    fecha_contratacion: new Date().toISOString().split('T')[0]
};

export default function GestionEmpleados() {
    const [empleados, setEmpleados] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [currentEmpleado, setCurrentEmpleado] = useState(estadoInicialEmpleado);
    const [isEditing, setIsEditing] = useState(false);

    const fetchEmpleadosYRoles = async () => {
        setLoading(true);
        const { data: empleadosData, error: empleadosError } = await supabase
            .from('empleados')
            .select('*, roles(nombre_rol)')
            .eq('activo', true) // Solo mostrar empleados activos
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
        setCurrentEmpleado(empleado);
        setShowModal(true);
    };

    const handleGuardar = async (e) => {
        e.preventDefault();
        
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
                const { error } = await supabase.rpc('crear_empleado_directo', {
                    nombre_completo_param: currentEmpleado.nombre_completo,
                    usuario_param: currentEmpleado.usuario,
                    contrasena_param: currentEmpleado.contrasena_hash,
                    rol_id_param: currentEmpleado.rol_id,
                    fecha_contratacion_param: currentEmpleado.fecha_contratacion
                });
                if (error) throw error;
                alert('Empleado creado exitosamente.');
            }
            setShowModal(false);
            fetchEmpleadosYRoles();
        } catch (error) {
            alert(`Error: ${error.message}`);
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
                            <label>Nombre de Usuario:</label>
                            <input type="text" value={currentEmpleado.usuario} onChange={(e) => setCurrentEmpleado({...currentEmpleado, usuario: e.target.value})} required className="pos-input" />
                            <label>Contraseña:</label>
                            <input type="password" value={currentEmpleado.contrasena_hash} onChange={(e) => setCurrentEmpleado({...currentEmpleado, contrasena_hash: e.target.value})} required={!isEditing} disabled={isEditing} className="pos-input" />
                            <label>Fecha de Contratación:</label>
                            <input type="date" value={new Date(currentEmpleado.fecha_contratacion).toISOString().split('T')[0]} onChange={(e) => setCurrentEmpleado({...currentEmpleado, fecha_contratacion: e.target.value})} required className="pos-input" />
                            <label>Rol:</label>
                            <select value={currentEmpleado.rol_id} onChange={(e) => setCurrentEmpleado({...currentEmpleado, rol_id: e.target.value})} required className="pos-input">
                                {roles.map(rol => <option key={rol.rol_id} value={rol.rol_id}>{rol.nombre_rol}</option>)}
                            </select>
                            <div className="footer">
                                <button type="button" className="pos-button" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="checkout-btn">Guardar</button>
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
                <table className="sales-table">
                    <thead>
                        <tr><th>Nombre Completo</th><th>Usuario</th><th>Rol</th><th>Fecha Contratación</th><th>Acciones</th></tr>
                    </thead>
                    <tbody>
                        {empleados.map(emp => (
                            <tr key={emp.empleado_id}>
                                <td>{emp.nombre_completo}</td>
                                <td>{emp.usuario}</td>
                                <td>{emp.roles.nombre_rol}</td>
                                <td>{new Date(emp.fecha_contratacion).toLocaleDateString()}</td>
                                <td>
                                    <button onClick={() => openModalEditar(emp)}>Editar</button>
                                    <button onClick={() => handleEliminar(emp.empleado_id)} style={{marginLeft: '10px', backgroundColor: '#dc3545', color: 'white'}}>Eliminar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}