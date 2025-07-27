// src/components/GestionProveedores.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './PantallaVenta.css';

const estadoInicialProveedor = {
    proveedor_id: null,
    nombre_empresa: '',
    nombre_contacto: '',
    rfc: '',
    telefono: '',
    email: '',
    direccion: ''
};

export default function GestionProveedores() {
    const [proveedores, setProveedores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [currentProveedor, setCurrentProveedor] = useState(estadoInicialProveedor);
    const [isEditing, setIsEditing] = useState(false);

    const fetchProveedores = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('proveedores')
            .select('*')
            .eq('activo', true)
            .order('nombre_empresa');
        
        if (error) {
            console.error("Error al cargar proveedores:", error);
        } else {
            setProveedores(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchProveedores();
    }, []);

    const openModalNuevo = () => {
        setIsEditing(false);
        setCurrentProveedor(estadoInicialProveedor);
        setShowModal(true);
    };

    const openModalEditar = (proveedor) => {
        setIsEditing(true);
        setCurrentProveedor(proveedor);
        setShowModal(true);
    };

    const handleGuardar = async (e) => {
        e.preventDefault();
        const { proveedor_id, ...proveedorData } = currentProveedor;
        let error;

        if (isEditing) {
            ({ error } = await supabase.from('proveedores').update(proveedorData).eq('proveedor_id', proveedor_id));
        } else {
            ({ error } = await supabase.from('proveedores').insert([proveedorData]));
        }

        if (error) {
            alert(`Error: ${error.message}`);
        } else {
            alert(`Proveedor ${isEditing ? 'actualizado' : 'creado'} exitosamente.`);
            setShowModal(false);
            fetchProveedores();
        }
    };

    const handleEliminar = async (proveedorId) => {
        if (window.confirm("¿Estás seguro de que quieres eliminar este proveedor?")) {
            const { error } = await supabase.from('proveedores').update({ activo: false }).eq('proveedor_id', proveedorId);
            if (error) {
                alert(`Error al eliminar: ${error.message}`);
            } else {
                alert("Proveedor desactivado exitosamente.");
                fetchProveedores();
            }
        }
    };

    return (
        <div className="pos-container">
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>{isEditing ? 'Editar' : 'Nuevo'} Proveedor</h2>
                        <form onSubmit={handleGuardar} style={{display: 'flex', flexDirection:'column', gap:'10px'}}>
                            <label>Nombre de la Empresa:</label>
                            <input type="text" value={currentProveedor.nombre_empresa} onChange={(e) => setCurrentProveedor({...currentProveedor, nombre_empresa: e.target.value})} required className="pos-input" />
                            <label>Nombre de Contacto:</label>
                            <input type="text" value={currentProveedor.nombre_contacto || ''} onChange={(e) => setCurrentProveedor({...currentProveedor, nombre_contacto: e.target.value})} className="pos-input" />
                            <label>RFC:</label>
                            <input type="text" value={currentProveedor.rfc || ''} onChange={(e) => setCurrentProveedor({...currentProveedor, rfc: e.target.value})} className="pos-input" />
                            <label>Teléfono:</label>
                            <input type="tel" value={currentProveedor.telefono || ''} onChange={(e) => setCurrentProveedor({...currentProveedor, telefono: e.target.value})} className="pos-input" />
                            <label>Email:</label>
                            <input type="email" value={currentProveedor.email || ''} onChange={(e) => setCurrentProveedor({...currentProveedor, email: e.target.value})} className="pos-input" />
                            <label>Dirección:</label>
                            <textarea value={currentProveedor.direccion || ''} onChange={(e) => setCurrentProveedor({...currentProveedor, direccion: e.target.value})} className="pos-input" />
                            <div className="footer">
                                <button type="button" className="pos-button" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="checkout-btn">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="search-bar" style={{justifyContent: 'space-between', alignItems: 'center'}}>
                <h2>Gestión de Proveedores</h2>
                <button className="pos-button" onClick={openModalNuevo}>Añadir Nuevo Proveedor</button>
            </div>
            <div className="table-container">
                <table className="sales-table">
                    <thead>
                        <tr><th>Nombre Empresa</th><th>Contacto</th><th>Teléfono</th><th>Email</th><th>Acciones</th></tr>
                    </thead>
                    <tbody>
                        {proveedores.map(prov => (
                            <tr key={prov.proveedor_id}>
                                <td>{prov.nombre_empresa}</td>
                                <td>{prov.nombre_contacto || 'N/A'}</td>
                                <td>{prov.telefono || 'N/A'}</td>
                                <td>{prov.email || 'N/A'}</td>
                                <td>
                                    <button onClick={() => openModalEditar(prov)}>Editar</button>
                                    <button onClick={() => handleEliminar(prov.proveedor_id)} style={{marginLeft: '10px', backgroundColor: '#dc3545', color: 'white'}}>Eliminar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}