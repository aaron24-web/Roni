// src/components/SupervisorApprovalModal.jsx

import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import './PantallaVenta.css';

export default function SupervisorApprovalModal({ onApprove, onCancel }) {
    const [usuario, setUsuario] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleApprove = async () => {
        setLoading(true);
        setError('');
        try {
            const { data, error: rpcError } = await supabase.rpc('verificar_supervisor', {
                usuario_param: usuario,
                contrasena_param: password
            });

            if (rpcError) throw rpcError;

            if (data) { // Si la función devuelve un ID, es un supervisor válido
                onApprove();
            } else {
                setError("Credenciales de supervisor incorrectas o inválidas.");
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '450px' }}>
                <h2>Se Requiere Aprobación de Supervisor</h2>
                <p>Por favor, un supervisor debe ingresar sus credenciales para continuar.</p>
                <div style={{display: 'flex', flexDirection:'column', gap:'10px', marginTop: '20px'}}>
                    <label>Usuario Supervisor:</label>
                    <input type="text" value={usuario} onChange={(e) => setUsuario(e.target.value)} className="pos-input" />
                    <label>Contraseña Supervisor:</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pos-input" />
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                </div>
                <div className="footer" style={{marginTop: '20px'}}>
                    <button type="button" className="pos-button" onClick={onCancel}>Cancelar</button>
                    <button className="checkout-btn" onClick={handleApprove} disabled={loading}>
                        {loading ? 'Verificando...' : 'Aprobar'}
                    </button>
                </div>
            </div>
        </div>
    );
}