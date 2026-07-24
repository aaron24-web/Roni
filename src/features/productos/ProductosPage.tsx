// Pantalla de Productos. Ruta compartida (administrador y cajero).
//
// Matriz de roles: crear/editar productos y precios es solo del
// administrador; el cajero sí puede registrar entrada de stock.

import { useState, useMemo, type FormEvent, type ChangeEvent } from 'react'
import {
    useProductos,
    useComponentesKit,
    useCrearProducto,
    useActualizarProducto,
    useRegistrarEntradaStock,
    unidadesArmables,
    TIPOS_DE_PRODUCTO,
    type ProductoConDetalle,
    type ComponenteKit,
    type ComponenteKitDetalle,
} from './useProductos'
import { useDepartamentos } from '../departamentos/useDepartamentos'
import { usePromociones } from '../promociones/usePromociones'
import AddStockModal from './AddStockModal'
import EditorContenidoPaquete from './EditorContenidoPaquete'
import { useAuth } from '../../shared/context/auth-context'
import { useToast } from '../../shared/components/feedback/toast-context'
import Modal, { BotonCancelarModal } from '../../shared/components/Modal'
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
    componentes: ComponenteKit[]
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
    componentes: [],
}

const esPaquete = (tipoProducto: string | null | undefined) => tipoProducto === 'KIT'

/**
 * Ni los servicios (fotocopias, impresiones...) ni los paquetes tienen
 * existencias propias: el servicio no lleva inventario y el paquete descuenta
 * las de su contenido al venderse (migraciones 015 y 016).
 */
const controlaStock = (tipoProducto: string | null | undefined) =>
    (tipoProducto ?? 'UNITARIO') !== 'SERVICIO' && !esPaquete(tipoProducto)

/** Un producto tiene stock bajo si su existencia está en o bajo el mínimo. */
const esStockBajo = (producto: ProductoConDetalle) => {
    if (!controlaStock(producto.tipo_producto)) return false
    const cantidad = producto.inventario[0]?.cantidad_actual ?? 0
    const minimo = producto.inventario[0]?.stock_minimo ?? 0
    return cantidad <= minimo
}

