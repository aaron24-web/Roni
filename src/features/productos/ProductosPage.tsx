// Pantalla de Productos. Ruta compartida (administrador y cajero).
//
// Matriz de roles: crear/editar productos y precios es solo del
// administrador; el cajero sí puede registrar entrada de stock.

import { useState, useMemo, type FormEvent, type ChangeEvent } from 'react'
import {
    useProductos,
    useCrearProducto,
    useActualizarProducto,
    useRegistrarEntradaStock,
    TIPOS_DE_PRODUCTO,
    type ProductoConDetalle,
} from './useProductos'
import { useDepartamentos } from '../departamentos/useDepartamentos'
import { usePromociones } from '../promociones/usePromociones'
import AddStockModal from './AddStockModal'
import { useAuth } from '../../shared/context/auth-context'
import '../../shared/styles/pos.css'

interface Formulario {
    productoId: number | null
    descripcion: string
    codigoBarras: string
    precioCosto: string
    precioVenta: string
    departamentoId: string
    tipoProducto: string
    cantidadActual: string
    stockMinimo: string
    promocionId: string
}

const FORMULARIO_VACIO: Formulario = {
    productoId: null,
    descripcion: '',
    codigoBarras: '',
    precioCosto: '0',
    precioVenta: '0',
    departamentoId: '',
    tipoProducto: 'UNITARIO',
    cantidadActual: '0',
    stockMinimo: '0',
    promocionId: '',
}

