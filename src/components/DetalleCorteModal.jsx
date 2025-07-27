// src/components/DetalleCorteModal.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import DetalleVentaModal from './DetalleVentaModal';
import './PantallaVenta.css';

export default function DetalleCorteModal({ corte, perfil, onClose }) {
    const [ventas, setVentas] = useState([]);
    const [ventasPorDepto, setVentasPorDepto] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showVentaModal, setShowVentaModal] = useState(false);
    const [ventaSeleccionada, setVentaSeleccionada] = useState(null);

    useEffect(() => {
        const fetchDetalles = async () => {
            setLoading(true);
            
            // Obtenemos la lista de ventas
            const { data: ventasData, error: ventasError } = await supabase.rpc('obtener_ventas_por_corte', {
                corte_id_param: corte.corte_id
            });
            if (ventasError) console.error("Error al cargar detalles del corte:", ventasError);
            else setVentas(ventasData || []);

            // Obtenemos el resumen por departamento
            const { data: deptoData, error: deptoError } = await supabase.rpc('obtener_ventas_por_depto', {
                corte_id_param: corte.corte_id
            });
            if (deptoError) console.error("Error al cargar ventas por depto:", deptoError);
            else setVentasPorDepto(deptoData || []);
            
            setLoading(false);
        };

        fetchDetalles();
    }, [corte.corte_id]);

    const handleCancelarVenta = async (ventaId) => {
        const motivo = prompt("Por favor, ingresa el motivo de la cancelación:");
        if (motivo) {
            try {
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

    const handleVerDetalleVenta = (venta) => {
        setVentaSeleccionada(venta);
        setShowVentaModal(true);
    };

    return (
        <div className="modal-overlay">
            {showVentaModal && <DetalleVentaModal venta={ventaSeleccionada} onClose={() => setShowVentaModal(false)} />}

            <div className="modal-content" style={{width: '80%', maxWidth: '900px'}}>
                <h2>Detalles del Corte #{corte.corte_id}</h2>
                <p><strong>Cierre:</strong> {new Date(corte.fecha_cierre).toLocaleString()}</p>
                <p><strong>Empleado:</strong> {corte.nombre_empleado}</p>
                <hr />

                <h4>Ventas por Departamento</h4>
                {loading ? <p>Calculando...</p> : (
                    <ul style={{paddingLeft: '20px', listStyle: 'square'}}>
                        {ventasPorDepto.map((depto, index) => (
                            <li key={index} style={{display: 'flex', justifyContent: 'space-between', padding: '5px 0'}}>
                                <span>{depto.departamento_nombre}</span>
                                <strong>${parseFloat(depto.total_vendido).toFixed(2)}</strong>
                            </li>
                        ))}
                    </ul>
                )}
                <hr />

                <h4>Ventas Realizadas en este Turno</h4>
                {loading ? <p>Cargando ventas...</p> : (
                    <div className="table-container" style={{maxHeight: '40vh'}}>
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
                                        <td style={{display: 'flex', gap: '5px'}}>
                                            <button onClick={() => handleVerDetalleVenta(venta)}>Ver Ticket</button>
                                            {perfil?.nombre_rol?.toLowerCase() === 'administrador' && (
                                                <button 
                                                    onClick={() => handleCancelarVenta(venta.venta_id)} 
                                                    style={{backgroundColor: '#dc3545', color: 'white'}}>
                                                    Cancelar Venta
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="footer" style={{marginTop: '20px'}}>
                    <button type="button" className="pos-button" onClick={onClose}>Cerrar</button>
                </div>
            </div>
        </div>
    );
}