// src/components/CantidadModal.jsx

import React, { useState, useEffect } from 'react';
import './PantallaVenta.css';

export default function CantidadModal({ producto, onConfirm, onCancel }) {
    const [cantidad, setCantidad] = useState('1');

    // Permite presionar Enter para confirmar
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.key === 'Enter') {
                handleConfirmClick();
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, [cantidad]);

    const handleConfirmClick = () => {
        const cantNum = parseFloat(cantidad);
        if (!isNaN(cantNum) && cantNum > 0) {
            onConfirm(producto, cantNum);
        } else {
            alert("Por favor, ingresa una cantidad válida.");
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '400px' }}>
                <h2>Ingresar Cantidad</h2>
                <p style={{fontSize: '1.2em', fontWeight: 'bold'}}>{producto.descripcion}</p>
                <label htmlFor="cantidadInput">Cantidad ({producto.unidad_medida || 'KG'}):</label>
                <input
                    id="cantidadInput"
                    type="number"
                    step="0.01"
                    className="pos-input"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    autoFocus
                    style={{fontSize: '2em', textAlign: 'center', margin: '15px 0'}}
                />
                <div className="footer">
                    <button className="pos-button" style={{backgroundColor: '#6c757d'}} onClick={onCancel}>Cancelar</button>
                    <button className="checkout-btn" onClick={handleConfirmClick}>Aceptar</button>
                </div>
            </div>
        </div>
    );
}