export default function ProductosPage() {
    const { perfil, esAdmin } = useAuth()
    const { data: productos = [], isPending, error } = useProductos()
    const { data: departamentos = [] } = useDepartamentos()
    const { data: promociones = [] } = usePromociones()
    const crear = useCrearProducto()
    const actualizar = useActualizarProducto()
    const entradaStock = useRegistrarEntradaStock()

    const [modalAbierto, setModalAbierto] = useState(false)
    const [formulario, setFormulario] = useState<Formulario>(FORMULARIO_VACIO)
    const [productoParaStock, setProductoParaStock] = useState<ProductoConDetalle | null>(null)
    const [terminoBusqueda, setTerminoBusqueda] = useState('')

    const editando = formulario.productoId !== null
    const guardando = crear.isPending || actualizar.isPending

    const promocionesActivas = useMemo(
        () => promociones.filter(p => p.activo),
        [promociones],
    )

    // El filtrado es local: la lista completa ya está en caché.
    const productosFiltrados = useMemo(() => {
        if (!terminoBusqueda) return []
        const termino = terminoBusqueda.toLowerCase()
        return productos.filter(producto =>
            producto.descripcion.toLowerCase().includes(termino) ||
            (producto.codigo_barras ?? '').includes(termino)
        )
    }, [terminoBusqueda, productos])

    const abrirNuevo = () => {
        setFormulario({
            ...FORMULARIO_VACIO,
            departamentoId: departamentos[0] ? String(departamentos[0].departamento_id) : '',
        })
        setModalAbierto(true)
    }

    const abrirEdicion = (producto: ProductoConDetalle) => {
        setFormulario({
            productoId: producto.producto_id,
            descripcion: producto.descripcion,
            codigoBarras: producto.codigo_barras ?? '',
            precioCosto: String(producto.precio_costo ?? 0),
            precioVenta: String(producto.precio_venta ?? 0),
            departamentoId: String(producto.departamento_id ?? ''),
            tipoProducto: producto.tipo_producto ?? 'UNITARIO',
            cantidadActual: String(producto.inventario[0]?.cantidad_actual ?? 0),
            stockMinimo: String(producto.inventario[0]?.stock_minimo ?? 0),
            promocionId: producto.promocion_id ? String(producto.promocion_id) : '',
        })
        setModalAbierto(true)
    }

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormulario(prev => ({ ...prev, [name]: value }))
    }

    const handleGuardar = async (e: FormEvent) => {
        e.preventDefault()
        const datos = {
            descripcion: formulario.descripcion,
            codigoBarras: formulario.codigoBarras || null,
            precioCosto: parseFloat(formulario.precioCosto) || 0,
            precioVenta: parseFloat(formulario.precioVenta) || 0,
            departamentoId: parseInt(formulario.departamentoId, 10),
            tipoProducto: formulario.tipoProducto,
            stockMinimo: parseFloat(formulario.stockMinimo) || 0,
            promocionId: formulario.promocionId ? parseInt(formulario.promocionId, 10) : null,
        }
        try {
            if (editando && formulario.productoId !== null) {
                await actualizar.mutateAsync({ id: formulario.productoId, datos })
                alert('¡Producto actualizado exitosamente!')
            } else {
                await crear.mutateAsync({
                    datos,
                    cantidadInicial: parseFloat(formulario.cantidadActual) || 0,
                })
                alert('¡Producto creado exitosamente!')
            }
            setModalAbierto(false)
        } catch (err) {
            alert(`Error: ${(err as Error).message}`)
        }
    }

    const handleEntradaStock = async (productoId: number, cantidad: number) => {
        if (!perfil) return
        try {
            await entradaStock.mutateAsync({ productoId, cantidad, empleadoId: perfil.empleado_id })
            setProductoParaStock(null)
            alert('Stock añadido exitosamente.')
        } catch (err) {
            alert(`Error al añadir stock: ${(err as Error).message}`)
        }
    }

    return (
        <div className="pos-container">
            {modalAbierto && (
                <div className="modal-overlay">
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>{editando ? 'Editar Producto' : 'Añadir Nuevo Producto'}</h2>
                        <form onSubmit={handleGuardar} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <label>Descripción:</label>
                            <input type="text" name="descripcion" value={formulario.descripcion} onChange={handleChange} required className="pos-input" />

                            <label>Se vende por:</label>
                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '10px' }}>
                                {TIPOS_DE_PRODUCTO.map(tipo => (
                                    <label key={tipo.value}>
                                        <input
                                            type="radio"
                                            name="tipoProducto"
                                            value={tipo.value}
                                            checked={formulario.tipoProducto === tipo.value}
                                            onChange={handleChange}
                                        /> {tipo.label}
                                    </label>
                                ))}
                            </div>

                            <label>Código de Barras:</label>
                            <input type="text" name="codigoBarras" value={formulario.codigoBarras} onChange={handleChange} className="pos-input" />
                            <label>Precio Costo:</label>
                            <input type="number" step="0.01" name="precioCosto" value={formulario.precioCosto} onChange={handleChange} required className="pos-input" />
                            <label>Precio Venta:</label>
                            <input type="number" step="0.01" name="precioVenta" value={formulario.precioVenta} onChange={handleChange} required className="pos-input" />

                            {!editando && (
                                <>
                                    <label>Cantidad Inicial:</label>
                                    <input type="number" step="any" name="cantidadActual" value={formulario.cantidadActual} onChange={handleChange} required className="pos-input" />
                                </>
                            )}

                            <label>Stock Mínimo:</label>
                            <input type="number" step="any" name="stockMinimo" value={formulario.stockMinimo} onChange={handleChange} required className="pos-input" />

                            <label>Departamento:</label>
                            <select name="departamentoId" value={formulario.departamentoId} onChange={handleChange} required className="pos-input">
                                {departamentos.map(departamento => (
                                    <option key={departamento.departamento_id} value={departamento.departamento_id}>
                                        {departamento.nombre}
                                    </option>
                                ))}
                            </select>

                            <label>Asignar Promoción (Opcional):</label>
                            <select name="promocionId" value={formulario.promocionId} onChange={handleChange} className="pos-input">
                                <option value="">-- Sin Promoción --</option>
                                {promocionesActivas.map(promocion => (
                                    <option key={promocion.promocion_id} value={promocion.promocion_id}>
                                        {promocion.nombre}
                                    </option>
                                ))}
                            </select>

                            <div className="footer" style={{ marginTop: '20px' }}>
                                <button type="button" className="pos-button" style={{ backgroundColor: '#6c757d' }} onClick={() => setModalAbierto(false)} disabled={guardando}>Cancelar</button>
                                <button type="submit" className="checkout-btn" disabled={guardando}>
                                    {guardando ? 'Guardando...' : (editando ? 'Guardar Cambios' : 'Guardar Producto')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {productoParaStock && (
                <AddStockModal
                    producto={productoParaStock}
                    onConfirm={handleEntradaStock}
                    onCancel={() => setProductoParaStock(null)}
                    guardando={entradaStock.isPending}
                />
            )}

            <div className="search-bar" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Gestión de Productos</h2>
                <input
                    type="text"
                    placeholder="Buscar producto por nombre o código..."
                    className="pos-input"
                    style={{ width: '40%' }}
                    value={terminoBusqueda}
                    onChange={(e) => setTerminoBusqueda(e.target.value)}
                />
                {esAdmin && <button className="pos-button" onClick={abrirNuevo}>Añadir Nuevo Producto</button>}
            </div>

            {isPending && <p>Cargando productos...</p>}
            {error && <p style={{ color: '#dc3545' }}>Error al cargar: {error.message}</p>}

            {!isPending && !error && (
                terminoBusqueda ? (
                    <div className="table-container">
                        <table className="sales-table">
                            <thead>
                                <tr><th>Código de Barras</th><th>Descripción</th><th>Stock Actual</th><th>Precio Venta</th><th>Acciones</th></tr>
                            </thead>
                            <tbody>
                                {productosFiltrados.length === 0 ? (
                                    <tr><td colSpan={5} style={{ textAlign: 'center' }}>Sin resultados para “{terminoBusqueda}”.</td></tr>
                                ) : productosFiltrados.map(producto => (
                                    <tr key={producto.producto_id}>
                                        <td>{producto.codigo_barras || 'N/A'}</td>
                                        <td>{producto.descripcion}</td>
                                        <td>{producto.inventario[0]?.cantidad_actual ?? 0} {producto.unidad_medida}</td>
                                        <td>${Number(producto.precio_venta).toFixed(2)}</td>
                                        <td style={{ display: 'flex', gap: '5px' }}>
                                            {esAdmin && <button onClick={() => abrirEdicion(producto)}>Editar</button>}
                                            {/* Entrada de stock: disponible para cajeros y administradores */}
                                            <button
                                                onClick={() => setProductoParaStock(producto)}
                                                style={{ backgroundColor: '#17a2b8', color: 'white' }}
                                            >Añadir Stock</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="initial-message">
                        <h3>Utiliza la barra de búsqueda para encontrar un producto.</h3>
                    </div>
                )
            )}
        </div>
    )
}
