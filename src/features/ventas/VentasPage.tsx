// Pantalla de Ventas (punto de venta). Ruta compartida.
//
// El carrito vive en el ticket activo (ver PosProvider), que se persiste en
// la base de datos, de modo que sobrevive a recargas o cortes de luz.

import { useState, useMemo, useEffect } from 'react'
import {
    useMetodosPago,
    useClientesParaVenta,
    useBuscarProductos,
    useRegistrarVenta,
    type ProductoBusqueda,
} from './useVentas'
import { calcularImporteFinal, importeSinPromocion, calcularTotal } from './promociones'
import CantidadModal from './CantidadModal'
import SupervisorApprovalModal from './SupervisorApprovalModal'
import { usePos } from '../../shared/context/pos-context'
import { useAuth } from '../../shared/context/auth-context'
import type { ItemCarrito } from '../../shared/types/domain'
import '../../shared/styles/pos.css'

const CLIENTE_PUBLICO_GENERAL = 1

/** Convierte un producto de la búsqueda en un renglón del carrito. */
const aItemCarrito = (producto: ProductoBusqueda, cantidad: number): ItemCarrito => ({
    producto_id: producto.producto_id,
    descripcion: producto.descripcion,
    cantidad,
    precio_unitario_registrado: Number(producto.precio_venta),
    tipo_producto: producto.tipo_producto,
    unidad_medida: producto.unidad_medida,
    promociones: producto.promociones,
})

