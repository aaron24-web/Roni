// src/components/PantallaVenta.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import CantidadModal from './CantidadModal';
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

    useEffect(() => {
        const fetchInitialData = async () => {
            const { data: clientesData, error: clientesError } = await supabase
                .from('clientes')
                .select('cliente_id, nombre, permite_credito')
                .eq('activo', true)
                .order('nombre');
            if (clientesError) console.error("Error al cargar clientes:", clientesError);
            else setClientes(clientesData || []);

            const { data: metodosData, error: metodosError } = await supabase
                .from('metodospago')
                .select('*')
                .eq('activo', true);
            if (metodosError) console.error("Error al cargar métodos de pago:", metodosError);
            else {
                setMetodosPago(metodosData || []);
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
            const { data } = await supabase.from('productos').select('*, departamentos ( nombre )').or(`descripcion.ilike.%${terminoBusqueda}%,codigo_barras.eq.${terminoBusqueda}`).limit(10);
            setResultados(data || []);
        }, 300);
        return () => clearTimeout(timer);
    }, [terminoBusqueda, modalAbierto]);

    useEffect(() => {
        const nuevoTotal = carrito.reduce((sum, item) => sum + item.importe, 0);
        setTotal(nuevoTotal);
    }, [carrito]);

    useEffect(() => {
        if (montoRecibido) {
            const cambioCalculado = parseFloat(montoRecibido) - total;
            setCambio(cambioCalculado >= 0 ? cambioCalculado : 0);
        } else {
            setCambio(0);
        }
    }, [montoRecibido, total]);

    const aumentarCantidad = (productoId, productoInfo = null) => {
        const itemExistente = carrito.find(item => item.producto_id === productoId);
        let nuevoCarrito;
        if (itemExistente) {
            nuevoCarrito = carrito.map(item => item.producto_id === productoId ? { ...item, cantidad: item.cantidad + 1, importe: (item.cantidad + 1) * item.precio_unitario_registrado } : item);
        } else if (productoInfo) {
            nuevoCarrito = [...carrito, {
                producto_id: productoInfo.producto_id,
                descripcion: productoInfo.descripcion,
                cantidad: 1,
                precio_unitario_registrado: productoInfo.precio_venta,
                importe: productoInfo.precio_venta,
                tipo_producto: productoInfo.tipo_producto,
                unidad_medida: productoInfo.unidad_medida
            }];
        }
        onCarritoChange(nuevoCarrito);
    };

    const reducirCantidad = (productoId) => {
        const itemExistente = carrito.find(item => item.producto_id === productoId);
        let nuevoCarrito;
        if (itemExistente.cantidad === 1) {
            nuevoCarrito = carrito.filter(item => item.producto_id !== productoId);
        } else {
            nuevoCarrito = carrito.map(item => item.producto_id === productoId ? { ...item, cantidad: item.cantidad - 1, importe: (item.cantidad - 1) * item.precio_unitario_registrado } : item);
        }
        onCarritoChange(nuevoCarrito);
    };

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
    
    const handleConfirmarCantidad = (producto, cantidad) => {
        const itemExistente = carrito.find(item => item.producto_id === producto.producto_id);
        let nuevoCarrito;
        if (itemExistente) {
             nuevoCarrito = carrito.map(item => item.producto_id === producto.producto_id ? { ...item, cantidad: cantidad, importe: cantidad * item.precio_unitario_registrado } : item);
        } else {
            nuevoCarrito = [...carrito, {
                producto_id: producto.producto_id,
                descripcion: producto.descripcion,
                cantidad: cantidad,
                precio_unitario_registrado: producto.precio_venta,
                importe: cantidad * producto.precio_venta,
                tipo_producto: producto.tipo_producto,
                unidad_medida: producto.unidad_medida
            }];
        }
        onCarritoChange(nuevoCarrito);
        setProductoParaCantidad(null);
    };

    const handleConfirmarVenta = async () => {
        if (!metodoSeleccionado) return alert("Por favor, selecciona un método de pago.");
        if (carrito.length === 0) return alert("El carrito está vacío.");
        if (!corteActivo) return alert("Error: No hay una caja activa.");

        const carritoParaBD = carrito.map(item => ({
            producto_id: item.producto_id,
            cantidad: item.cantidad,
            precio_unitario_registrado: item.precio_unitario_registrado,
            impuesto_aplicado: 0,
            importe_total: item.importe,
            descripcion_registrada: item.descripcion
        }));

        try {
            const { data: nuevaVentaId, error } = await supabase.rpc('registrar_venta_completa', {
                empleado_id_param: perfil.empleado_id,
                cliente_id_param: parseInt(clienteSeleccionadoId),
                metodo_pago_id_param: metodoSeleccionado,
                corte_id_param: corteActivo.corte_id,
                carrito_param: carritoParaBD
            });

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

    const clienteActual = clientes.find(c => c.cliente_id.toString() === clienteSeleccionadoId);

    if (!corteActivo) {
        return ( <div className="pos-container" style={{textAlign: 'center', paddingTop: '50px'}}><h2 style={{color: '#dc3545'}}>La caja está cerrada</h2><p>Por favor, ve a la pestaña <strong>Caja</strong> para iniciar un nuevo turno y poder registrar ventas.</p></div> );
    }
    
    return (
        <div className="pos-container">
            {productoParaCantidad && <CantidadModal producto={productoParaCantidad} onConfirm={handleConfirmarCantidad} onCancel={() => setProductoParaCantidad(null)} />}
            
            {modalAbierto && (
                <div className="modal-overlay" onClick={() => setModalAbierto(false)}>
                  <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <h3>Buscar Producto</h3>
                    <input type="text" className="pos-input" placeholder="Escribe para buscar..." value={terminoBusqueda} onChange={e => setTerminoBusqueda(e.target.value)} autoFocus />
                    <ul className="search-results-list" style={{ position: 'relative', width: '100%' }}>
                      {resultados.map(producto => (
                        <li key={producto.producto_id} onClick={() => agregarAlCarrito(producto)}>
                          {producto.descripcion} - <strong>${parseFloat(producto.precio_venta).toFixed(2)}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
            )}

            {checkoutModalAbierto && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Finalizar Venta</h2>
                        <h3>Total a Pagar: ${total.toFixed(2)}</h3>
                        <hr />
                        <div className="customer-selection">
                            <label htmlFor="cliente">Asignar Venta a:</label>
                            <select id="cliente" value={clienteSeleccionadoId} onChange={(e) => setClienteSeleccionadoId(e.target.value)} className="pos-input">
                                {clientes.map(cliente => (
                                    <option key={cliente.cliente_id} value={cliente.cliente_id}>{cliente.nombre}</option>
                                ))}
                            </select>
                        </div>
                        <h4>Método de Pago</h4>
                        <div className="payment-methods">
                            {metodosPago.map(metodo => {
                                const isCredito = metodo.nombre.toLowerCase() === 'crédito tienda';
                                const isPublicoGeneral = clienteActual?.cliente_id === 1;
                                const creditoNoPermitido = !clienteActual?.permite_credito;
                                const isDisabled = isCredito && (isPublicoGeneral || creditoNoPermitido);
                                return (
                                    <button
                                        key={metodo.metodo_pago_id}
                                        className={`payment-btn ${metodoSeleccionado === metodo.metodo_pago_id ? 'selected' : ''}`}
                                        onClick={() => setMetodoSeleccionado(metodo.metodo_pago_id)}
                                        disabled={isDisabled}
                                        title={isDisabled ? 'Selecciona un cliente con crédito permitido' : ''}
                                    >
                                        {metodo.nombre}
                                    </button>
                                );
                            })}
                        </div>
                        {metodosPago.find(m => m.metodo_pago_id === metodoSeleccionado)?.nombre.toLowerCase() === 'efectivo' && (
                            <div className="cash-payment">
                                <label htmlFor="montoRecibido">Monto Recibido:</label>
                                <input id="montoRecibido" type="number" className="pos-input" value={montoRecibido} onChange={(e) => setMontoRecibido(e.target.value)} placeholder="0.00" />
                                <div className="change-display">Cambio: ${cambio.toFixed(2)}</div>
                            </div>
                        )}
                        <div className="footer" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                            <button className="pos-button" style={{backgroundColor: '#6c757d'}} onClick={() => setCheckoutModalAbierto(false)}>Cancelar</button>
                            <button className="checkout-btn" onClick={handleConfirmarVenta}>Confirmar Venta</button>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="search-bar">
                <button className="pos-button" onClick={() => setModalAbierto(true)}>[F10] Buscar Producto</button>
            </div>
            <div className="table-container">
                <table className="sales-table">
                  <thead>
                    <tr><th>Cant.</th><th>Descripción</th><th>Precio Unit.</th><th>Importe</th><th>Acciones</th></tr>
                  </thead>
                  <tbody>
                    {carrito.length === 0 ? (
                      <tr><td colSpan="5" style={{ textAlign: 'center' }}>Ticket vacío</td></tr>
                    ) : (
                      carrito.map(item => (
                        <tr key={item.producto_id}>
                          <td>{item.cantidad} {item.tipo_producto === 'GRANEL' ? item.unidad_medida || 'KG' : ''}</td>
                          <td>{item.descripcion}</td>
                          <td>${parseFloat(item.precio_unitario_registrado).toFixed(2)}</td>
                          <td>${parseFloat(item.importe).toFixed(2)}</td>
                          <td>
                            {item.tipo_producto === 'GRANEL' ? (
                                <button onClick={() => agregarAlCarrito(item)}>Editar Cant.</button>
                            ) : (
                                <div className="quantity-controls">
                                  <button className="quantity-btn" onClick={() => reducirCantidad(item.producto_id)}>-</button>
                                  <span className="quantity-display">{item.cantidad}</span>
                                  <button className="quantity-btn" onClick={() => aumentarCantidad(item.producto_id)}>+</button>
                                </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
            </div>
            <div className="footer">
                <div className="total-display">Total: ${total.toFixed(2)}</div>
                <button className="checkout-btn" onClick={() => setCheckoutModalAbierto(true)} disabled={carrito.length === 0}>Cobrar</button>
            </div>
        </div>
    );
}