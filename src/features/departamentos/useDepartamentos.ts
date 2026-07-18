// Capa de datos de Departamentos.
//
// Toda la conversación con Supabase vive aquí; la pantalla solo consume
// hooks. React Query se encarga de la caché, los estados de carga/error y
// de refrescar la lista automáticamente tras cada mutación.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../shared/lib/supabase'
import type { Tabla, Insertar } from '../../shared/types/domain'

export type Departamento = Tabla<'departamentos'>

/** Clave de caché de esta feature. */
const CLAVE_DEPARTAMENTOS = ['departamentos'] as const

async function listarDepartamentos(): Promise<Departamento[]> {
    const { data, error } = await supabase
        .from('departamentos')
        .select('*')
        .order('nombre')
    if (error) throw new Error(error.message)
    return data ?? []
}

export function useDepartamentos() {
    return useQuery({
        queryKey: CLAVE_DEPARTAMENTOS,
        queryFn: listarDepartamentos,
    })
}

export interface DatosDepartamento {
    nombre: string
    descripcion: string | null
}

export function useCrearDepartamento() {
    const cliente = useQueryClient()
    return useMutation({
        mutationFn: async (datos: DatosDepartamento) => {
            const nuevo: Insertar<'departamentos'> = datos
            const { error } = await supabase.from('departamentos').insert(nuevo)
            if (error) throw new Error(error.message)
        },
        onSuccess: () => cliente.invalidateQueries({ queryKey: CLAVE_DEPARTAMENTOS }),
    })
}

export function useActualizarDepartamento() {
    const cliente = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, datos }: { id: number; datos: DatosDepartamento }) => {
            const { error } = await supabase
                .from('departamentos')
                .update(datos)
                .eq('departamento_id', id)
            if (error) throw new Error(error.message)
        },
        onSuccess: () => cliente.invalidateQueries({ queryKey: CLAVE_DEPARTAMENTOS }),
    })
}

export function useEliminarDepartamento() {
    const cliente = useQueryClient()
    return useMutation({
        mutationFn: async (id: number) => {
            const { error } = await supabase
                .from('departamentos')
                .delete()
                .eq('departamento_id', id)
            if (error) {
                // Caso típico: hay productos asignados a este departamento.
                throw new Error(
                    `${error.message}. Asegúrate de que ningún producto esté usando este departamento.`
                )
            }
        },
        onSuccess: () => cliente.invalidateQueries({ queryKey: CLAVE_DEPARTAMENTOS }),
    })
}
