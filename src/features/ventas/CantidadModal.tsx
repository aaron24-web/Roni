// Captura de cantidad para productos a granel.

import { useState, useEffect, useCallback } from 'react'
import type { ItemCarrito } from '../../shared/types/domain'
import { useToast } from '../../shared/components/feedback/toast-context'
import Modal from '../../shared/components/Modal'

interface Props {
    producto: { descripcion: string; unidad_medida?: string | null }
    onConfirm: (cantidad: number) => void
    onCancel: () => void
}

export default function CantidadModal({ producto, onConfirm, onCancel }: Props) {
    const [cantidad, setCantidad] = useState('1')
    const toast = useToast()

    const confirmar = useCallback(() => {
        const cantidadNumero = parseFloat(cantidad)
        if (Number.isNaN(cantidadNumero) || cantidadNumero <= 0) {
            toast.error('Por favor, ingresa una cantidad válida.')
            return
        }
        onConfirm(cantidadNumero)
    }, [cantidad, onConfirm, toast])

    // Enter confirma la cantidad.
    useEffect(() => {
        const alPresionarTecla = (e: KeyboardEvent) => {
            if (e.key === 'Enter') confirmar()
        }
        window.addEventListener('keydown', alPresionarTecla)
        return () => window.removeEventListener('keydown', alPresionarTecla)
    }, [confirmar])

    return (
        <Modal titulo="Ingresar cantidad" onClose={onCancel} maxWidth={400}>
            <div>
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
                    <button className="btn btn--secondary" onClick={onCancel}>Cancelar</button>
                    <button className="btn btn--primary" onClick={confirmar}>Aceptar</button>
                </div>
            </div>
        </Modal>
    )
}
export type { ItemCarrito }
