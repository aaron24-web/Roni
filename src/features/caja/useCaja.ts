// Capa de datos del Corte de Caja.
//
// La caja es POR TERMINAL: cada computadora abre y cuadra la suya (ver
// migración 009 y src/lib/terminal.ts).

import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '../../shared/lib/supabase'
import type { Database } from '../../shared/types/database'
import type { Corte } from '../../shared/types/domain'

export type ResumenCorte =
    Database['public']['Functions']['obtener_resumen_corte']['Returns'][number]

export function useResumenCorte(corteId: number | undefined) {
    return useQuery({
        queryKey: ['corte', corteId, 'resumen'],
        // Sin corte abierto no hay nada que resumir.
        enabled: corteId !== undefined,
        queryFn: async (): Promise<ResumenCorte | null> => {
            const { data, error } = await supabase.rpc('obtener_resumen_corte', {
                corte_id_param: corteId as number,
            })
            if (error) throw new Error(error.message)
            return data?.[0] ?? null
        },
    })
}

export function useAbrirCaja() {
    return useMutation({
        mutationFn: async ({ empleadoId, saldoInicial, terminalId }: {
            empleadoId: number
            saldoInicial: number
            terminalId: string
        }): Promise<Corte | null> => {
            const { data, error } = await supabase.rpc('abrir_caja', {
                empleado_id_param: empleadoId,
                saldo_inicial_param: saldoInicial,
                terminal_id_param: terminalId,
            })
            if (error) throw new Error(error.message)
            // El RPC devuelve solo algunas columnas; recuperamos el corte completo.
            const corteId = data?.[0]?.corte_id
            if (corteId === undefined) return null
            const { data: corte } = await supabase
                .from('cortescaja')
                .select('*')
                .eq('corte_id', corteId)
                .maybeSingle()
            return corte ?? null
        },
    })
}

export function useCerrarCaja() {
    return useMutation({
        mutationFn: async ({ corteId, saldoFinalReal, resumen }: {
            corteId: number
            saldoFinalReal: number
            resumen: ResumenCorte | null
        }) => {
            const { error } = await supabase.rpc('cerrar_caja', {
                corte_id_param: corteId,
                saldo_final_real_param: saldoFinalReal,
                resumen,
            })
            if (error) throw new Error(error.message)
        },
    })
}
