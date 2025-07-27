// src/components/GestionClientes.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import EstadoCuentaModal from './EstadoCuentaModal';
import './PantallaVenta.css';

const estadoInicialCliente = {
    cliente_id: null,
    nombre: '',
    telefono: '',
    email: '',
    rfc: '',
    direccion: '',
    permite_credito: false,
    limite_credito: 0
};

export default function GestionClientes({ perfil }) {
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [currentClient, setCurrentClient] = useState(estadoInicialCliente);
    const [isEditing, setIsEditing] = useState(false);
    const [showEstadoCuenta, setShowEstadoCuenta] = useState(false);

    const fetchClientes = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('clientes').select('*').order('nombre', { ascending: true });
        if (error) console.error("Error al cargar clientes:", error);
        else setClientes(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchClientes();
    }, []);

    const openModalNuevo = () => {
        setIsEditing(false);
        setCurrentClient(estadoInicialCliente);
        setShowModal(true);
    };

    const openModalEditar = (cliente) => {
        setIsEditing(true);
        setCurrentClient(cliente);
        setShowModal(true);
    };
    
    const handleOpenEstadoCuenta = (cliente) => {
        setCurrentClient(cliente);
        setShowEstadoCuenta(true);
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setCurrentClient({ ...currentClient, [name]: type === 'checkbox' ? checked : value });
    };

    const handleGuardar = async (e) => {
        e.preventDefault();
        const { cliente_id, ...clientData } = currentClient;
        let error;
        if (isEditing) {
            ({ error } = await supabase.from('clientes').update(clientData).eq('cliente_id', cliente_id));
        } else {
            ({ error } = await supabase.from('clientes').insert([clientData]));
        }
        if (error) alert(`Error: ${error.message}`);
        else {
            alert(`Cliente ${isEditing ? 'actualizado' : 'creado'} exitosamente.`);
            setShowModal(false);
            fetchClientes();
        }
    };

    if (loading) return <div>Cargando clientes...</div>;

    return (
        <div className="pos-container">
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>{isEditing ? 'Editar' : 'Nuevo'} Cliente</h2>
                        <form onSubmit={handleGuardar} style={{display: 'flex', flexDirection:'column', gap:'10px'}}>
                            <label>Nombre:</label>
                            <input type="text" name="nombre" value={currentClient.nombre} onChange={handleInputChange} required className="pos-input" />
                            <label>Teléfono:</label>
                            <input type="tel" name="telefono" value={currentClient.telefono || ''} onChange={handleInputChange} className="pos-input" />
                            <label>Email:</label>
                            <input type="email" name="email" value={currentClient.email || ''} onChange={handleInputChange} className="pos-input" />
                            <label>RFC:</label>
                            <input type="text" name="rfc" value={currentClient.rfc || ''} onChange={handleInputChange} className="pos-input" />
                            <label>Dirección:</label>
                            <textarea name="direccion" value={currentClient.direccion || ''} onChange={handleInputChange} className="pos-input" />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <label htmlFor="permite_credito">Permite Crédito:</label>
                                <input type="checkbox" id="permite_credito" name="permite_credito" checked={currentClient.permite_credito} onChange={handleInputChange} />
                            </div>
                            <label>Límite de Crédito:</label>
                            <input type="number" step="0.01" name="limite_credito" value={currentClient.limite_credito} onChange={handleInputChange} required className="pos-input" />
                            <div className="footer">
                                <button type="button" className="pos-button" style={{backgroundColor: '#6c757d'}} onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="checkout-btn">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showEstadoCuenta && <EstadoCuentaModal cliente={currentClient} perfil={perfil} onClose={() => setShowEstadoCuenta(false)} />}

            <div className="search-bar" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Gestión de Clientes</h2>
                {perfil?.nombre_rol?.toLowerCase() === 'administrador' && (
                    <button className="pos-button" onClick={openModalNuevo}>Añadir Nuevo Cliente</button>
                )}
            </div>
            <div className="table-container">
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
                        {clientes.map(cliente => (
                            <tr key={cliente.cliente_id}>
                                <td>{cliente.nombre}</td>
                                <td>{cliente.telefono || 'N/A'}</td>
                                <td>{cliente.email || 'N/A'}</td>
                                <td>${parseFloat(cliente.limite_credito).toFixed(2)}</td>
                                <td>
                                    {perfil?.nombre_rol?.toLowerCase() === 'administrador' && (
                                        <button onClick={() => openModalEditar(cliente)}>Editar</button>
                                    )}
                                    <button onClick={() => handleOpenEstadoCuenta(cliente)} style={{marginLeft: '10px'}}>Estado de Cuenta</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}