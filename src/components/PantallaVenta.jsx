// src/components/PantallaVenta.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './PantallaVenta.css';

export default function PantallaVenta({ perfil, carrito, onCarritoChange, onVentaCompleta }) {
    // El estado del carrito y su lógica principal ahora se manejan en App.jsx.
    // Este componente solo recibe el carrito actual y notifica los cambios.

    const [total, setTotal] = useState(0);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [terminoBusqueda, setTerminoBusqueda] = useState('');
    const [resultados, setResultados] = useState([]);
    const [checkoutModalAbierto, setCheckoutModalAbierto] = useState(false);
    const [metodosPago, setMetodosPago] = useState([]);
    const [metodoSeleccionado, setMetodoSeleccionado] = useState(null);
    const [montoRecibido, setMontoRecibido] = useState('');
    const [cambio, setCambio] = useState(0);

    // --- EFECTOS (LÓGICA) ---

    // Efecto para buscar productos
    useEffect(() => {
        if (!modalAbierto || terminoBusqueda.length < 2) {
            setResultados([]);
            return;
        }
        const timer = setTimeout(async () => {
            const { data } = await supabase.from('productos').select('producto_id, descripcion, precio_venta, codigo_barras').or(`descripcion.ilike.%${terminoBusqueda}%,codigo_barras.eq.${terminoBusqueda}`).limit(10);
            setResultados(data || []);
        }, 300);
        return () => clearTimeout(timer);
    }, [terminoBusqueda, modalAbierto]);

    // Efecto para calcular el total del carrito (usa el carrito de las props)
    useEffect(() => {
        const nuevoTotal = carrito.reduce((sum, item) => sum + item.importe, 0);
        setTotal(nuevoTotal);
    }, [carrito]);

    // Efecto para obtener los métodos de pago de la BD
    useEffect(() => {
        const fetchMetodosPago = async () => {
            const { data, error } = await supabase.from('metodospago').select('*').eq('activo', true);
            if (error) {
                console.error("Error al cargar métodos de pago", error);
            } else {
                setMetodosPago(data);
                const efectivo = data.find(m => m.nombre.toLowerCase() === 'efectivo');
                if (efectivo) setMetodoSeleccionado(efectivo.metodo_pago_id);
            }
        };
        fetchMetodosPago();
    }, []);

    // Efecto para calcular el cambio
    useEffect(() => {
        if (montoRecibido) {
            const cambioCalculado = parseFloat(montoRecibido) - total;
            setCambio(cambioCalculado >= 0 ? cambioCalculado : 0);
        } else {
            setCambio(0);
        }
    }, [montoRecibido, total]);


    // --- FUNCIONES (Acciones) ---

    const aumentarCantidad = (productoId, productoInfo = null) => {
        const itemExistente = carrito.find(item => item.producto_id === productoId);
        let nuevoCarrito;
        if (itemExistente) {
            nuevoCarrito = carrito.map(item =>
                item.producto_id === productoId
                    ? { ...item, cantidad: item.cantidad + 1, importe: (item.cantidad + 1) * item.precio_unitario_registrado }
                    : item
            );
        } else if (productoInfo) {
            nuevoCarrito = [...carrito, {
                producto_id: productoInfo.producto_id,
                descripcion: productoInfo.descripcion,
                cantidad: 1,
                precio_unitario_registrado: productoInfo.precio_venta,
                importe: productoInfo.precio_venta
            }];
        }
        onCarritoChange(nuevoCarrito); // Notificamos a App.jsx del cambio
    };

    const reducirCantidad = (productoId) => {
        const itemExistente = carrito.find(item => item.producto_id === productoId);
        let nuevoCarrito;
        if (itemExistente.cantidad === 1) {
            nuevoCarrito = carrito.filter(item => item.producto_id !== productoId);
        } else {
            nuevoCarrito = carrito.map(item =>
                item.producto_id === productoId
                    ? { ...item, cantidad: item.cantidad - 1, importe: (item.cantidad - 1) * item.precio_unitario_registrado }
                    : item
            );
        }
        onCarritoChange(nuevoCarrito); // Notificamos a App.jsx del cambio
    };

    const agregarAlCarrito = (producto) => {
        aumentarCantidad(producto.producto_id, producto);
        setModalAbierto(false);
        setTerminoBusqueda('');
        setResultados([]);
    };
    
    const handleConfirmarVenta = async () => {
        if (!metodoSeleccionado) return alert("Por favor, selecciona un método de pago.");
        if (carrito.length === 0) return alert("El carrito está vacío.");

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
                cliente_id_param: 1, // Público en General por defecto
                metodo_pago_id_param: metodoSeleccionado,
                carrito_param: carritoParaBD
            });

            if (error) throw error;

            alert(`¡Venta #${nuevaVentaId} registrada exitosamente!`);

            onVentaCompleta(); // Notificamos a App.jsx que la venta terminó para que cierre el ticket
            setCheckoutModalAbierto(false);
            setMontoRecibido('');
        } catch (error) {
            console.error("Error al registrar la venta:", error);
            alert(`Error al registrar la venta: ${error.message}`);
        }
    };


    // --- RENDERIZADO (JSX) ---
    return (
        <div className="pos-container">
            {/* Modal de Búsqueda */}
            {modalAbierto && (
                <div className="modal-overlay" onClick={() => setModalAbierto(false)}>
                  <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <h3>Buscar Producto</h3>
                    <input type="text" className="pos-input" placeholder="Escribe para buscar..." value={terminoBusqueda} onChange={e => setTerminoBusqueda(e.target.value)} autoFocus />
                    <ul className="search-results-list" style={{ position: 'relative', width: '100%' }}>
                      {resultados.map(producto => (
                        <li key={producto.producto_id} onClick={() => agregarAlCarrito(producto)}>
                          {producto.descripcion} - <strong>${producto.precio_venta.toFixed(2)}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
            )}

            {/* Modal de Pago */}
            {checkoutModalAbierto && (
                <div className="modal-overlay">
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>Finalizar Venta</h2>
                        <h3>Total a Pagar: ${total.toFixed(2)}</h3>
                        <hr />
                        
                        <h4>Método de Pago</h4>
                        <div className="payment-methods">
                            {metodosPago.map(metodo => (
                                <button
                                    key={metodo.metodo_pago_id}
                                    className={`payment-btn ${metodoSeleccionado === metodo.metodo_pago_id ? 'selected' : ''}`}
                                    onClick={() => setMetodoSeleccionado(metodo.metodo_pago_id)}
                                >
                                    {metodo.nombre}
                                </button>
                            ))}
                        </div>

                        {metodosPago.find(m => m.metodo_pago_id === metodoSeleccionado)?.nombre.toLowerCase() === 'efectivo' && (
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
                                <div className="change-display">
                                    Cambio: ${cambio.toFixed(2)}
                                </div>
                            </div>
                        )}
                        
                        <div className="footer" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                            <button className="pos-button" style={{backgroundColor: '#6c757d'}} onClick={() => setCheckoutModalAbierto(false)}>Cancelar</button>
                            <button className="checkout-btn" onClick={handleConfirmarVenta}>Confirmar Venta</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pantalla Principal */}
            <div className="search-bar">
                <button className="pos-button" onClick={() => setModalAbierto(true)}>
                    [F10] Buscar Producto
                </button>
            </div>
            <div className="table-container">
                <table className="sales-table">
                  <thead>
                    <tr>
                      <th>Cant.</th>
                      <th>Descripción</th>
                      <th>Precio Unit.</th>
                      <th>Importe</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {carrito.length === 0 ? (
                      <tr><td colSpan="5" style={{ textAlign: 'center' }}>Ticket vacío</td></tr>
                    ) : (
                      carrito.map(item => (
                        <tr key={item.producto_id}>
                          <td>{item.cantidad}</td>
                          <td>{item.descripcion}</td>
                          <td>${item.precio_unitario_registrado.toFixed(2)}</td>
                          <td>${item.importe.toFixed(2)}</td>
                          <td>
                            <div className="quantity-controls">
                              <button className="quantity-btn" onClick={() => reducirCantidad(item.producto_id)}>-</button>
                              <span className="quantity-display">{item.cantidad}</span>
                              <button className="quantity-btn" onClick={() => aumentarCantidad(item.producto_id)}>+</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
            </div>
            <div className="footer">
                <div className="total-display">
                    Total: ${total.toFixed(2)}
                </div>
                <button 
                  className="checkout-btn" 
                  onClick={() => setCheckoutModalAbierto(true)}
                  disabled={carrito.length === 0}
                >
                    Cobrar
                </button>
            </div>
        </div>
    );
}