export default function ProductosPage() {
    const { perfil, esAdmin } = useAuth()
    const { data: productos = [], isPending, error } = useProductos()
    const { data: componentesPorKit } = useComponentesKit()
    const { data: departamentos = [] } = useDepartamentos()
    const { data: promociones = [] } = usePromociones()
    const crear = useCrearProducto()
    const actualizar = useActualizarProducto()
    const entradaStock = useRegistrarEntradaStock()
    const toast = useToast()

    const [modalAbierto, setModalAbierto] = useState(false)
    const [formulario, setFormulario] = useState<Formulario>(FORMULARIO_VACIO)
    const [productoParaStock, setProductoParaStock] = useState<ProductoConDetalle | null>(null)

    // Filtros (todo el filtrado es local: el catálogo completo ya está en caché).
    const [terminoBusqueda, setTerminoBusqueda] = useState('')
    const [departamentoFiltro, setDepartamentoFiltro] = useState('')
    const [tipoFiltro, setTipoFiltro] = useState('')
    const [soloStockBajo, setSoloStockBajo] = useState(false)
    const [soloConPromo, setSoloConPromo] = useState(false)

    const editando = formulario.productoId !== null
    const guardando = crear.isPending || actualizar.isPending

    const promocionesActivas = useMemo(
        () => promociones.filter(p => p.activo),
        [promociones],
    )

    const productosFiltrados = useMemo(() => {
        const termino = terminoBusqueda.trim().toLowerCase()
        return productos.filter(producto => {
            if (termino) {
                const coincide =
                    producto.descripcion.toLowerCase().includes(termino) ||
                    (producto.codigo_barras ?? '').toLowerCase().includes(termino)
                if (!coincide) return false
            }
            if (departamentoFiltro && String(producto.departamento_id) !== departamentoFiltro) return false
            if (tipoFiltro && (producto.tipo_producto ?? '') !== tipoFiltro) return false
            if (soloStockBajo && !esStockBajo(producto)) return false
            if (soloConPromo && !producto.promocion_id) return false
            return true
        })
    }, [productos, terminoBusqueda, departamentoFiltro, tipoFiltro, soloStockBajo, soloConPromo])

    const hayFiltros = Boolean(
        terminoBusqueda || departamentoFiltro || tipoFiltro || soloStockBajo || soloConPromo,
    )

    /** Cuántos paquetes salen del stock actual de sus componentes. */
    const armablesDe = (producto: ProductoConDetalle): number => {
        const componentes: ComponenteKitDetalle[] = componentesPorKit?.get(producto.producto_id) ?? []
        const posibles = unidadesArmables(componentes)
        return Number.isFinite(posibles) ? posibles : 0
    }

    const limpiarFiltros = () => {
        setTerminoBusqueda('')
        setDepartamentoFiltro('')
        setTipoFiltro('')
        setSoloStockBajo(false)
        setSoloConPromo(false)
    }

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
            componentes: (componentesPorKit?.get(producto.producto_id) ?? [])
                .map(c => ({ producto_id: c.producto_id, cantidad: c.cantidad })),
        })
        setModalAbierto(true)
    }

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormulario(prev => ({ ...prev, [name]: value }))
    }

    const handleGuardar = async (e: FormEvent) => {
        e.preventDefault()

        const formularioEsPaquete = esPaquete(formulario.tipoProducto)
        if (formularioEsPaquete && formulario.componentes.length === 0) {
            toast.error('Un paquete necesita al menos un producto en su contenido.')
            return
        }

        const datos = {
            descripcion: formulario.descripcion,
            codigoBarras: formulario.codigoBarras || null,
            // El costo de un paquete lo calcula el servidor sumando el de sus
            // piezas; mandar el del formulario sería mentirle al margen.
            precioCosto: formularioEsPaquete ? 0 : parseFloat(formulario.precioCosto) || 0,
            precioVenta: parseFloat(formulario.precioVenta) || 0,
            departamentoId: parseInt(formulario.departamentoId, 10),
            tipoProducto: formulario.tipoProducto,
            stockMinimo: parseFloat(formulario.stockMinimo) || 0,
            promocionId: formulario.promocionId ? parseInt(formulario.promocionId, 10) : null,
            componentes: formularioEsPaquete ? formulario.componentes : undefined,
        }
        try {
            if (editando && formulario.productoId !== null) {
                await actualizar.mutateAsync({ id: formulario.productoId, datos })
                toast.success('¡Producto actualizado exitosamente!')
            } else {
                await crear.mutateAsync({
                    datos,
                    cantidadInicial: parseFloat(formulario.cantidadActual) || 0,
                })
                toast.success('¡Producto creado exitosamente!')
            }
            setModalAbierto(false)
        } catch (err) {
            toast.error(`Error: ${(err as Error).message}`)
        }
    }

    const handleEntradaStock = async (productoId: number, cantidad: number) => {
        if (!perfil) return
        try {
            await entradaStock.mutateAsync({ productoId, cantidad, empleadoId: perfil.empleado_id })
            setProductoParaStock(null)
            toast.success('Stock añadido exitosamente.')
        } catch (err) {
            toast.error(`Error al añadir stock: ${(err as Error).message}`)
        }
    }

    return (
        <div className="pos-container">
            {modalAbierto && (
                <Modal
                    titulo={editando ? 'Editar producto' : 'Nuevo producto'}
                    onClose={() => setModalAbierto(false)}
                    confirmarDescarte
                >
                    <form onSubmit={handleGuardar} className="form-vertical">
                        <label>Descripción:</label>
                        <input type="text" name="descripcion" value={formulario.descripcion} onChange={handleChange} required className="pos-input" />

                        <label>Se vende por:</label>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
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

                        {/* El costo de un paquete es la suma del de sus piezas: lo calcula el servidor. */}
                        {!esPaquete(formulario.tipoProducto) && (
                            <>
                                <label>Precio Costo:</label>
                                <input type="number" step="0.01" name="precioCosto" value={formulario.precioCosto} onChange={handleChange} required className="pos-input" />
                            </>
                        )}

                        <label>{esPaquete(formulario.tipoProducto) ? 'Precio del paquete:' : 'Precio Venta:'}</label>
                        <input type="number" step="0.01" name="precioVenta" value={formulario.precioVenta} onChange={handleChange} required className="pos-input" />

                        {esPaquete(formulario.tipoProducto) && (
                            <EditorContenidoPaquete
                                componentes={formulario.componentes}
                                candidatos={productos}
                                precioPaquete={parseFloat(formulario.precioVenta) || 0}
                                onCambiar={componentes => setFormulario(prev => ({ ...prev, componentes }))}
                            />
                        )}

                        {/* Un servicio no lleva inventario: no tiene sentido pedirle existencias. */}
                        {controlaStock(formulario.tipoProducto) && (
                            <>
                                {!editando && (
                                    <>
                                        <label>Cantidad Inicial:</label>
                                        <input type="number" step="any" name="cantidadActual" value={formulario.cantidadActual} onChange={handleChange} required className="pos-input" />
                                    </>
                                )}

                                <label>Stock Mínimo:</label>
                                <input type="number" step="any" name="stockMinimo" value={formulario.stockMinimo} onChange={handleChange} required className="pos-input" />
                            </>
                        )}

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

                        <div className="footer">
                            <BotonCancelarModal disabled={guardando} />
                            <button type="submit" className="btn btn--primary" disabled={guardando}>
                                {guardando ? 'Guardando...' : (editando ? 'Guardar cambios' : 'Guardar producto')}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {productoParaStock && (
                <AddStockModal
                    producto={productoParaStock}
                    onConfirm={handleEntradaStock}
                    onCancel={() => setProductoParaStock(null)}
                    guardando={entradaStock.isPending}
                />
            )}

            {/* Fila 1: búsqueda + alta */}
            <div className="toolbar">
                <input
                    type="text"
                    placeholder="Buscar por nombre o código de barras..."
                    className="pos-input toolbar__grow"
                    value={terminoBusqueda}
                    onChange={(e) => setTerminoBusqueda(e.target.value)}
                />
                {esAdmin && <button className="btn btn--primary" onClick={abrirNuevo}>+ Nuevo producto</button>}
            </div>

            {/* Fila 2: filtros */}
            <div className="toolbar">
                <select
                    className="pos-input filtro"
                    value={departamentoFiltro}
                    onChange={(e) => setDepartamentoFiltro(e.target.value)}
                    aria-label="Filtrar por departamento"
                >
                    <option value="">Todos los departamentos</option>
                    {departamentos.map(departamento => (
                        <option key={departamento.departamento_id} value={departamento.departamento_id}>
                            {departamento.nombre}
                        </option>
                    ))}
                </select>

                <select
                    className="pos-input filtro"
                    value={tipoFiltro}
                    onChange={(e) => setTipoFiltro(e.target.value)}
                    aria-label="Filtrar por tipo de producto"
                >
                    <option value="">Todos los tipos</option>
                    {TIPOS_DE_PRODUCTO.map(tipo => (
                        <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                    ))}
                </select>

                <button
                    type="button"
                    className={`toggle-chip${soloStockBajo ? ' is-on' : ''}`}
                    onClick={() => setSoloStockBajo(v => !v)}
                    aria-pressed={soloStockBajo}
                >Stock bajo</button>

                <button
                    type="button"
                    className={`toggle-chip${soloConPromo ? ' is-on' : ''}`}
                    onClick={() => setSoloConPromo(v => !v)}
                    aria-pressed={soloConPromo}
                >Con promoción</button>

                {hayFiltros && (
                    <button type="button" className="toggle-chip" onClick={limpiarFiltros}>Limpiar</button>
                )}

                <span className="toolbar__count">
                    {productosFiltrados.length} de {productos.length} productos
                </span>
            </div>

            {isPending && <p>Cargando productos...</p>}
            {error && <p className="texto-error">Error al cargar: {error.message}</p>}

            {!isPending && !error && (
                <div className="table-container">
                    <table className="sales-table">
                        <thead>
                            <tr><th>Código de Barras</th><th>Descripción</th><th>Departamento</th><th>Stock</th><th>Precio Venta</th><th>Acciones</th></tr>
                        </thead>
                        <tbody>
                            {productosFiltrados.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center' }}>
                                        {productos.length === 0
                                            ? 'No hay productos registrados.'
                                            : 'Ningún producto coincide con los filtros.'}
                                    </td>
                                </tr>
                            ) : productosFiltrados.map(producto => {
                                const bajo = esStockBajo(producto)
                                const llevaInventario = controlaStock(producto.tipo_producto)
                                return (
                                    <tr key={producto.producto_id}>
                                        <td>{producto.codigo_barras || 'N/A'}</td>
                                        <td>{producto.descripcion}</td>
                                        <td>{producto.departamentos?.nombre ?? '—'}</td>
                                        <td>
                                            {llevaInventario ? (
                                                <>
                                                    <span className={`stock-pill${bajo ? ' is-low' : ''}`}>
                                                        {producto.inventario[0]?.cantidad_actual ?? 0} {producto.unidad_medida}
                                                    </span>
                                                    {bajo && <span className="tag-bajo">Bajo</span>}
                                                </>
                                            ) : esPaquete(producto.tipo_producto) ? (
                                                // Un paquete no tiene existencias: se muestra cuántos salen del stock actual.
                                                <span className={`stock-pill${armablesDe(producto) === 0 ? ' is-low' : ''}`}>
                                                    {armablesDe(producto)} armables
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td>${Number(producto.precio_venta).toFixed(2)}</td>
                                        <td>
                                            <div className="acciones">
                                                {esAdmin && <button className="btn btn--secondary" onClick={() => abrirEdicion(producto)}>Editar</button>}
                                                {/* Entrada de stock: disponible para cajeros y administradores */}
                                                {llevaInventario && (
                                                    <button className="btn btn--primary" onClick={() => setProductoParaStock(producto)}>Añadir stock</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
