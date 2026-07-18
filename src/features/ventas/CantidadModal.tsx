// Captura de cantidad para productos a granel.

import { useState, useEffect, useCallback } from 'react'
import type { ItemCarrito } from '../../shared/types/domain'

interface Props {
    producto: { descripcion: string; unidad_medida?: string | null }
    onConfirm: (cantidad: number) => void
    onCancel: () => void
}

export default function CantidadModal({ producto, onConfirm, onCancel }: Props) {
    const [cantidad, setCantidad] = useState('1')

    const confirmar = useCallback(() => {
        const cantidadNumero = parseFloat(cantidad)
        if (Number.isNaN(cantidadNumero) || cantidadNumero <= 0) {
            alert('Por favor, ingresa una cantidad válida.')
            return
        }
        onConfirm(cantidadNumero)
    }, [cantidad, onConfirm])

    // Enter confirma la cantidad.
    useEffect(() => {
        const alPresionarTecla = (e: KeyboardEvent) => {
            if (e.key === 'Enter') confirmar()
        }
        window.addEventListener('keydown', alPresionarTecla)
        return () => window.removeEventListener('keydown', alPresionarTecla)
    }, [confirmar])

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '400px' }}>
                <h2>Ingresar Cantidad</h2>
                <p style={{ fontSize: '1.2em', fontWeight: 'bold' }}>{producto.descripcion}</p>
                <label htmlFor="cantidadInput">Cantidad ({producto.unidad_medida || 'KG'}):</label>
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
                    <button className="pos-button" style={{ backgroundColor: '#6c757d' }} onClick={onCancel}>Cancelar</button>
                    <button className="checkout-btn" onClick={confirmar}>Aceptar</button>
                </div>
            </div>
        </div>
    )
}
export type { ItemCarrito }
