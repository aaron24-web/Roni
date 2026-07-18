// Historial de cortes de caja. Ruta exclusiva de administrador.

import { useState } from 'react'
import { useHistorialCortes, type CorteHistorial } from './useReportes'
import DetalleCorteModal from './DetalleCorteModal'
import '../../shared/styles/pos.css'

const colorDiferencia = (diferencia: number) => {
    if (diferencia < 0) return 'red'
    if (diferencia > 0) return 'blue'
    return 'green'
}

export default function ReportesPage() {
    const { data: cortes = [], isPending, error } = useHistorialCortes()
    const [corteSeleccionado, setCorteSeleccionado] = useState<CorteHistorial | null>(null)

    return (
        <div className="pos-container">
            {corteSeleccionado && (
                <DetalleCorteModal corte={corteSeleccionado} onClose={() => setCorteSeleccionado(null)} />
            )}

            <div className="search-bar">
                <h2>Historial de Cortes de Caja</h2>
            </div>

            <div className="table-container">
                {isPending && <p>Cargando historial de cortes...</p>}
                {error && <p style={{ color: '#dc3545' }}>Error al cargar: {error.message}</p>}

                {!isPending && !error && (
                    <table className="sales-table">
                        <thead>
                            <tr>
                                <th>ID Corte</th>
                                <th>Fecha de Cierre</th>
                                <th>Empleado</th>
                                <th>Fondo Inicial</th>
                                <th>Efectivo Contado</th>
                                <th>Diferencia</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cortes.length === 0 ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center' }}>Todavía no hay cortes cerrados.</td></tr>
                            ) : cortes.map(corte => {
                                const diferencia = Number(corte.diferencia)
                                return (
                                    <tr key={corte.corte_id}>
                                        <td>{corte.corte_id}</td>
                                        <td>{new Date(corte.fecha_cierre).toLocaleString()}</td>
                                        <td>{corte.nombre_empleado}</td>
                                        <td>${Number(corte.saldo_inicial).toFixed(2)}</td>
                                        <td>${Number(corte.saldo_final_real).toFixed(2)}</td>
                                        <td style={{ color: colorDiferencia(diferencia) }}>
                                            ${diferencia.toFixed(2)}
                                        </td>
                                        <td>
                                            <button onClick={() => setCorteSeleccionado(corte)}>Ver Detalles</button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
