// src/components/PantallaVenta.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import CantidadModal from './CantidadModal';
import SupervisorApprovalModal from './SupervisorApprovalModal';
import './PantallaVenta.css';

export default function PantallaVenta({ perfil, carrito, onCarritoChange, onVentaCompleta, corteActivo }) {
    const [total, setTotal] = useState(0);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [terminoBusqueda, setTerminoBusqueda] = useState('');
    const [resultados, setResultados] = useState([]);
    const [checkoutModalAbierto, setCheckoutModalAbierto] = useState(false);
    const [metodosPago, setMetodosPago] = useState([]);
    const [metodoSeleccionado, setMetodoSeleccionado] = useState(null);
    const [montoRecibido, setMontoRecibido] = useState('');
    const [cambio, setCambio] = useState(0);
    const [clientes, setClientes] = useState([]);
    const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState('1');
    const [productoParaCantidad, setProductoParaCantidad] = useState(null);
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [actionToApprove, setActionToApprove] = useState(null);
    
    const [busquedaCliente, setBusquedaCliente] = useState('');
    const [clientesFiltrados, setClientesFiltrados] = useState([]);

    useEffect(() => {
        const fetchInitialData = async () => {
            const { data: clientesData } = await supabase.from('clientes').select('cliente_id, nombre, permite_credito').eq('activo', true).order('nombre');
            setClientes(clientesData || []);
            const { data: metodosData } = await supabase.from('metodospago').select('*').eq('activo', true);
            if (metodosData) {
                setMetodosPago(metodosData);
                const efectivo = metodosData.find(m => m.nombre.toLowerCase() === 'efectivo');
                if (efectivo) setMetodoSeleccionado(efectivo.metodo_pago_id);
            }
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (!modalAbierto || terminoBusqueda.length < 2) {
            setResultados([]);
            return;
        }
        const timer = setTimeout(async () => {
            const { data } = await supabase
                .from('productos')
                .select(`*, departamentos ( nombre ), promociones ( * )`)
                .or(`descripcion.ilike.%${terminoBusqueda}%,codigo_barras.eq.${terminoBusqueda}`)
                .limit(10);
            setResultados(data || []);
        }, 300);
        return () => clearTimeout(timer);
    }, [terminoBusqueda, modalAbierto]);

    const calcularImporteFinal = (item) => {
        const ahora = new Date();
        const promo = item.promociones;
        const importeSinPromo = item.cantidad * item.precio_unitario_registrado;

        if (!promo || !promo.activo || new Date(promo.fecha_inicio) > ahora || (promo.fecha_fin && new Date(promo.fecha_fin) < ahora)) {
            return importeSinPromo;
        }

        switch (promo.tipo_promocion) {
            case 'PORCENTAJE': {
                const descuento = importeSinPromo * (promo.valor / 100);
                return importeSinPromo - descuento;
            }
            case 'CANTIDAD_X_CANTIDAD': {
                const cantidadAPagar = Math.ceil(item.cantidad / promo.valor);
                return cantidadAPagar * item.precio_unitario_registrado;
            }
            default:
                return importeSinPromo;
        }
    };

    useEffect(() => {
        const nuevoTotal = carrito.reduce((sum, item) => sum + calcularImporteFinal(item), 0);
        setTotal(nuevoTotal);
    }, [carrito]);

    const agregarAlCarrito = (producto) => {
        if (producto.tipo_producto === 'GRANEL') {
            const itemEnCarrito = carrito.find(item => item.producto_id === producto.producto_id);
            setProductoParaCantidad(itemEnCarrito || producto);
        } else {
            aumentarCantidad(producto.producto_id, producto);
        }
        setModalAbierto(false);
        setTerminoBusqueda('');
        setResultados([]);
    };

    const aumentarCantidad = (productoId, productoInfo = null) => {
        let itemActualizado;
        const itemExistente = carrito.find(item => item.producto_id === productoId);
        let nuevoCarrito;

        if (itemExistente) {
            nuevoCarrito = carrito.map(item => {
                if (item.producto_id === productoId) {
                    itemActualizado = { ...item, cantidad: item.cantidad + 1 };
                    return itemActualizado;
                }
                return item;
            });
        } else if (productoInfo) {
            itemActualizado = { 
                producto_id: productoInfo.producto_id, 
                descripcion: productoInfo.descripcion, 
                cantidad: 1, 
                precio_unitario_registrado: productoInfo.precio_venta,
                tipo_producto: productoInfo.tipo_producto, 
                unidad_medida: productoInfo.unidad_medida,
                promociones: productoInfo.promociones
            };
            nuevoCarrito = [...carrito, itemActualizado];
        } else {
            return;
        }

        onCarritoChange(nuevoCarrito);

        const promo = itemActualizado?.promociones;
        if (promo && promo.activo && promo.tipo_promocion === 'CANTIDAD_X_CANTIDAD' && itemActualizado.cantidad < promo.valor) {
            if (itemActualizado.cantidad % promo.valor !== 0) {
                const faltantes = promo.valor - (itemActualizado.cantidad % promo.valor);
                alert(`¡ALERTA DE PROMOCIÓN!\n\nProducto: ${itemActualizado.descripcion}\nPromo: ${promo.nombre}\n\n¡Añade ${faltantes} más para aplicar el descuento!`);
            }
        }
    };

    const reducirCantidad = (productoId) => {
        const itemExistente = carrito.find(item => item.producto_id === productoId);
        if (itemExistente.cantidad === 1) {
            eliminarDelCarrito(productoId);
            return;
        }
        const nuevoCarrito = carrito.map(item => item.producto_id === productoId ? { ...item, cantidad: item.cantidad - 1 } : item);
        onCarritoChange(nuevoCarrito);
    };

    const eliminarDelCarrito = (productoId) => {
        const isAdmin = perfil?.nombre_rol?.toLowerCase() === 'administrador';
        const doRemove = () => {
            const nuevoCarrito = carrito.filter(item => item.producto_id !== productoId);
            onCarritoChange(nuevoCarrito);
        };
        if (isAdmin) {
            if (window.confirm("¿Estás seguro de que quieres quitar este producto del ticket?")) doRemove();
        } else {
            setActionToApprove(() => doRemove);
            setShowApprovalModal(true);
        }
    };

    const handleApprovalSuccess = () => {
        if (actionToApprove) actionToApprove();
        setShowApprovalModal(false);
        setActionToApprove(null);
    };

    const handleConfirmarCantidad = (producto, cantidad) => {
        const itemExistente = carrito.find(item => item.producto_id === producto.producto_id);
        let nuevoCarrito;
        if (itemExistente) {
             nuevoCarrito = carrito.map(item => item.producto_id === producto.producto_id ? { ...item, cantidad: cantidad } : item);
        } else {
            nuevoCarrito = [...carrito, { producto_id: producto.producto_id, descripcion: producto.descripcion, cantidad: cantidad, precio_unitario_registrado: producto.precio_venta, tipo_producto: producto.tipo_producto, unidad_medida: producto.unidad_medida, promociones: producto.promociones }];
        }
        onCarritoChange(nuevoCarrito);
        setProductoParaCantidad(null);
    };

    const handleConfirmarVenta = async () => {
        if (!metodoSeleccionado || carrito.length === 0 || !corteActivo || !clienteSeleccionadoId) return alert("Verifica que el carrito no esté vacío y que hayas seleccionado un cliente y método de pago.");
        const carritoParaBD = carrito.map(item => ({ producto_id: item.producto_id, cantidad: item.cantidad, precio_unitario_registrado: item.precio_unitario_registrado, impuesto_aplicado: 0, importe_total: calcularImporteFinal(item), descripcion_registrada: item.descripcion }));
        try {
            const { data: nuevaVentaId, error } = await supabase.rpc('registrar_venta_completa', { empleado_id_param: perfil.empleado_id, cliente_id_param: parseInt(clienteSeleccionadoId), metodo_pago_id_param: metodoSeleccionado, corte_id_param: corteActivo.corte_id, carrito_param: carritoParaBD });
            if (error) throw error;
            alert(`¡Venta #${nuevaVentaId} registrada exitosamente!`);
            onVentaCompleta();
            setCheckoutModalAbierto(false);
            setMontoRecibido('');
            setClienteSeleccionadoId('1');
        } catch (error) {
            alert(`Error al registrar la venta: ${error.message}`);
        }
    };
    
    // (El resto de funciones auxiliares y useEffects no necesitan cambios)
    useEffect(() => {
        if (montoRecibido) {
            const cambioCalculado = parseFloat(montoRecibido) - total;
            setCambio(cambioCalculado >= 0 ? cambioCalculado : 0);
        } else {
            setCambio(0);
        }
    }, [montoRecibido, total]);

    useEffect(() => {
        if (busquedaCliente) {
            const filtrados = clientes.filter(c => c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase()));
            setClientesFiltrados(filtrados);
        } else {
            setClientesFiltrados([]);
        }
    }, [busquedaCliente, clientes]);
    
    const handleSelectCliente = (cliente) => { setClienteSeleccionadoId(cliente.cliente_id.toString()); setBusquedaCliente(cliente.nombre); setClientesFiltrados([]); };
    const handleOpenCheckout = () => { const cliente = clientes.find(c => c.cliente_id.toString() === clienteSeleccionadoId); if (cliente) setBusquedaCliente(cliente.nombre); else { setBusquedaCliente(''); setClienteSeleccionadoId('1');} setCheckoutModalAbierto(true); };
    const clienteActual = clientes.find(c => c.cliente_id.toString() === clienteSeleccionadoId);
    if (!corteActivo) return ( <div className="pos-container" style={{textAlign: 'center', paddingTop: '50px'}}><h2 style={{color: '#dc3545'}}>La caja está cerrada</h2><p>Por favor, ve a la pestaña <strong>Caja</strong> para iniciar un nuevo turno y poder registrar ventas.</p></div> );
    
    return (
        <div className="pos-container">
            {showApprovalModal && <SupervisorApprovalModal onApprove={handleApprovalSuccess} onCancel={() => setShowApprovalModal(false)} />}
            {productoParaCantidad && <CantidadModal producto={productoParaCantidad} onConfirm={handleConfirmarCantidad} onCancel={() => setProductoParaCantidad(null)} />}
            {modalAbierto && ( <div className="modal-overlay" onClick={() => setModalAbierto(false)}> <div className="modal-content" onClick={e => e.stopPropagation()}> <h3>Buscar Producto</h3> <input type="text" className="pos-input" placeholder="Escribe para buscar..." value={terminoBusqueda} onChange={e => setTerminoBusqueda(e.target.value)} autoFocus /> <ul className="search-results-list"> {resultados.map(producto => ( <li key={producto.producto_id} onClick={() => agregarAlCarrito(producto)}> {producto.descripcion} - <strong>${parseFloat(producto.precio_venta).toFixed(2)}</strong> </li> ))} </ul> </div> </div> )}
            {checkoutModalAbierto && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Finalizar Venta</h2>
                        <h3>Total a Pagar: ${total.toFixed(2)}</h3>
                        <hr />
                        <div className="customer-selection"><label htmlFor="cliente-search">Asignar Venta a:</label><input id="cliente-search" type="text" className="pos-input" value={busquedaCliente} onChange={(e) => { setBusquedaCliente(e.target.value); if(e.target.value === '') setClienteSeleccionadoId('1'); }} placeholder="Buscar cliente..." />{clientesFiltrados.length > 0 && (<ul className="customer-search-results">{clientesFiltrados.map(cliente => (<li key={cliente.cliente_id} onClick={() => handleSelectCliente(cliente)}>{cliente.nombre}</li>))}</ul>)}</div>
                        <h4>Método de Pago</h4>
                        <div className="payment-methods">{metodosPago.map(metodo => { const isCredito = metodo.nombre.toLowerCase() === 'crédito tienda'; const isPublicoGeneral = clienteActual?.cliente_id === 1; const creditoNoPermitido = !clienteActual?.permite_credito; const isDisabled = isCredito && (isPublicoGeneral || creditoNoPermitido); return ( <button key={metodo.metodo_pago_id} className={`payment-btn ${metodoSeleccionado === metodo.metodo_pago_id ? 'selected' : ''}`} onClick={() => setMetodoSeleccionado(metodo.metodo_pago_id)} disabled={isDisabled} title={isDisabled ? 'Selecciona un cliente con crédito' : ''}>{metodo.nombre}</button> );})}</div>
                        {metodosPago.find(m => m.metodo_pago_id === metodoSeleccionado)?.nombre.toLowerCase() === 'efectivo' && (<div className="cash-payment"><label htmlFor="montoRecibido">Monto Recibido:</label><input id="montoRecibido" type="number" className="pos-input" value={montoRecibido} onChange={(e) => setMontoRecibido(e.target.value)} placeholder="0.00" /><div className="change-display">Cambio: ${cambio.toFixed(2)}</div></div>)}
                        <div className="footer" style={{ justifyContent: 'space-between' }}><button className="pos-button" style={{backgroundColor: '#6c757d'}} onClick={() => setCheckoutModalAbierto(false)}>Cancelar</button><button className="checkout-btn" onClick={handleConfirmarVenta}>Confirmar Venta</button></div>
                    </div>
                </div>
            )}
            <div className="search-bar"><button className="pos-button" onClick={() => setModalAbierto(true)}>[F10] Buscar Producto</button></div>
            <div className="table-container">
                <table className="sales-table">
                  <thead><tr><th>Cant.</th><th>Descripción</th><th>Precio Unit.</th><th>Importe</th><th>Acciones</th></tr></thead>
                  <tbody>
                    {carrito.length === 0 ? ( <tr><td colSpan="5" style={{ textAlign: 'center' }}>Ticket vacío</td></tr>) : (
                      carrito.map(item => {
                        const importeFinal = calcularImporteFinal(item);
                        const importeSinPromo = item.cantidad * item.precio_unitario_registrado;
                        const tienePromoAplicada = importeFinal < importeSinPromo;

                        return (
                        <tr key={item.producto_id}>
                          <td>{item.cantidad} {item.tipo_producto === 'GRANEL' ? item.unidad_medida || 'KG' : ''}</td>
                          <td>
                            {item.descripcion}
                            {tienePromoAplicada && (<div style={{color: '#28a745', fontSize: '0.8em', fontWeight: 'bold'}}>Promo: {item.promociones.nombre}</div>)}
                          </td>
                          <td>${parseFloat(item.precio_unitario_registrado).toFixed(2)}</td>
                          <td>
                            {tienePromoAplicada ? (<><s style={{color: '#dc3545', marginRight: '8px'}}>${importeSinPromo.toFixed(2)}</s><strong>${importeFinal.toFixed(2)}</strong></>) : (<strong>${importeFinal.toFixed(2)}</strong>)}
                          </td>
                          <td style={{display: 'flex', gap: '5px', alignItems: 'center'}}>
                            {item.tipo_producto === 'GRANEL' ? (<button onClick={() => agregarAlCarrito(item)}>Editar</button>) : (<div className="quantity-controls"><button className="quantity-btn" onClick={() => reducirCantidad(item.producto_id)}>-</button><span className="quantity-display">{item.cantidad}</span><button className="quantity-btn" onClick={() => aumentarCantidad(item.producto_id, item)}>+</button></div>)}
                            <button onClick={() => eliminarDelCarrito(item.producto_id)} style={{backgroundColor: '#dc3545', color: 'white'}} title="Quitar producto">X</button>
                          </td>
                        </tr>
                      )})
                    )}
                  </tbody>
                </table>
            </div>
            <div className="footer"><div className="total-display">Total: ${total.toFixed(2)}</div><button className="checkout-btn" onClick={handleOpenCheckout} disabled={carrito.length === 0}>Cobrar</button></div>
        </div>
    );
}