export default function VentasPage() {
    const { perfil, esAdmin } = useAuth()
    const { ticketActivo, actualizarCarritoActivo, marcarTicketCobrado, corteActivo } = usePos()
    const carrito = ticketActivo.carrito

    const { data: metodosPago = [] } = useMetodosPago()
    const { data: clientes = [] } = useClientesParaVenta()
    const registrarVenta = useRegistrarVenta()

    const [modalBusqueda, setModalBusqueda] = useState(false)
    const [terminoBusqueda, setTerminoBusqueda] = useState('')
    const [terminoDebounced, setTerminoDebounced] = useState('')
    const { data: resultados = [] } = useBuscarProductos(modalBusqueda ? terminoDebounced : '')

    const [modalCobro, setModalCobro] = useState(false)
    const [metodoSeleccionado, setMetodoSeleccionado] = useState<number | null>(null)
    const [montoRecibido, setMontoRecibido] = useState('')
    const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState(String(CLIENTE_PUBLICO_GENERAL))
    const [busquedaCliente, setBusquedaCliente] = useState('')
    const [productoParaCantidad, setProductoParaCantidad] = useState<ProductoBusqueda | null>(null)
    const [modalAprobacion, setModalAprobacion] = useState(false)
    const [accionPorAprobar, setAccionPorAprobar] = useState<(() => void) | null>(null)

    // Antirrebote de la búsqueda: evita una consulta por pulsación.
    useEffect(() => {
        const temporizador = setTimeout(() => setTerminoDebounced(terminoBusqueda), 300)
        return () => clearTimeout(temporizador)
    }, [terminoBusqueda])

    // Efectivo queda preseleccionado en cuanto se cargan los métodos de pago.
    useEffect(() => {
        if (metodoSeleccionado === null && metodosPago.length > 0) {
            const efectivo = metodosPago.find(m => m.nombre.toLowerCase() === 'efectivo')
            if (efectivo) setMetodoSeleccionado(efectivo.metodo_pago_id)
        }
    }, [metodosPago, metodoSeleccionado])

    const total = useMemo(() => calcularTotal(carrito), [carrito])
    const cambio = useMemo(() => {
        const recibido = parseFloat(montoRecibido)
        if (Number.isNaN(recibido)) return 0
        return Math.max(recibido - total, 0)
    }, [montoRecibido, total])

    const clientesFiltrados = useMemo(() => {
        if (!busquedaCliente) return []
        const termino = busquedaCliente.toLowerCase()
        return clientes.filter(c => c.nombre.toLowerCase().includes(termino))
    }, [busquedaCliente, clientes])

    const clienteActual = clientes.find(c => String(c.cliente_id) === clienteSeleccionadoId)
    const metodoActual = metodosPago.find(m => m.metodo_pago_id === metodoSeleccionado)
    const pagoEnEfectivo = metodoActual?.nombre.toLowerCase() === 'efectivo'

    // --- Operaciones sobre el carrito --------------------------------
    const agregarProducto = (producto: ProductoBusqueda) => {
        if (producto.tipo_producto === 'GRANEL') {
            setProductoParaCantidad(producto)
        } else {
            const existente = carrito.find(i => i.producto_id === producto.producto_id)
            if (existente) {
                cambiarCantidad(producto.producto_id, existente.cantidad + 1)
            } else {
                actualizarCarritoActivo([...carrito, aItemCarrito(producto, 1)])
            }
        }
        setModalBusqueda(false)
        setTerminoBusqueda('')
    }

    const cambiarCantidad = (productoId: number, nuevaCantidad: number) => {
        if (nuevaCantidad <= 0) {
            quitarDelCarrito(productoId)
            return
        }
        actualizarCarritoActivo(
            carrito.map(i => (i.producto_id === productoId ? { ...i, cantidad: nuevaCantidad } : i))
        )
    }

    const quitarDelCarrito = (productoId: number) => {
        const quitar = () => actualizarCarritoActivo(carrito.filter(i => i.producto_id !== productoId))
        if (esAdmin) {
            if (window.confirm('¿Estás seguro de que quieres quitar este producto del ticket?')) quitar()
        } else {
            // Un cajero necesita aprobación de un supervisor.
            setAccionPorAprobar(() => quitar)
            setModalAprobacion(true)
        }
    }

    const confirmarCantidadGranel = (cantidad: number) => {
        if (!productoParaCantidad) return
        const existente = carrito.find(i => i.producto_id === productoParaCantidad.producto_id)
        if (existente) {
            cambiarCantidad(productoParaCantidad.producto_id, cantidad)
        } else {
            actualizarCarritoActivo([...carrito, aItemCarrito(productoParaCantidad, cantidad)])
        }
        setProductoParaCantidad(null)
    }

    // --- Cobro -------------------------------------------------------
    const abrirCobro = () => {
        setBusquedaCliente(clienteActual?.nombre ?? '')
        setModalCobro(true)
    }

    const confirmarVenta = async () => {
        if (!metodoSeleccionado) return alert('Por favor, selecciona un método de pago.')
        if (carrito.length === 0) return alert('El carrito está vacío.')
        if (!corteActivo) return alert('Error: No hay una caja activa.')
        if (!perfil) return
        if (pagoEnEfectivo && (!montoRecibido || parseFloat(montoRecibido) < total)) {
            return alert('El monto recibido es menor que el total a pagar.')
        }

        try {
            const ventaId = await registrarVenta.mutateAsync({
                empleadoId: perfil.empleado_id,
                clienteId: parseInt(clienteSeleccionadoId, 10),
                metodoPagoId: metodoSeleccionado,
                corteId: corteActivo.corte_id,
                carrito,
            })
            alert(`¡Venta #${ventaId} registrada exitosamente!`)
            // El ticket queda marcado como COBRADO y ligado a esta venta.
            marcarTicketCobrado(ticketActivo.id, ventaId)
            setModalCobro(false)
            setMontoRecibido('')
            setClienteSeleccionadoId(String(CLIENTE_PUBLICO_GENERAL))
        } catch (err) {
            alert(`Error al registrar la venta: ${(err as Error).message}`)
        }
    }

    if (!corteActivo) {
        return (
            <div className="pos-container" style={{ textAlign: 'center', paddingTop: '50px' }}>
                <h2 style={{ color: '#dc3545' }}>La caja está cerrada</h2>
                <p>Por favor, ve a la pestaña <strong>Caja</strong> para iniciar un nuevo turno y poder registrar ventas.</p>
            </div>
        )
    }

    return (
        <div className="pos-container">
            {modalAprobacion && (
                <SupervisorApprovalModal
                    onApprove={() => {
                        accionPorAprobar?.()
                        setModalAprobacion(false)
                        setAccionPorAprobar(null)
                    }}
                    onCancel={() => setModalAprobacion(false)}
                />
            )}

            {productoParaCantidad && (
                <CantidadModal
                    producto={productoParaCantidad}
                    onConfirm={confirmarCantidadGranel}
                    onCancel={() => setProductoParaCantidad(null)}
                />
            )}

            {modalBusqueda && (
                <div className="modal-overlay" onClick={() => setModalBusqueda(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>Buscar Producto</h3>
                        <input
                            type="text"
                            className="pos-input"
                            placeholder="Escribe para buscar..."
                            value={terminoBusqueda}
                            onChange={e => setTerminoBusqueda(e.target.value)}
                            autoFocus
                        />
                        <ul className="search-results-list">
                            {resultados.map(producto => (
                                <li key={producto.producto_id} onClick={() => agregarProducto(producto)}>
                                    {producto.descripcion} — <strong>${Number(producto.precio_venta).toFixed(2)}</strong>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {modalCobro && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Finalizar Venta</h2>
                        <h3>Total a Pagar: ${total.toFixed(2)}</h3>
                        <hr />
                        <div className="customer-selection">
                            <label htmlFor="cliente-search">Asignar Venta a:</label>
                            <input
                                id="cliente-search"
                                type="text"
                                className="pos-input"
                                value={busquedaCliente}
                                onChange={(e) => {
                                    setBusquedaCliente(e.target.value)
                                    if (e.target.value === '') setClienteSeleccionadoId(String(CLIENTE_PUBLICO_GENERAL))
                                }}
                                placeholder="Buscar cliente..."
                            />
                            {clientesFiltrados.length > 0 && (
                                <ul className="customer-search-results">
                                    {clientesFiltrados.map(cliente => (
                                        <li
                                            key={cliente.cliente_id}
                                            onClick={() => {
                                                setClienteSeleccionadoId(String(cliente.cliente_id))
                                                setBusquedaCliente(cliente.nombre)
                                            }}
                                        >{cliente.nombre}</li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <h4>Método de Pago</h4>
                        <div className="payment-methods">
                            {metodosPago.map(metodo => {
                                const esCredito = metodo.nombre.toLowerCase() === 'crédito tienda'
                                const esPublicoGeneral = clienteActual?.cliente_id === CLIENTE_PUBLICO_GENERAL
                                const sinCredito = !clienteActual?.permite_credito
                                const deshabilitado = esCredito && (esPublicoGeneral || sinCredito)
                                return (
                                    <button
                                        key={metodo.metodo_pago_id}
                                        className={`payment-btn ${metodoSeleccionado === metodo.metodo_pago_id ? 'selected' : ''}`}
                                        onClick={() => setMetodoSeleccionado(metodo.metodo_pago_id)}
                                        disabled={deshabilitado}
                                        title={deshabilitado ? 'Selecciona un cliente con crédito' : ''}
                                    >{metodo.nombre}</button>
                                )
                            })}
                        </div>

                        {pagoEnEfectivo && (
                            <div className="cash-payment">
                                <label htmlFor="montoRecibido">Monto Recibido:</label>
                                <input
                                    id="montoRecibido"
                                    type="number"
                                    className="pos-input"
                                    value={montoRecibido}
                                    onChange={(e) => setMontoRecibido(e.target.value)}
                                    placeholder="0.00"
                                />
                                <div className="change-display">Cambio: ${cambio.toFixed(2)}</div>
                            </div>
                        )}

                        <div className="footer" style={{ justifyContent: 'space-between', marginTop: '20px' }}>
                            <button
                                className="pos-button"
                                style={{ backgroundColor: '#6c757d' }}
                                onClick={() => setModalCobro(false)}
                                disabled={registrarVenta.isPending}
                            >Cancelar</button>
                            <button className="checkout-btn" onClick={confirmarVenta} disabled={registrarVenta.isPending}>
                                {registrarVenta.isPending ? 'Registrando...' : 'Confirmar Venta'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="search-bar">
                <button className="pos-button" onClick={() => setModalBusqueda(true)}>[F10] Buscar Producto</button>
            </div>

            <div className="table-container">
                <table className="sales-table">
                    <thead>
                        <tr><th>Cant.</th><th>Descripción</th><th>Precio Unit.</th><th>Importe</th><th>Acciones</th></tr>
                    </thead>
                    <tbody>
                        {carrito.length === 0 ? (
                            <tr><td colSpan={5} style={{ textAlign: 'center' }}>Ticket vacío</td></tr>
                        ) : carrito.map(item => {
                            const importeFinal = calcularImporteFinal(item)
                            const importeOriginal = importeSinPromocion(item)
                            const tienePromo = importeFinal < importeOriginal
                            return (
                                <tr key={item.producto_id}>
                                    <td>{item.cantidad} {item.tipo_producto === 'GRANEL' ? (item.unidad_medida || 'KG') : ''}</td>
                                    <td>
                                        {item.descripcion}
                                        {tienePromo && item.promociones && (
                                            <div style={{ color: '#28a745', fontSize: '0.8em', fontWeight: 'bold' }}>
                                                Promo: {item.promociones.nombre}
                                            </div>
                                        )}
                                    </td>
                                    <td>${Number(item.precio_unitario_registrado).toFixed(2)}</td>
                                    <td>
                                        {tienePromo ? (
                                            <>
                                                <s style={{ color: '#dc3545', marginRight: '8px' }}>${importeOriginal.toFixed(2)}</s>
                                                <strong>${importeFinal.toFixed(2)}</strong>
                                            </>
                                        ) : <strong>${importeFinal.toFixed(2)}</strong>}
                                    </td>
                                    <td style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                        {item.tipo_producto === 'GRANEL' ? (
                                            <span style={{ color: '#6c757d', fontSize: '0.9em' }}>a granel</span>
                                        ) : (
                                            <div className="quantity-controls">
                                                <button className="quantity-btn" onClick={() => cambiarCantidad(item.producto_id, item.cantidad - 1)}>-</button>
                                                <span className="quantity-display">{item.cantidad}</span>
                                                <button className="quantity-btn" onClick={() => cambiarCantidad(item.producto_id, item.cantidad + 1)}>+</button>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => quitarDelCarrito(item.producto_id)}
                                            style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
                                            title="Quitar producto"
                                        >X</button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            <div className="footer">
                <div className="total-display">Total: ${total.toFixed(2)}</div>
                <button className="checkout-btn" onClick={abrirCobro} disabled={carrito.length === 0}>Cobrar</button>
            </div>
        </div>
    )
}
