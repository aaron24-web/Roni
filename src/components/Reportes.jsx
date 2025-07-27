// src/components/Reportes.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import DetalleCorteModal from './DetalleCorteModal';
import './PantallaVenta.css';

export default function Reportes({ perfil }) {
    const [cortes, setCortes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [corteSeleccionado, setCorteSeleccionado] = useState(null);

    useEffect(() => {
        const fetchHistorial = async () => {
            setLoading(true);
            const { data, error } = await supabase.rpc('obtener_historial_cortes');
            
            if (error) {
                console.error("Error al cargar el historial de cortes:", error);
            } else {
                setCortes(data || []);
            }
            setLoading(false);
        };

        fetchHistorial();
    }, []);

    const handleVerDetalles = (corte) => {
        setCorteSeleccionado(corte);
        setShowModal(true);
    };

    if (loading) {
        return <div style={{padding: '20px'}}>Cargando historial de cortes...</div>;
    }

    return (
        <div className="pos-container">
            {showModal && <DetalleCorteModal corte={corteSeleccionado} perfil={perfil} onClose={() => setShowModal(false)} />}

            <div className="search-bar">
                <h2>Historial de Cortes de Caja</h2>
            </div>
            <div className="table-container">
                <table className="sales-table">
                    <thead>
                        <tr>
                            <th>ID Corte</th>
                            <th>Fecha de Cierre</th>
                            <th>Empleado</th>
                            <th>Fondo Inicial</th>
                            <th>Efectivo Contado</th>
                            <th>Diferencia</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cortes.map(corte => (
                            <tr key={corte.corte_id}>
                                <td>{corte.corte_id}</td>
                                <td>{new Date(corte.fecha_cierre).toLocaleString()}</td>
                                <td>{corte.nombre_empleado}</td>
                                <td>${parseFloat(corte.saldo_inicial).toFixed(2)}</td>
                                <td>${parseFloat(corte.saldo_final_real).toFixed(2)}</td>
                                <td style={{color: parseFloat(corte.diferencia) < 0 ? 'red' : (parseFloat(corte.diferencia) > 0 ? 'blue' : 'green')}}>
                                    ${parseFloat(corte.diferencia).toFixed(2)}
                                </td>
                                <td>
                                    <button onClick={() => handleVerDetalles(corte)}>Ver Detalles</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}