// src/components/GestionProductos.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import AddStockModal from './AddStockModal';
import './PantallaVenta.css';

const estadoInicialProducto = {
    producto_id: null,
    descripcion: '',
    codigo_barras: '',
    precio_costo: 0,
    precio_venta: 0,
    departamento_id: '',
    tipo_producto: 'UNITARIO',
    cantidad_actual: 0,
    stock_minimo: 0,
    promocion_id: null, // <-- NUEVO CAMPO AÑADIDO
};

const tiposDeProducto = [
    { value: 'UNITARIO', label: 'Por Unidad/Pza' },
    { value: 'GRANEL', label: 'A Granel (Usa Decimales)' },
    { value: 'SERVICIO', label: 'Servicio' },
    { value: 'KIT', label: 'Como Paquete (Kit)' }
];

export default function GestionProductos({ perfil }) {
    const [productos, setProductos] = useState([]);
    const [productosFiltrados, setProductosFiltrados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [terminoBusqueda, setTerminoBusqueda] = useState('');
    
    const [modalAbierto, setModalAbierto] = useState(false);
    const [productoActual, setProductoActual] = useState(estadoInicialProducto);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [departamentos, setDepartamentos] = useState([]);
    
    // --- NUEVO ESTADO PARA GUARDAR LAS PROMOCIONES ---
    const [promociones, setPromociones] = useState([]);

    // Estado para el modal de añadir stock
    const [productoParaStock, setProductoParaStock] = useState(null);

    const fetchInitialData = async () => {
        setLoading(true);
        // Obtenemos productos
        const { data: productosData, error: productosError } = await supabase
            .from('productos')
            .select(`*, departamentos ( nombre ), inventario ( cantidad_actual, stock_minimo )`)
            .order('descripcion', { ascending: true });
        
        if (productosError) console.error("Error al cargar productos:", productosError);
        else setProductos(productosData || []);

        // Obtenemos departamentos
        const { data: deptosData } = await supabase.from('departamentos').select('*').eq('activo', true);
        setDepartamentos(deptosData || []);
        
        // --- OBTENEMOS LAS PROMOCIONES ACTIVAS ---
        const { data: promosData } = await supabase.from('promociones').select('*').eq('activo', true);
        setPromociones(promosData || []);
        
        setLoading(false);
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (terminoBusqueda) {
            const busquedaLowerCase = terminoBusqueda.toLowerCase();
            const filtrados = productos.filter(producto => 
                producto.descripcion.toLowerCase().includes(busquedaLowerCase) || 
                (producto.codigo_barras || '').includes(busquedaLowerCase)
            );
            setProductosFiltrados(filtrados);
        } else {
            setProductosFiltrados([]);
        }
    }, [terminoBusqueda, productos]);
    
    const abrirModalNuevo = () => {
        setModoEdicion(false);
        setProductoActual({
            ...estadoInicialProducto,
            departamento_id: departamentos.length > 0 ? departamentos[0].departamento_id : ''
        });
        setModalAbierto(true);
    };

    const abrirModalEdicion = (producto) => {
        setModoEdicion(true);
        setProductoActual({
             ...producto,
             tipo_producto: producto.tipo_producto || 'UNITARIO',
             cantidad_actual: producto.inventario[0]?.cantidad_actual || 0,
             stock_minimo: producto.inventario[0]?.stock_minimo || 0,
             // Aseguramos que el valor nulo se maneje correctamente en el select
             promocion_id: producto.promocion_id || ''
        });
        setModalAbierto(true);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        // Si se selecciona "Sin Promoción", guardamos null en lugar de un string vacío.
        const valorFinal = name === 'promocion_id' && value === '' ? null : value;
        setProductoActual({ ...productoActual, [name]: valorFinal });
    };

    // La función de guardado ahora incluye el campo 'promocion_id'
   const handleGuardarProducto = async (e) => {
        e.preventDefault();
        try {
            if (modoEdicion) {
                // Si estamos EDITANDO, preparamos los parámetros SIN la cantidad actual
                const paramsActualizar = {
                    producto_id_param: productoActual.producto_id,
                    descripcion_param: productoActual.descripcion,
                    codigo_barras_param: productoActual.codigo_barras || null,
                    precio_costo_param: productoActual.precio_costo,
                    precio_venta_param: productoActual.precio_venta,
                    departamento_id_param: productoActual.departamento_id,
                    tipo_producto_param: productoActual.tipo_producto,
                    stock_minimo_param: productoActual.stock_minimo,
                    promocion_id_param: productoActual.promocion_id
                };

                const { error } = await supabase.rpc('actualizar_producto_con_promo', paramsActualizar);
                if (error) throw error;
                alert('¡Producto actualizado exitosamente!');

            } else {
                // Si estamos CREANDO, preparamos los parámetros CON la cantidad actual
                 const paramsCrear = {
                    descripcion_param: productoActual.descripcion,
                    codigo_barras_param: productoActual.codigo_barras || null,
                    precio_costo_param: productoActual.precio_costo,
                    precio_venta_param: productoActual.precio_venta,
                    departamento_id_param: productoActual.departamento_id,
                    tipo_producto_param: productoActual.tipo_producto,
                    cantidad_actual_param: productoActual.cantidad_actual,
                    stock_minimo_param: productoActual.stock_minimo,
                    promocion_id_param: productoActual.promocion_id
                };
                const { error } = await supabase.rpc('crear_producto_con_promo', paramsCrear);
                if (error) throw error;
                alert('¡Producto creado exitosamente!');
            }
            setModalAbierto(false);
            fetchInitialData(); // Recargamos todos los datos
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    // (El resto de funciones como handleConfirmarEntradaStock no necesitan cambios)
    const handleConfirmarEntradaStock = async (productoId, cantidad) => {
        try {
            const { error } = await supabase.rpc('registrar_entrada_stock', {
                producto_id_param: productoId,
                cantidad_param: cantidad,
                empleado_id_param: perfil.empleado_id
            });
            if (error) throw error;
            alert("Stock añadido exitosamente.");
            setProductoParaStock(null);
            fetchInitialData();
        } catch (error) {
            alert(`Error al añadir stock: ${error.message}`);
        }
    };


    if (loading) {
        return <div style={{padding: '20px'}}>Cargando...</div>;
    }

    return (
        <div className="pos-container">
            {modalAbierto && (
                <div className="modal-overlay">
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>{modoEdicion ? 'Editar Producto' : 'Añadir Nuevo Producto'}</h2>
                        <form onSubmit={handleGuardarProducto} style={{display: 'flex', flexDirection:'column', gap:'10px'}}>
                            {/* ... (campos existentes como descripción, precios, etc.) ... */}
                            <label>Descripción:</label>
                            <input type="text" name="descripcion" value={productoActual.descripcion} onChange={handleInputChange} required className="pos-input"/>
                            
                            <label>Se vende por:</label>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                {tiposDeProducto.map(tipo => ( <label key={tipo.value}><input type="radio" name="tipo_producto" value={tipo.value} checked={productoActual.tipo_producto === tipo.value} onChange={handleInputChange}/> {tipo.label}</label>))}
                            </div>
                            
                            <label>Código de Barras:</label>
                            <input type="text" name="codigo_barras" value={productoActual.codigo_barras || ''} onChange={handleInputChange} className="pos-input"/>
                            
                            <label>Precio Costo:</label>
                            <input type="number" step="0.01" name="precio_costo" value={productoActual.precio_costo} onChange={handleInputChange} required className="pos-input"/>
                            
                            <label>Precio Venta:</label>
                            <input type="number" step="0.01" name="precio_venta" value={productoActual.precio_venta} onChange={handleInputChange} required className="pos-input"/>

                            <label>Cantidad Actual:</label>
                            <input type="number" step="any" name="cantidad_actual" value={productoActual.cantidad_actual} onChange={handleInputChange} required disabled={modoEdicion} className="pos-input"/>
                            
                            <label>Stock Mínimo:</label>
                            <input type="number" step="any" name="stock_minimo" value={productoActual.stock_minimo} onChange={handleInputChange} required className="pos-input"/>

                            <label>Departamento:</label>
                            <select name="departamento_id" value={productoActual.departamento_id} onChange={handleInputChange} required className="pos-input">
                                {departamentos.map(dep => <option key={dep.departamento_id} value={dep.departamento_id}>{dep.nombre}</option> )}
                            </select>

                            {/* --- NUEVO CAMPO PARA ASIGNAR PROMOCIÓN --- */}
                            <hr />
                            <label style={{fontWeight: 'bold'}}>Asignar Promoción (Opcional):</label>
                            <select name="promocion_id" value={productoActual.promocion_id || ''} onChange={handleInputChange} className="pos-input">
                                <option value="">-- Sin Promoción --</option>
                                {promociones.map(promo => (
                                    <option key={promo.promocion_id} value={promo.promocion_id}>
                                        {promo.nombre} ({promo.tipo_promocion})
                                    </option>
                                ))}
                            </select>
                            <hr />

                            <div className="footer" style={{marginTop: '20px'}}>
                                <button type="button" className="pos-button" onClick={() => setModalAbierto(false)}>Cancelar</button>
                                <button type="submit" className="checkout-btn">{modoEdicion ? 'Guardar Cambios' : 'Guardar Producto'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {productoParaStock && (
                <AddStockModal producto={productoParaStock} onConfirm={handleConfirmarEntradaStock} onCancel={() => setProductoParaStock(null)} />
            )}

            {/* ... (El resto del JSX de la tabla principal no cambia) ... */}
             <div className="search-bar" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Gestión de Productos</h2>
                <input type="text" placeholder="Buscar producto por nombre o código..." className="pos-input" style={{ width: '40%' }} value={terminoBusqueda} onChange={(e) => setTerminoBusqueda(e.target.value)}/>
                {perfil?.nombre_rol?.toLowerCase() === 'administrador' && (
                    <button className="pos-button" onClick={abrirModalNuevo}>Añadir Nuevo Producto</button>
                )}
            </div>
            
            {terminoBusqueda ? (
                <div className="table-container">
                    <table className="sales-table">
                        <thead><tr><th>Código</th><th>Descripción</th><th>Stock</th><th>Precio Venta</th><th>Acciones</th></tr></thead>
                        <tbody>
                            {productosFiltrados.map(producto => (
                                <tr key={producto.producto_id}>
                                    <td>{producto.codigo_barras || 'N/A'}</td>
                                    <td>{producto.descripcion}</td>
                                    <td>{producto.inventario[0]?.cantidad_actual || 0} {producto.unidad_medida}</td>
                                    <td>${parseFloat(producto.precio_venta).toFixed(2)}</td>
                                    <td style={{display: 'flex', gap: '5px'}}>
                                        {perfil?.nombre_rol?.toLowerCase() === 'administrador' && (
                                            <>
                                                <button onClick={() => abrirModalEdicion(producto)}>Editar</button>
                                                <button onClick={() => setProductoParaStock(producto)} style={{backgroundColor: '#17a2b8', color: 'white'}}>Añadir Stock</button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="initial-message"><h3>Utiliza la barra de búsqueda para encontrar un producto.</h3></div>
            )}
        </div>
    );
}