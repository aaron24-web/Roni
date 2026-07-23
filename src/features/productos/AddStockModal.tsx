// Modal de entrada de mercancía para un producto.

import { useState } from 'react'
import type { ProductoConDetalle } from './useProductos'
import { useToast } from '../../shared/components/feedback/toast-context'
import Modal, { BotonCancelarModal } from '../../shared/components/Modal'

interface Props {
    producto: ProductoConDetalle
    onConfirm: (productoId: number, cantidad: number) => void
    onCancel: () => void
    guardando?: boolean
}

export default function AddStockModal({ producto, onConfirm, onCancel, guardando }: Props) {
    const [cantidad, setCantidad] = useState('')
    const toast = useToast()

    const handleConfirmar = () => {
        const cantidadNumero = parseFloat(cantidad)
        if (Number.isNaN(cantidadNumero) || cantidadNumero <= 0) {
            toast.error('Por favor, ingresa una cantidad válida.')
            return
        }
        onConfirm(producto.producto_id, cantidadNumero)
    }

    return (
        <Modal titulo="Añadir stock" onClose={onCancel} maxWidth={400} confirmarDescarte>
            <div>
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
                    <BotonCancelarModal disabled={guardando} />
                    <button className="btn btn--primary" onClick={handleConfirmar} disabled={guardando}>
                        {guardando ? 'Guardando...' : 'Confirmar entrada'}
                    </button>
                </div>
            </div>
        </Modal>
    )
}
