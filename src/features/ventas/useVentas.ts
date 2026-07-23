// Capa de datos de la pantalla de Ventas.

import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '../../shared/lib/supabase'
import { traducirError } from '../../shared/lib/errores'
import { sanitizeSearchTerm } from '../../shared/lib/searchTerm'
import type { ItemCarrito, Tabla } from '../../shared/types/domain'

export type MetodoPago = Tabla<'metodospago'>

/** Cliente en el selector de la venta */
export interface ClienteVenta {
    cliente_id: number
    nombre: string
    permite_credito: boolean | null
}

/** Producto tal como lo devuelve la búsqueda, con su promoción y la de su departamento */
export type ProductoBusqueda = Tabla<'productos'> & {
    departamentos: { nombre: string; promociones: Tabla<'promociones'> | null } | null
    promociones: Tabla<'promociones'> | null
}

export function useMetodosPago() {
    return useQuery({
        queryKey: ['metodospago'],
        queryFn: async (): Promise<MetodoPago[]> => {
            const { data, error } = await supabase
                .from('metodospago')
                .select('*')
                .eq('activo', true)
            if (error) throw traducirError(error)
            return data ?? []
        },
        // Los métodos de pago cambian rarísima vez.
        staleTime: 5 * 60_000,
    })
}

export function useClientesParaVenta() {
    return useQuery({
        queryKey: ['clientes', 'para-venta'],
        queryFn: async (): Promise<ClienteVenta[]> => {
            const { data, error } = await supabase
                .from('clientes')
                .select('cliente_id, nombre, permite_credito')
                .eq('activo', true)
                .order('nombre')
            if (error) throw traducirError(error)
            return data ?? []
        },
    })
}

/**
 * Búsqueda de productos por descripción o código de barras.
 * El término se sanea antes de interpolarlo en el filtro (ver searchTerm).
 */
export function useBuscarProductos(termino: string) {
    const limpio = sanitizeSearchTerm(termino)
    return useQuery({
        queryKey: ['productos', 'buscar', limpio],
        enabled: limpio.length >= 2,
        queryFn: async (): Promise<ProductoBusqueda[]> => {
            const { data, error } = await supabase
                .from('productos')
                .select('*, departamentos ( nombre, promociones ( * ) ), promociones ( * )')
                .or(`descripcion.ilike.%${limpio}%,codigo_barras.eq.${limpio}`)
                .limit(10)
            if (error) throw traducirError(error)
            return (data ?? []) as unknown as ProductoBusqueda[]
        },
    })
}

export interface DatosVenta {
    empleadoId: number
    clienteId: number
    metodoPagoId: number
    corteId: number
    carrito: ItemCarrito[]
    /** Ticket que se está cobrando: el servidor lo marca COBRADO en la misma transacción. */
    ticketId: number | null
}

/** Registra la venta completa y devuelve el id generado. */
export function useRegistrarVenta() {
    return useMutation({
        mutationFn: async (datos: DatosVenta): Promise<number> => {
            // Desde la migración 012 el SERVIDOR recalcula precios y
            // promociones: solo se le dice qué productos y cuántos. Los
            // importes que muestra la pantalla son un preestimado visual.
            const carritoParaBD = datos.carrito.map(item => ({
                producto_id: item.producto_id,
                cantidad: item.cantidad,
            }))

            const { data, error } = await supabase.rpc('registrar_venta_completa', {
                empleado_id_param: datos.empleadoId,
                cliente_id_param: datos.clienteId,
                metodo_pago_id_param: datos.metodoPagoId,
                corte_id_param: datos.corteId,
                carrito_param: carritoParaBD,
                ticket_id_param: datos.ticketId,
            })
            if (error) throw traducirError(error)
            return data as number
        },
    })
}

/**
 * Verifica las credenciales de un supervisor para autorizar una acción
 * sensible del cajero (por ejemplo, quitar un producto del ticket).
 *
 * Valida el correo y la contraseña contra Supabase Auth (bcrypt) y exige rol
 * Administrador activo. No modifica la sesión del cajero: devuelve el
 * empleado_id del supervisor, o null si las credenciales no son válidas.
 */
export function useVerificarSupervisor() {
    return useMutation({
        mutationFn: async ({ email, password }: { email: string; password: string }) => {
            const { data, error } = await supabase.rpc('verificar_supervisor_auth', {
                p_email: email,
                p_password: password,
            })
            if (error) throw traducirError(error)
            return data
        },
    })
}
