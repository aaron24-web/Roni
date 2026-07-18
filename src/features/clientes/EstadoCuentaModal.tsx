// Estado de cuenta de un cliente con crédito: saldo, historial y abonos.

import { useState } from 'react'
import { useEstadoCuenta, useRegistrarAbono, type Cliente } from './useClientes'
import { useAuth } from '../../shared/context/auth-context'

interface Props {
    cliente: Cliente
    onClose: () => void
}

export default function EstadoCuentaModal({ cliente, onClose }: Props) {
    const { perfil } = useAuth()
    const { data: movimientos = [], isPending, error } = useEstadoCuenta(cliente.cliente_id)
    const registrarAbono = useRegistrarAbono(cliente.cliente_id)
    const [montoAbono, setMontoAbono] = useState('')

    // El saldo vigente es el del movimiento más reciente.
    const saldoActual = movimientos.length > 0 ? Number(movimientos[0].saldo_nuevo) : 0

    const handleRegistrarAbono = async () => {
        const monto = parseFloat(montoAbono)
        if (!monto || monto <= 0) {
            alert('Por favor, ingresa un monto válido para el abono.')
            return
        }
        if (!perfil) return
        try {
            await registrarAbono.mutateAsync({ monto, empleadoId: perfil.empleado_id })
            setMontoAbono('')
            alert('¡Abono registrado exitosamente!')
        } catch (err) {
            alert(`Error al registrar el abono: ${(err as Error).message}`)
        }
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ width: '80%', maxWidth: '800px' }}>
                <h2>Estado de Cuenta de: {cliente.nombre}</h2>
                <h3>Saldo Actual: <span style={{ color: 'red' }}>${saldoActual.toFixed(2)}</span></h3>
                <hr />

                <h4>Registrar Abono</h4>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <input
                        type="number"
                        placeholder="Monto del abono"
                        className="pos-input"
                        value={montoAbono}
                        onChange={(e) => setMontoAbono(e.target.value)}
                    />
                    <button
                        className="pos-button"
                        onClick={handleRegistrarAbono}
                        disabled={registrarAbono.isPending}
                    >
                        {registrarAbono.isPending ? 'Registrando...' : 'Registrar Abono'}
                    </button>
                </div>

                <h4>Historial de Movimientos</h4>
                {isPending && <p>Cargando historial...</p>}
                {error && <p style={{ color: '#dc3545' }}>Error al cargar: {error.message}</p>}

                {!isPending && !error && (
                    <div className="table-container" style={{ maxHeight: '40vh' }}>
                        <table className="sales-table">
                            <thead>
                                <tr>
                                    <th>Fecha y Hora</th>
                                    <th>Tipo</th>
                                    <th>Monto</th>
                                    <th>Saldo Resultante</th>
                                </tr>
                            </thead>
                            <tbody>
                                {movimientos.length === 0 ? (
                                    <tr><td colSpan={4} style={{ textAlign: 'center' }}>Sin movimientos registrados.</td></tr>
                                ) : movimientos.map((movimiento, indice) => (
                                    <tr key={indice}>
                                        <td>{new Date(movimiento.fecha_hora).toLocaleString()}</td>
                                        <td style={{ color: movimiento.tipo_movimiento === 'CARGO' ? 'red' : 'green' }}>
                                            {movimiento.tipo_movimiento}
                                        </td>
                                        <td>${Number(movimiento.monto).toFixed(2)}</td>
                                        <td>${Number(movimiento.saldo_nuevo).toFixed(2)}</td>
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
