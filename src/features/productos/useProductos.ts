// Capa de datos de Productos.
//
// Matriz de roles: crear y editar productos exige rol Administrador (lo
// valida exigir_admin en el servidor); registrar entrada de stock lo puede
// hacer también un cajero.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../shared/lib/supabase'
import { traducirError } from '../../shared/lib/errores'
import type { Tabla } from '../../shared/types/domain'

/** Producto con su departamento e inventario resueltos */
export type ProductoConDetalle = Tabla<'productos'> & {
    departamentos: { nombre: string } | null
    inventario: { cantidad_actual: number; stock_minimo: number | null }[]
}

/** Tipos de producto admitidos (restricción productos_tipo_producto_check) */
export const TIPOS_DE_PRODUCTO = [
    { value: 'UNITARIO', label: 'Por Unidad/Pza' },
    { value: 'GRANEL', label: 'A Granel (Usa Decimales)' },
    { value: 'SERVICIO', label: 'Servicio' },
    { value: 'KIT', label: 'Como Paquete (Kit)' },
] as const

export interface DatosProducto {
    descripcion: string
    codigoBarras: string | null
    precioCosto: number
    precioVenta: number
    departamentoId: number
    tipoProducto: string
    stockMinimo: number
    promocionId: number | null
}

const CLAVE_PRODUCTOS = ['productos'] as const

export function useProductos() {
    return useQuery({
        queryKey: CLAVE_PRODUCTOS,
        queryFn: async (): Promise<ProductoConDetalle[]> => {
            const { data, error } = await supabase
                .from('productos')
                .select('*, departamentos ( nombre ), inventario ( cantidad_actual, stock_minimo )')
                .order('descripcion', { ascending: true })
            if (error) throw traducirError(error)
            return (data ?? []) as ProductoConDetalle[]
        },
    })
}

/** Crea el producto y su registro de inventario inicial. */
export function useCrearProducto() {
    const cliente = useQueryClient()
    return useMutation({
        mutationFn: async ({ datos, cantidadInicial }: { datos: DatosProducto; cantidadInicial: number }) => {
            const { error } = await supabase.rpc('crear_producto_con_promo', {
                descripcion_param: datos.descripcion,
                // El generador de tipos marca estos parámetros como no nulos,
                // pero la función SQL acepta NULL: producto sin código de
                // barras y/o sin promoción asignada.
                codigo_barras_param: datos.codigoBarras as string,
                precio_costo_param: datos.precioCosto,
                precio_venta_param: datos.precioVenta,
                departamento_id_param: datos.departamentoId,
                tipo_producto_param: datos.tipoProducto,
                cantidad_actual_param: cantidadInicial,
                stock_minimo_param: datos.stockMinimo,
                promocion_id_param: datos.promocionId as number,
            })
            if (error) throw traducirError(error, { duplicado: 'Ya existe un producto con ese código de barras.' })
        },
        onSuccess: () => cliente.invalidateQueries({ queryKey: CLAVE_PRODUCTOS }),
    })
}

/**
 * Actualiza el producto. No toca la cantidad actual: el stock se ajusta con
 * entradas y movimientos de inventario, no editando la ficha.
 */
export function useActualizarProducto() {
    const cliente = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, datos }: { id: number; datos: DatosProducto }) => {
            const { error } = await supabase.rpc('actualizar_producto_con_promo', {
                producto_id_param: id,
                descripcion_param: datos.descripcion,
                // El generador de tipos marca estos parámetros como no nulos,
                // pero la función SQL acepta NULL: producto sin código de
                // barras y/o sin promoción asignada.
                codigo_barras_param: datos.codigoBarras as string,
                precio_costo_param: datos.precioCosto,
                precio_venta_param: datos.precioVenta,
                departamento_id_param: datos.departamentoId,
                tipo_producto_param: datos.tipoProducto,
                stock_minimo_param: datos.stockMinimo,
                promocion_id_param: datos.promocionId as number,
            })
            if (error) throw traducirError(error, { duplicado: 'Ya existe un producto con ese código de barras.' })
        },
        onSuccess: () => cliente.invalidateQueries({ queryKey: CLAVE_PRODUCTOS }),
    })
}

/** Entrada de mercancía. Disponible también para cajeros. */
export function useRegistrarEntradaStock() {
    const cliente = useQueryClient()
    return useMutation({
        mutationFn: async ({ productoId, cantidad, empleadoId }: {
            productoId: number
            cantidad: number
            empleadoId: number
        }) => {
            const { error } = await supabase.rpc('registrar_entrada_stock', {
                producto_id_param: productoId,
                cantidad_param: cantidad,
                empleado_id_param: empleadoId,
            })
            if (error) throw traducirError(error)
        },
        onSuccess: () => cliente.invalidateQueries({ queryKey: CLAVE_PRODUCTOS }),
    })
}
