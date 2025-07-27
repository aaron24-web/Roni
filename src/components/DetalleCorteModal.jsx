// src/components/DetalleCorteModal.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './PantallaVenta.css';

export default function DetalleCorteModal({ corte, perfil, onClose }) {
    const [ventas, setVentas] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDetalles = async () => {
        setLoading(true);
        const { data, error } = await supabase.rpc('obtener_ventas_por_corte', {
            corte_id_param: corte.corte_id
        });
        if (error) {
            console.error("Error al cargar detalles del corte:", error);
        } else {
            setVentas(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchDetalles();
    }, [corte.corte_id]);

    const handleCancelarVenta = async (ventaId) => {
        const motivo = prompt("Por favor, ingresa el motivo de la cancelación:");
        if (motivo) {
            try {
                // --- CORRECCIÓN AQUÍ ---
                // Ahora llamamos a la función pasándole un solo objeto 'args'
                const { error } = await supabase.rpc('cancelar_venta_completa', {
                    args: {
                        venta_id_param: ventaId,
                        supervisor_id_param: perfil.empleado_id,
                        motivo_param: motivo
                    }
                });

                if (error) throw error;
                alert("Venta cancelada exitosamente. El inventario ha sido restaurado.");
                fetchDetalles();
            } catch (err) {
                alert(`Error al cancelar la venta: ${err.message}`);
            }
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{width: '80%', maxWidth: '900px'}}>
                <h2>Detalles del Corte #{corte.corte_id}</h2>
                <p><strong>Cierre:</strong> {new Date(corte.fecha_cierre).toLocaleString()}</p>
                <p><strong>Empleado:</strong> {corte.nombre_empleado}</p>
                <hr />
                <h4>Ventas Realizadas en este Turno</h4>
                {loading ? <p>Cargando ventas...</p> : (
                    <div className="table-container" style={{maxHeight: '50vh'}}>
                        <table className="sales-table">
                            <thead>
                                <tr>
                                    <th>ID Venta</th>
                                    <th>Fecha y Hora</th>
                                    <th>Cliente</th>
                                    <th>Total</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ventas.map(venta => (
                                    <tr key={venta.venta_id}>
                                        <td>{venta.venta_id}</td>
                                        <td>{new Date(venta.fecha_hora).toLocaleString()}</td>
                                        <td>{venta.nombre_cliente}</td>
                                        <td>${parseFloat(venta.total).toFixed(2)}</td>
                                        <td>
                                            <button 
                                                onClick={() => handleCancelarVenta(venta.venta_id)} 
                                                style={{backgroundColor: '#dc3545', color: 'white'}}>
                                                Cancelar Venta
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="footer">
                    <button type="button" className="pos-button" onClick={onClose}>Cerrar</button>
                </div>
            </div>
        </div>
    );
}