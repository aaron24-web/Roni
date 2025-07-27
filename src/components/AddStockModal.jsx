// src/components/AddStockModal.jsx

import React, { useState } from 'react';
import './PantallaVenta.css';

export default function AddStockModal({ producto, onConfirm, onCancel }) {
    const [cantidad, setCantidad] = useState('');

    const handleConfirmClick = () => {
        const cantNum = parseFloat(cantidad);
        if (!isNaN(cantNum) && cantNum > 0) {
            onConfirm(producto.producto_id, cantNum);
        } else {
            alert("Por favor, ingresa una cantidad válida.");
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '400px' }}>
                <h2>Añadir Stock</h2>
                <p style={{fontSize: '1.2em', fontWeight: 'bold'}}>{producto.descripcion}</p>
                <label htmlFor="cantidadInput">Cantidad a Añadir:</label>
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
                    <button className="checkout-btn" onClick={handleConfirmClick}>Confirmar Entrada</button>
                </div>
            </div>
        </div>
    );
}