// Capa de datos de Promociones.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../shared/lib/supabase'
import { traducirError } from '../../shared/lib/errores'
import type { Tabla } from '../../shared/types/domain'

export type Promocion = Tabla<'promociones'>

/** Tipos de promoción que soporta el sistema (restricción en la base de datos) */
export const TIPOS_DE_PROMOCION = [
    { value: 'PORCENTAJE', label: 'Porcentaje de Descuento' },
    { value: 'CANTIDAD_X_CANTIDAD', label: 'Lleva N, paga M (ej: 2x1, 3x1, 3x2)' },
    { value: 'PRECIO_ESPECIAL', label: 'Precio especial ($ fijo por unidad)' },
    { value: 'MAYOREO', label: 'Mayoreo (N+ piezas a precio especial)' },
] as const

export type TipoPromocion = (typeof TIPOS_DE_PROMOCION)[number]['value']

export interface DatosPromocion {
    nombre: string
    tipo_promocion: string
    /** PORCENTAJE: %. N×M: la N ("lleva"). MAYOREO: cantidad mínima. PRECIO_ESPECIAL: null. */
    valor: number | null
    /** Solo N×M: la M ("paga"). En los demás tipos va como null. */
    cantidad_pago: number | null
    /** PRECIO_ESPECIAL y MAYOREO: precio por unidad. En los demás, null. */
    precio_promocional: number | null
    descripcion: string | null
    fecha_inicio: string
    fecha_fin: string | null
    activo: boolean
}

const CLAVE_PROMOCIONES = ['promociones'] as const

async function listarPromociones(): Promise<Promocion[]> {
    const { data, error } = await supabase
        .from('promociones')
        .select('*')
        .order('nombre')
    if (error) throw traducirError(error)
    return data ?? []
}

export function usePromociones() {
    return useQuery({
        queryKey: CLAVE_PROMOCIONES,
        queryFn: listarPromociones,
    })
}

export function useCrearPromocion() {
    const cliente = useQueryClient()
    return useMutation({
        mutationFn: async (datos: DatosPromocion) => {
            const { error } = await supabase.from('promociones').insert(datos)
            if (error) throw traducirError(error)
        },
        onSuccess: () => cliente.invalidateQueries({ queryKey: CLAVE_PROMOCIONES }),
    })
}

export function useActualizarPromocion() {
    const cliente = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, datos }: { id: number; datos: DatosPromocion }) => {
            const { error } = await supabase
                .from('promociones')
                .update(datos)
                .eq('promocion_id', id)
            if (error) throw traducirError(error)
        },
        onSuccess: () => cliente.invalidateQueries({ queryKey: CLAVE_PROMOCIONES }),
    })
}

/**
 * Define QUÉ productos llevan una promoción (semántica de conjunto: los no
 * seleccionados que la tenían, la pierden). Solo Administrador (servidor).
 */
export function useAsignarPromocionProductos() {
    const cliente = useQueryClient()
    return useMutation({
        mutationFn: async ({ promocionId, productoIds }: { promocionId: number; productoIds: number[] }) => {
            const { error } = await supabase.rpc('asignar_promocion_productos', {
                p_promocion_id: promocionId,
                p_producto_ids: productoIds,
            })
            if (error) throw traducirError(error)
        },
        onSuccess: () => {
            cliente.invalidateQueries({ queryKey: CLAVE_PROMOCIONES })
            // La lista de productos también cambió (su promocion_id).
            cliente.invalidateQueries({ queryKey: ['productos'] })
        },
    })
}
