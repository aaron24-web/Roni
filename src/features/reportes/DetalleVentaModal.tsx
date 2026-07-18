// Ticket de una venta ya realizada.

import { useDetalleVenta, type VentaDeCorte } from './useReportes'

interface Props {
    venta: VentaDeCorte
    onClose: () => void
}

export default function DetalleVentaModal({ venta, onClose }: Props) {
    const { data: detalles = [], isPending, error } = useDetalleVenta(venta.venta_id)

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '600px' }}>
                <h2>Detalle de Venta #{venta.venta_id}</h2>
                <p><strong>Cliente:</strong> {venta.nombre_cliente}</p>
                <p><strong>Total:</strong> ${Number(venta.total).toFixed(2)}</p>
                <hr />
                <h4>Productos Vendidos</h4>

                {isPending && <p>Cargando...</p>}
                {error && <p style={{ color: '#dc3545' }}>Error al cargar: {error.message}</p>}

                {!isPending && !error && (
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
                                {detalles.map((item, indice) => (
                                    <tr key={indice}>
                                        <td>{item.descripcion}</td>
                                        <td>{item.cantidad}</td>
                                        <td>${Number(item.precio_unitario).toFixed(2)}</td>
                                        <td>${Number(item.importe_total).toFixed(2)}</td>
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
    )
}
