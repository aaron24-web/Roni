// Detalle de un corte de caja cerrado: desglose por departamento, ventas del
// turno y la posibilidad de cancelar una venta (solo administrador).

import { useState } from 'react'
import { useDetalleCorte, useCancelarVenta, type CorteHistorial, type VentaDeCorte } from './useReportes'
import DetalleVentaModal from './DetalleVentaModal'
import { useAuth } from '../../shared/context/auth-context'

interface Props {
    corte: CorteHistorial
    onClose: () => void
}

export default function DetalleCorteModal({ corte, onClose }: Props) {
    const { perfil, esAdmin } = useAuth()
    const { data, isPending, error } = useDetalleCorte(corte.corte_id)
    const cancelarVenta = useCancelarVenta(corte.corte_id)
    const [ventaSeleccionada, setVentaSeleccionada] = useState<VentaDeCorte | null>(null)

    const ventas = data?.ventas ?? []
    const porDepartamento = data?.porDepartamento ?? []

    const handleCancelarVenta = async (ventaId: number) => {
        const motivo = prompt('Por favor, ingresa el motivo de la cancelación:')
        if (!motivo || !perfil) return
        try {
            await cancelarVenta.mutateAsync({ ventaId, supervisorId: perfil.empleado_id, motivo })
            alert('Venta cancelada exitosamente. El inventario ha sido restaurado.')
        } catch (err) {
            alert(`Error al cancelar la venta: ${(err as Error).message}`)
        }
    }

    return (
        <div className="modal-overlay">
            {ventaSeleccionada && (
                <DetalleVentaModal venta={ventaSeleccionada} onClose={() => setVentaSeleccionada(null)} />
            )}
            <div className="modal-content" style={{ width: '80%', maxWidth: '900px' }}>
                <h2>Detalles del Corte #{corte.corte_id}</h2>
                <p><strong>Cierre:</strong> {new Date(corte.fecha_cierre).toLocaleString()}</p>
                <p><strong>Empleado:</strong> {corte.nombre_empleado}</p>
                <hr />

                <h4>Ventas por Departamento</h4>
                {isPending && <p>Calculando...</p>}
                {error && <p style={{ color: '#dc3545' }}>Error al cargar: {error.message}</p>}
                {!isPending && !error && (
                    <ul style={{ paddingLeft: '20px', listStyle: 'square' }}>
                        {porDepartamento.length === 0 ? (
                            <li>Sin ventas registradas en este turno.</li>
                        ) : porDepartamento.map((departamento, indice) => (
                            <li key={indice} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                                <span>{departamento.departamento_nombre}</span>
                                <strong>${Number(departamento.total_vendido).toFixed(2)}</strong>
                            </li>
                        ))}
                    </ul>
                )}

                <hr />
                <h4>Ventas Realizadas en este Turno</h4>
                {!isPending && !error && (
                    <div className="table-container" style={{ maxHeight: '40vh' }}>
                        <table className="sales-table">
                            <thead>
                                <tr>
                                    <th>ID Venta</th>
                                    <th>Fecha y Hora</th>
                                    <th>Cliente</th>
                                    <th>Total</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ventas.length === 0 ? (
                                    <tr><td colSpan={5} style={{ textAlign: 'center' }}>Sin ventas en este turno.</td></tr>
                                ) : ventas.map(venta => (
                                    <tr key={venta.venta_id}>
                                        <td>{venta.venta_id}</td>
                                        <td>{new Date(venta.fecha_hora).toLocaleString()}</td>
                                        <td>{venta.nombre_cliente}</td>
                                        <td>${Number(venta.total).toFixed(2)}</td>
                                        <td style={{ display: 'flex', gap: '5px' }}>
                                            <button onClick={() => setVentaSeleccionada(venta)}>Ver Ticket</button>
                                            {esAdmin && (
                                                <button
                                                    onClick={() => handleCancelarVenta(venta.venta_id)}
                                                    style={{ backgroundColor: '#dc3545', color: 'white' }}
                                                    disabled={cancelarVenta.isPending}
                                                >Cancelar Venta</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="footer" style={{ marginTop: '20px' }}>
                    <button type="button" className="pos-button" onClick={onClose}>Cerrar</button>
                </div>
            </div>
        </div>
    )
}
