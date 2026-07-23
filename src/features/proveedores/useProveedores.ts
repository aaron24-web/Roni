// Capa de datos de Proveedores.
//
// "Eliminar" es en realidad una baja lógica (activo = false): los productos
// que ya referencian al proveedor conservan su historial.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../shared/lib/supabase'
import { traducirError } from '../../shared/lib/errores'
import type { Tabla } from '../../shared/types/domain'

export type Proveedor = Tabla<'proveedores'>

/** Campos editables de un proveedor (todo menos su id y estado) */
export type DatosProveedor = Omit<Proveedor, 'proveedor_id' | 'activo' | 'fecha_registro'>

const CLAVE_PROVEEDORES = ['proveedores'] as const

async function listarProveedores(): Promise<Proveedor[]> {
    const { data, error } = await supabase
        .from('proveedores')
        .select('*')
        .eq('activo', true)
        .order('nombre_empresa')
    if (error) throw traducirError(error)
    return data ?? []
}

export function useProveedores() {
    return useQuery({
        queryKey: CLAVE_PROVEEDORES,
        queryFn: listarProveedores,
    })
}

export function useCrearProveedor() {
    const cliente = useQueryClient()
    return useMutation({
        mutationFn: async (datos: DatosProveedor) => {
            const { error } = await supabase.from('proveedores').insert(datos)
            if (error) throw traducirError(error)
        },
        onSuccess: () => cliente.invalidateQueries({ queryKey: CLAVE_PROVEEDORES }),
    })
}

export function useActualizarProveedor() {
    const cliente = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, datos }: { id: number; datos: DatosProveedor }) => {
            const { error } = await supabase
                .from('proveedores')
                .update(datos)
                .eq('proveedor_id', id)
            if (error) throw traducirError(error)
        },
        onSuccess: () => cliente.invalidateQueries({ queryKey: CLAVE_PROVEEDORES }),
    })
}

/** Baja lógica: conserva el historial de productos del proveedor. */
export function useDesactivarProveedor() {
    const cliente = useQueryClient()
    return useMutation({
        mutationFn: async (id: number) => {
            const { error } = await supabase
                .from('proveedores')
                .update({ activo: false })
                .eq('proveedor_id', id)
            if (error) throw traducirError(error)
        },
        onSuccess: () => cliente.invalidateQueries({ queryKey: CLAVE_PROVEEDORES }),
    })
}
