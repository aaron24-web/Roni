// Capa de datos de Clientes y su estado de cuenta (crédito).

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../shared/lib/supabase'
import { traducirError } from '../../shared/lib/errores'
import type { Database } from '../../shared/types/database'
import type { Tabla } from '../../shared/types/domain'

export type Cliente = Tabla<'clientes'>

/** Campos editables de un cliente */
export type DatosCliente = Omit<Cliente, 'cliente_id' | 'fecha_registro' | 'activo'>

/** Un movimiento del estado de cuenta, tal como lo devuelve el RPC */
export type MovimientoCuenta =
    Database['public']['Functions']['obtener_estado_cuenta']['Returns'][number]

const CLAVE_CLIENTES = ['clientes'] as const
const claveEstadoCuenta = (clienteId: number) => ['clientes', clienteId, 'estado-cuenta'] as const

async function listarClientes(): Promise<Cliente[]> {
    const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nombre', { ascending: true })
    if (error) throw traducirError(error)
    return data ?? []
}

export function useClientes() {
    return useQuery({
        queryKey: CLAVE_CLIENTES,
        queryFn: listarClientes,
    })
}

export function useCrearCliente() {
    const cliente = useQueryClient()
    return useMutation({
        mutationFn: async (datos: DatosCliente) => {
            const { error } = await supabase.from('clientes').insert(datos)
            if (error) throw traducirError(error)
        },
        onSuccess: () => cliente.invalidateQueries({ queryKey: CLAVE_CLIENTES }),
    })
}

export function useActualizarCliente() {
    const cliente = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, datos }: { id: number; datos: DatosCliente }) => {
            const { error } = await supabase
                .from('clientes')
                .update(datos)
                .eq('cliente_id', id)
            if (error) throw traducirError(error)
        },
        onSuccess: () => cliente.invalidateQueries({ queryKey: CLAVE_CLIENTES }),
    })
}

/** Movimientos de crédito del cliente (cargos y abonos) */
export function useEstadoCuenta(clienteId: number) {
    return useQuery({
        queryKey: claveEstadoCuenta(clienteId),
        queryFn: async (): Promise<MovimientoCuenta[]> => {
            const { data, error } = await supabase.rpc('obtener_estado_cuenta', {
                cliente_id_param: clienteId,
            })
            if (error) throw traducirError(error)
            return data ?? []
        },
    })
}

export function useRegistrarAbono(clienteId: number) {
    const cliente = useQueryClient()
    return useMutation({
        mutationFn: async ({ monto, empleadoId }: { monto: number; empleadoId: number }) => {
            const { error } = await supabase.rpc('registrar_abono_cliente', {
                cliente_id_param: clienteId,
                monto_abono_param: monto,
                empleado_id_param: empleadoId,
            })
            if (error) throw traducirError(error)
        },
        onSuccess: () => {
            // El abono cambia el saldo y también el límite disponible del cliente.
            cliente.invalidateQueries({ queryKey: claveEstadoCuenta(clienteId) })
            cliente.invalidateQueries({ queryKey: CLAVE_CLIENTES })
        },
    })
}
