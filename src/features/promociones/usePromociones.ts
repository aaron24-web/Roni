// Capa de datos de Promociones.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../shared/lib/supabase'
import type { Tabla } from '../../shared/types/domain'

export type Promocion = Tabla<'promociones'>

/** Tipos de promoción que soporta el sistema (restricción en la base de datos) */
export const TIPOS_DE_PROMOCION = [
    { value: 'PORCENTAJE', label: 'Porcentaje de Descuento' },
    { value: 'CANTIDAD_X_CANTIDAD', label: 'Cantidad por Cantidad (ej: 2x1, 3x2)' },
] as const

export type TipoPromocion = (typeof TIPOS_DE_PROMOCION)[number]['value']

export interface DatosPromocion {
    nombre: string
    tipo_promocion: string
    valor: number
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
    if (error) throw new Error(error.message)
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
            if (error) throw new Error(error.message)
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
            if (error) throw new Error(error.message)
        },
        onSuccess: () => cliente.invalidateQueries({ queryKey: CLAVE_PROMOCIONES }),
    })
}
