// src/components/CorteCaja.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './PantallaVenta.css';

// El componente ahora recibe onCajaStateChange para notificar a App.jsx
export default function CorteCaja({ perfil, corteActivo, onCajaStateChange }) {
    const [fondoInicial, setFondoInicial] = useState('');
    const [loading, setLoading] = useState(false);
    const [resumen, setResumen] = useState(null);
    const [showCierreModal, setShowCierreModal] = useState(false);
    const [efectivoEnCaja, setEfectivoEnCaja] = useState('');
    const [loadingResumen, setLoadingResumen] = useState(true);

    useEffect(() => {
        if (corteActivo) {
            setLoadingResumen(true);
            const fetchResumen = async () => {
                const { data, error } = await supabase.rpc('obtener_resumen_corte', {
                    corte_id_param: corteActivo.corte_id
                });

                if (error) {
                    console.error("Error al obtener resumen de corte:", error);
                } else if (data && data.length > 0) {
                    setResumen(data[0]);
                }
                setLoadingResumen(false);
            };
            fetchResumen();
        }
    }, [corteActivo]);

    const handleAbrirCaja = async () => {
        const montoInicial = parseFloat(fondoInicial);
        if (isNaN(montoInicial) || montoInicial < 0) {
            alert("Por favor, ingresa un fondo inicial válido.");
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('abrir_caja', {
                empleado_id_param: perfil.empleado_id,
                saldo_inicial_param: montoInicial
            });
            if (error) throw error;
            alert("Caja abierta exitosamente. ¡Listo para vender!");
            if(data && data.length > 0) {
                onCajaStateChange(data[0]); // Notificamos a App.jsx que la caja se abrió
            }
        } catch (error) {
            alert(`Error al abrir la caja: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCerrarCaja = async () => {
        const efectivoReal = parseFloat(efectivoEnCaja);
        if (isNaN(efectivoReal) || efectivoReal < 0) {
            alert("Por favor, ingresa un monto de efectivo válido.");
            return;
        }

        if (!window.confirm("¿Estás seguro de que quieres cerrar el turno? Esta acción no se puede deshacer.")) {
            return;
        }

        try {
            const { error } = await supabase.rpc('cerrar_caja', {
                corte_id_param: corteActivo.corte_id,
                saldo_final_real_param: efectivoReal,
                resumen: resumen
            });

            if (error) throw error;

            alert("¡Turno cerrado exitosamente!");
            setShowCierreModal(false);
            onCajaStateChange(null); // Notificamos a App.jsx que la caja se cerró

        } catch (error) {
            alert(`Error al cerrar la caja: ${error.message}`);
        }
    };

    if (!corteActivo) {
        return (
            <div className="pos-container" style={{ alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 150px)' }}>
                <div style={{ padding: '40px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', textAlign: 'center' }}>
                    <h2>Abrir Caja</h2>
                    <p>No tienes una sesión de caja activa. Ingresa el fondo inicial para comenzar a vender.</p>
                    <label htmlFor="fondoInicial" style={{fontWeight: 'bold'}}>Fondo de Caja Inicial:</label>
                    <input
                        id="fondoInicial"
                        type="number"
                        className="pos-input"
                        style={{width: '200px', margin: '20px auto', display: 'block'}}
                        value={fondoInicial}
                        onChange={(e) => setFondoInicial(e.target.value)}
                        placeholder="0.00"
                    />
                    <button className="checkout-btn" onClick={handleAbrirCaja} disabled={loading}>
                        {loading ? 'Iniciando...' : 'Iniciar Turno'}
                    </button>
                </div>
            </div>
        );
    }

    const saldoFinalTeorico = (resumen?.total_ventas_efectivo || 0) + parseFloat(corteActivo.saldo_inicial_efectivo);
    const diferencia = parseFloat(efectivoEnCaja || 0) - saldoFinalTeorico;

    return (
        <div className="pos-container">
            {showCierreModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Confirmar Cierre de Caja</h2>
                        <p><strong>Total en Efectivo (según sistema):</strong> ${saldoFinalTeorico.toFixed(2)}</p>
                        <p style={{fontSize: '0.9em', color: '#6c757d'}}>Este total se calcula con: (Fondo Inicial + Ventas en Efectivo)</p>
                        <hr />
                        <label htmlFor="efectivoReal" style={{fontWeight: 'bold', display: 'block', marginBottom: '10px'}}>Ingresa el efectivo real contado en caja:</label>
                        <input
                            id="efectivoReal"
                            type="number"
                            className="pos-input"
                            value={efectivoEnCaja}
                            onChange={(e) => setEfectivoEnCaja(e.target.value)}
                            placeholder="0.00"
                        />
                        {efectivoEnCaja && (
                            <div style={{marginTop: '15px', fontWeight: 'bold', fontSize: '1.2em'}}>
                                {diferencia === 0 && <p style={{color: 'green'}}>¡Cuadre perfecto!</p>}
                                {diferencia > 0 && <p style={{color: 'blue'}}>Sobrante: ${diferencia.toFixed(2)}</p>}
                                {diferencia < 0 && <p style={{color: 'red'}}>Faltante: ${Math.abs(diferencia).toFixed(2)}</p>}
                            </div>
                        )}
                        <div className="footer" style={{marginTop: '20px'}}>
                             <button type="button" className="pos-button" style={{backgroundColor: '#6c757d'}} onClick={() => setShowCierreModal(false)}>Cancelar</button>
                             <button className="checkout-btn" onClick={handleCerrarCaja}>Confirmar y Cerrar Turno</button>
                        </div>
                    </div>
                </div>
            )}

            <h2>Corte de Caja Activo</h2>
            <p><strong>Cajero que abrió:</strong> {perfil.nombre_completo}</p>
            <p><strong>Inicio de Turno:</strong> {new Date(corteActivo.fecha_hora_apertura).toLocaleString()}</p>
            <p><strong>Fondo Inicial:</strong> ${parseFloat(corteActivo.saldo_inicial_efectivo).toFixed(2)}</p>
            <hr/>
            <h4>Resumen del Turno</h4>
            {loadingResumen ? <p>Calculando resumen...</p> : (
                resumen ? (
                    <div>
                        <p><strong>Ventas en Efectivo:</strong> ${parseFloat(resumen.total_ventas_efectivo).toFixed(2)}</p>
                        <p><strong>Ventas con Tarjeta:</strong> ${parseFloat(resumen.total_ventas_tarjeta).toFixed(2)}</p>
                        <p><strong>Ventas a Crédito:</strong> ${parseFloat(resumen.total_ventas_credito).toFixed(2)}</p>
                        <p style={{fontWeight: 'bold', fontSize: '1.2em'}}>Total Vendido: ${parseFloat(resumen.total_general).toFixed(2)}</p>
                    </div>
                ) : <p>No se encontró resumen.</p>
            )}
            <br/>
            <button className="pos-button" style={{backgroundColor: '#dc3545'}} onClick={() => setShowCierreModal(true)}>
                Realizar Corte Final
            </button>
        </div>
    );
}