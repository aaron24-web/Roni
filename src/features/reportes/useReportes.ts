// Capa de datos de Reportes: historial de cortes, ventas de cada turno y
// cancelación de ventas. Todas estas operaciones exigen rol Administrador
// del lado del servidor (ver migración 006).

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../shared/lib/supabase'
import { traducirError } from '../../shared/lib/errores'
import type { Database } from '../../shared/types/database'

type Funciones = Database['public']['Functions']

export type CorteHistorial = Funciones['obtener_historial_cortes']['Returns'][number]
export type VentaDeCorte = Funciones['obtener_ventas_por_corte']['Returns'][number]
export type VentaPorDepto = Funciones['obtener_ventas_por_depto']['Returns'][number]
export type DetalleVenta = Funciones['obtener_detalle_venta']['Returns'][number]

const CLAVE_CORTES = ['cortes-historial'] as const
const claveCorte = (corteId: number) => ['cortes-historial', corteId] as const

export function useHistorialCortes() {
    return useQuery({
        queryKey: CLAVE_CORTES,
        queryFn: async (): Promise<CorteHistorial[]> => {
            const { data, error } = await supabase.rpc('obtener_historial_cortes')
            if (error) throw traducirError(error)
            return data ?? []
        },
    })
}

/** Ventas de un corte y su desglose por departamento, en una sola consulta. */
export function useDetalleCorte(corteId: number) {
    return useQuery({
        queryKey: claveCorte(corteId),
        queryFn: async (): Promise<{ ventas: VentaDeCorte[]; porDepartamento: VentaPorDepto[] }> => {
            const [ventas, porDepartamento] = await Promise.all([
                supabase.rpc('obtener_ventas_por_corte', { corte_id_param: corteId }),
                supabase.rpc('obtener_ventas_por_depto', { corte_id_param: corteId }),
            ])
            if (ventas.error) throw new Error(ventas.error.message)
            if (porDepartamento.error) throw new Error(porDepartamento.error.message)
            return {
                ventas: ventas.data ?? [],
                porDepartamento: porDepartamento.data ?? [],
            }
        },
    })
}

export function useDetalleVenta(ventaId: number) {
    return useQuery({
        queryKey: ['ventas', ventaId, 'detalle'],
        queryFn: async (): Promise<DetalleVenta[]> => {
            const { data, error } = await supabase.rpc('obtener_detalle_venta', {
                venta_id_param: ventaId,
            })
            if (error) throw traducirError(error)
            return data ?? []
        },
    })
}

/** Cancela una venta y restaura el inventario. Solo administrador. */
export function useCancelarVenta(corteId: number) {
    const cliente = useQueryClient()
    return useMutation({
        mutationFn: async ({ ventaId, supervisorId, motivo }: {
            ventaId: number
            supervisorId: number
            motivo: string
        }) => {
            const { error } = await supabase.rpc('cancelar_venta_completa', {
                args: {
                    venta_id_param: ventaId,
                    supervisor_id_param: supervisorId,
                    motivo_param: motivo,
                },
            })
            if (error) throw traducirError(error)
        },
        onSuccess: () => {
            // Cambian tanto el detalle del corte como los totales del historial.
            cliente.invalidateQueries({ queryKey: claveCorte(corteId) })
            cliente.invalidateQueries({ queryKey: CLAVE_CORTES })
        },
    })
}
