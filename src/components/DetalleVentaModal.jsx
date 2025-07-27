// src/components/DetalleVentaModal.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './PantallaVenta.css';

export default function DetalleVentaModal({ venta, onClose }) {
    const [detalles, setDetalles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetallesVenta = async () => {
            setLoading(true);
            const { data, error } = await supabase.rpc('obtener_detalle_venta', {
                venta_id_param: venta.venta_id
            });
            if (error) {
                console.error("Error al cargar el detalle de la venta:", error);
            } else {
                setDetalles(data);
            }
            setLoading(false);
        };

        fetchDetallesVenta();
    }, [venta.venta_id]);

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '600px' }}>
                <h2>Detalle de Venta #{venta.venta_id}</h2>
                <p><strong>Cliente:</strong> {venta.nombre_cliente}</p>
                <p><strong>Total:</strong> ${parseFloat(venta.total).toFixed(2)}</p>
                <hr />
                <h4>Productos Vendidos</h4>
                {loading ? <p>Cargando...</p> : (
                    <div className="table-container" style={{ maxHeight: '40vh' }}>
                        <table className="sales-table">
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th>Cantidad</th>
                                    <th>Precio Unit.</th>
                                    <th>Importe</th>
                                </tr>
                            </thead>
                            <tbody>
                                {detalles.map((item, index) => (
                                    <tr key={index}>
                                        <td>{item.descripcion}</td>
                                        <td>{item.cantidad}</td>
                                        <td>${parseFloat(item.precio_unitario).toFixed(2)}</td>
                                        <td>${parseFloat(item.importe_total).toFixed(2)}</td>
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