// Modal de entrada de mercancía para un producto.

import { useState } from 'react'
import type { ProductoConDetalle } from './useProductos'

interface Props {
    producto: ProductoConDetalle
    onConfirm: (productoId: number, cantidad: number) => void
    onCancel: () => void
    guardando?: boolean
}

export default function AddStockModal({ producto, onConfirm, onCancel, guardando }: Props) {
    const [cantidad, setCantidad] = useState('')

    const handleConfirmar = () => {
        const cantidadNumero = parseFloat(cantidad)
        if (Number.isNaN(cantidadNumero) || cantidadNumero <= 0) {
            alert('Por favor, ingresa una cantidad válida.')
            return
        }
        onConfirm(producto.producto_id, cantidadNumero)
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '400px' }}>
                <h2>Añadir Stock</h2>
                <p style={{ fontSize: '1.2em', fontWeight: 'bold' }}>{producto.descripcion}</p>
                <label htmlFor="cantidadInput">Cantidad a Añadir:</label>
                <input
                    id="cantidadInput"
                    type="number"
                    step="0.01"
                    className="pos-input"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    autoFocus
                    style={{ fontSize: '2em', textAlign: 'center', margin: '15px 0' }}
                />
                <div className="footer">
                    <button className="pos-button" style={{ backgroundColor: '#6c757d' }} onClick={onCancel} disabled={guardando}>
                        Cancelar
                    </button>
                    <button className="checkout-btn" onClick={handleConfirmar} disabled={guardando}>
                        {guardando ? 'Guardando...' : 'Confirmar Entrada'}
                    </button>
                </div>
            </div>
        </div>
    )
}
