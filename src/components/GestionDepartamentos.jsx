// src/components/GestionDepartamentos.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './PantallaVenta.css'; // Reutilizamos estilos

export default function GestionDepartamentos() {
    const [departamentos, setDepartamentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [currentDept, setCurrentDept] = useState({ id: null, nombre: '', descripcion: '' });
    const [isEditing, setIsEditing] = useState(false);

    const fetchDepartamentos = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('departamentos').select('*').order('nombre');
        if (error) {
            console.error("Error al cargar departamentos:", error);
        } else {
            setDepartamentos(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchDepartamentos();
    }, []);

    const openModalNuevo = () => {
        setIsEditing(false);
        setCurrentDept({ id: null, nombre: '', descripcion: '' });
        setShowModal(true);
    };

    const openModalEditar = (dept) => {
        setIsEditing(true);
        setCurrentDept({ id: dept.departamento_id, nombre: dept.nombre, descripcion: dept.descripcion || '' });
        setShowModal(true);
    };

    const handleGuardar = async (e) => {
        e.preventDefault();
        let error;
        if (isEditing) {
            // Lógica para actualizar
            ({ error } = await supabase.from('departamentos').update({ nombre: currentDept.nombre, descripcion: currentDept.descripcion }).eq('departamento_id', currentDept.id));
        } else {
            // Lógica para crear
            ({ error } = await supabase.from('departamentos').insert([{ nombre: currentDept.nombre, descripcion: currentDept.descripcion }]));
        }

        if (error) {
            alert(`Error: ${error.message}`);
        } else {
            alert(`Departamento ${isEditing ? 'actualizado' : 'creado'} exitosamente.`);
            setShowModal(false);
            fetchDepartamentos();
        }
    };

    const handleEliminar = async (id) => {
        if (window.confirm("¿Estás seguro de que quieres eliminar este departamento?")) {
            const { error } = await supabase.from('departamentos').delete().eq('departamento_id', id);
            if (error) {
                alert(`Error al eliminar: ${error.message}. Asegúrate de que ningún producto esté usando este departamento.`);
            } else {
                alert("Departamento eliminado.");
                fetchDepartamentos();
            }
        }
    };

    return (
        <div className="pos-container">
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>{isEditing ? 'Editar' : 'Nuevo'} Departamento</h2>
                        <form onSubmit={handleGuardar} style={{display: 'flex', flexDirection:'column', gap:'10px'}}>
                            <label>Nombre:</label>
                            <input type="text" value={currentDept.nombre} onChange={(e) => setCurrentDept({...currentDept, nombre: e.target.value})} required className="pos-input" />
                            <label>Descripción:</label>
                            <textarea value={currentDept.descripcion} onChange={(e) => setCurrentDept({...currentDept, descripcion: e.target.value})} className="pos-input" />
                            <div className="footer">
                                <button type="button" className="pos-button" style={{backgroundColor: '#6c757d'}} onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="checkout-btn">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="search-bar">
                <h2>Gestión de Departamentos</h2>
                <button className="pos-button" onClick={openModalNuevo}>Añadir Nuevo Departamento</button>
            </div>
            <div className="table-container">
                <table className="sales-table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Descripción</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {departamentos.map(dept => (
                            <tr key={dept.departamento_id}>
                                <td>{dept.nombre}</td>
                                <td>{dept.descripcion}</td>
                                <td>
                                    <button onClick={() => openModalEditar(dept)}>Editar</button>
                                    <button onClick={() => handleEliminar(dept.departamento_id)} style={{marginLeft: '10px', backgroundColor: '#dc3545', color: 'white'}}>Eliminar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}