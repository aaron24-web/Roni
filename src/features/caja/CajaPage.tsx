// Pantalla de Corte de Caja. Ruta compartida (administrador y cajero).
//
// Cada terminal abre y cierra su propia caja: el corte activo que ve esta
// pantalla es el de ESTA computadora.

import { useState } from 'react'
import { useResumenCorte, useAbrirCaja, useCerrarCaja } from './useCaja'
import { usePos } from '../../shared/context/pos-context'
import { useAuth } from '../../shared/context/auth-context'
import { getTerminalId, getTerminalNombre } from '../../shared/lib/terminal'
import '../../shared/styles/pos.css'

export default function CajaPage() {
    const { perfil } = useAuth()
    const { corteActivo, setCorteActivo } = usePos()
    const { data: resumen, isPending: cargandoResumen } = useResumenCorte(corteActivo?.corte_id)
    const abrirCaja = useAbrirCaja()
    const cerrarCaja = useCerrarCaja()

    const [fondoInicial, setFondoInicial] = useState('')
    const [efectivoEnCaja, setEfectivoEnCaja] = useState('')
    const [modalCierre, setModalCierre] = useState(false)

    const handleAbrirCaja = async () => {
        const montoInicial = parseFloat(fondoInicial)
        if (Number.isNaN(montoInicial) || montoInicial < 0) {
            alert('Por favor, ingresa un fondo inicial válido.')
            return
        }
        if (!perfil) return
        try {
            const corte = await abrirCaja.mutateAsync({
                empleadoId: perfil.empleado_id,
                saldoInicial: montoInicial,
                terminalId: getTerminalId(),
            })
            if (corte) setCorteActivo(corte)
            alert('Caja abierta exitosamente. ¡Listo para vender!')
        } catch (err) {
            alert(`Error al abrir la caja: ${(err as Error).message}`)
        }
    }

    const handleCerrarCaja = async () => {
        const efectivoReal = parseFloat(efectivoEnCaja)
        if (Number.isNaN(efectivoReal) || efectivoReal < 0) {
            alert('Por favor, ingresa un monto de efectivo válido.')
            return
        }
        if (!corteActivo) return
        if (!window.confirm('¿Estás seguro de que quieres cerrar el turno? Esta acción no se puede deshacer.')) {
            return
        }
        try {
            await cerrarCaja.mutateAsync({
                corteId: corteActivo.corte_id,
                saldoFinalReal: efectivoReal,
                resumen: resumen ?? null,
            })
            alert('¡Turno cerrado exitosamente!')
            setModalCierre(false)
            setCorteActivo(null)
        } catch (err) {
            alert(`Error al cerrar la caja: ${(err as Error).message}`)
        }
    }

    if (!corteActivo) {
        return (
            <div className="pos-container" style={{ alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 150px)' }}>
                <div style={{ padding: '40px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', textAlign: 'center' }}>
                    <h2>Abrir Caja</h2>
                    <p style={{ color: '#6c757d' }}>Terminal: <strong>{getTerminalNombre()}</strong></p>
                    <p>Esta terminal no tiene una sesión de caja activa. Ingresa el fondo inicial para comenzar a vender.</p>
                    <label htmlFor="fondoInicial" style={{ fontWeight: 'bold' }}>Fondo de Caja Inicial:</label>
                    <input
                        id="fondoInicial"
                        type="number"
                        className="pos-input"
                        style={{ width: '200px', margin: '20px auto', display: 'block' }}
                        value={fondoInicial}
                        onChange={(e) => setFondoInicial(e.target.value)}
                        placeholder="0.00"
                    />
                    <button className="checkout-btn" onClick={handleAbrirCaja} disabled={abrirCaja.isPending}>
                        {abrirCaja.isPending ? 'Iniciando...' : 'Iniciar Turno'}
                    </button>
                </div>
            </div>
        )
    }

    const saldoFinalTeorico =
        Number(resumen?.total_ventas_efectivo ?? 0) + Number(corteActivo.saldo_inicial_efectivo)
    const diferencia = parseFloat(efectivoEnCaja || '0') - saldoFinalTeorico

    return (
        <div className="pos-container">
            {modalCierre && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Confirmar Cierre de Caja</h2>
                        <p><strong>Total en Efectivo (según sistema):</strong> ${saldoFinalTeorico.toFixed(2)}</p>
                        <p style={{ fontSize: '0.9em', color: '#6c757d' }}>
                            Este total se calcula con: (Fondo Inicial + Ventas en Efectivo)
                        </p>
                        <hr />
                        <label htmlFor="efectivoReal" style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>
                            Ingresa el efectivo real contado en caja:
                        </label>
                        <input
                            id="efectivoReal"
                            type="number"
                            className="pos-input"
                            value={efectivoEnCaja}
                            onChange={(e) => setEfectivoEnCaja(e.target.value)}
                            placeholder="0.00"
                        />
                        {efectivoEnCaja && (
                            <div style={{ marginTop: '15px', fontWeight: 'bold', fontSize: '1.2em' }}>
                                {diferencia === 0 && <p style={{ color: 'green' }}>¡Cuadre perfecto!</p>}
                                {diferencia > 0 && <p style={{ color: 'blue' }}>Sobrante: ${diferencia.toFixed(2)}</p>}
                                {diferencia < 0 && <p style={{ color: 'red' }}>Faltante: ${Math.abs(diferencia).toFixed(2)}</p>}
                            </div>
                        )}
                        <div className="footer" style={{ marginTop: '20px' }}>
                            <button
                                type="button"
                                className="pos-button"
                                style={{ backgroundColor: '#6c757d' }}
                                onClick={() => setModalCierre(false)}
                                disabled={cerrarCaja.isPending}
                            >Cancelar</button>
                            <button className="checkout-btn" onClick={handleCerrarCaja} disabled={cerrarCaja.isPending}>
                                {cerrarCaja.isPending ? 'Cerrando...' : 'Confirmar y Cerrar Turno'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <h2>Corte de Caja Activo</h2>
            <p><strong>Terminal:</strong> {getTerminalNombre()}</p>
            <p><strong>Cajero que abrió:</strong> {perfil?.nombre_completo}</p>
            <p><strong>Inicio de Turno:</strong> {new Date(corteActivo.fecha_hora_apertura).toLocaleString()}</p>
            <p><strong>Fondo Inicial:</strong> ${Number(corteActivo.saldo_inicial_efectivo).toFixed(2)}</p>
            <hr />
            <h4>Resumen del Turno</h4>
            {cargandoResumen ? <p>Calculando resumen...</p> : (
                resumen ? (
                    <div>
                        <p><strong>Ventas en Efectivo:</strong> ${Number(resumen.total_ventas_efectivo).toFixed(2)}</p>
                        <p><strong>Ventas con Tarjeta:</strong> ${Number(resumen.total_ventas_tarjeta).toFixed(2)}</p>
                        <p><strong>Ventas a Crédito:</strong> ${Number(resumen.total_ventas_credito).toFixed(2)}</p>
                        <p style={{ fontWeight: 'bold', fontSize: '1.2em' }}>
                            Total Vendido: ${Number(resumen.total_general).toFixed(2)}
                        </p>
                    </div>
                ) : <p>No se encontró resumen.</p>
            )}
            <br />
            <button className="pos-button" style={{ backgroundColor: '#dc3545' }} onClick={() => setModalCierre(true)}>
                Realizar Corte Final
            </button>
        </div>
    )
}
