// src/components/EstadoCuentaModal.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './PantallaVenta.css';

export default function EstadoCuentaModal({ cliente, perfil, onClose }) {
    const [movimientos, setMovimientos] = useState([]);
    const [saldoActual, setSaldoActual] = useState(0);
    const [loading, setLoading] = useState(true);
    const [montoAbono, setMontoAbono] = useState('');

    const fetchEstadoCuenta = async () => {
        setLoading(true);
        const { data, error } = await supabase.rpc('obtener_estado_cuenta', {
            cliente_id_param: cliente.cliente_id
        });

        if (error) {
            console.error("Error al obtener estado de cuenta:", error);
        } else {
            setMovimientos(data);
            if (data && data.length > 0) {
                setSaldoActual(data[0].saldo_nuevo);
            } else {
                setSaldoActual(0);
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchEstadoCuenta();
    }, [cliente.cliente_id]);

    const handleRegistrarAbono = async () => {
        const monto = parseFloat(montoAbono);
        if (!monto || monto <= 0) {
            alert("Por favor, ingresa un monto válido para el abono.");
            return;
        }

        try {
            const { error } = await supabase.rpc('registrar_abono_cliente', {
                cliente_id_param: cliente.cliente_id,
                monto_abono_param: monto,
                empleado_id_param: perfil.empleado_id
            });

            if (error) throw error;

            alert("¡Abono registrado exitosamente!");
            setMontoAbono('');
            fetchEstadoCuenta();
            
        } catch (error) {
            alert(`Error al registrar el abono: ${error.message}`);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{width: '80%', maxWidth: '800px'}}>
                <h2>Estado de Cuenta de: {cliente.nombre}</h2>
                <h3>Saldo Actual: <span style={{color: 'red'}}>${parseFloat(saldoActual).toFixed(2)}</span></h3>
                <hr />

                <h4>Registrar Abono</h4>
                <div style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
                    <input 
                        type="number" 
                        placeholder="Monto del abono" 
                        className="pos-input" 
                        value={montoAbono}
                        onChange={(e) => setMontoAbono(e.target.value)}
                    />
                    <button className="pos-button" onClick={handleRegistrarAbono}>
                        Registrar Abono
                    </button>
                </div>

                <h4>Historial de Movimientos</h4>
                {loading ? <p>Cargando historial...</p> : (
                    <div className="table-container" style={{maxHeight: '40vh'}}>
                        <table className="sales-table">
                            <thead>
                                <tr>
                                    <th>Fecha y Hora</th>
                                    <th>Tipo</th>
                                    <th>Monto</th>
                                    <th>Saldo Resultante</th>
                                </tr>
                            </thead>
                            <tbody>
                                {movimientos.map((mov, index) => (
                                    <tr key={index}>
                                        <td>{new Date(mov.fecha_hora).toLocaleString()}</td>
                                        <td style={{color: mov.tipo_movimiento === 'CARGO' ? 'red' : 'green'}}>{mov.tipo_movimiento}</td>
                                        <td>${parseFloat(mov.monto).toFixed(2)}</td>
                                        <td>${parseFloat(mov.saldo_nuevo).toFixed(2)}</td>
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