// Capa de datos de Empleados.
//
// Crear un empleado también crea su usuario de Supabase Auth (correo +
// contraseña), por eso pasa por la función crear_empleado_con_auth en vez
// de un insert directo. Todas estas operaciones exigen rol Administrador
// del lado del servidor (ver exigir_admin en las migraciones 004/005).

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../shared/lib/supabase'
import type { Tabla } from '../../shared/types/domain'

/** Empleado con el nombre de su rol resuelto */
export type EmpleadoConRol = Tabla<'empleados'> & {
    roles: { nombre_rol: string } | null
}

export type Rol = Tabla<'roles'>

const CLAVE_EMPLEADOS = ['empleados'] as const
const CLAVE_ROLES = ['roles'] as const

export function useEmpleados() {
    return useQuery({
        queryKey: CLAVE_EMPLEADOS,
        queryFn: async (): Promise<EmpleadoConRol[]> => {
            const { data, error } = await supabase
                .from('empleados')
                .select('*, roles(nombre_rol)')
                .eq('activo', true)
                .order('nombre_completo')
            if (error) throw new Error(error.message)
            return (data ?? []) as EmpleadoConRol[]
        },
    })
}

export function useRoles() {
    return useQuery({
        queryKey: CLAVE_ROLES,
        queryFn: async (): Promise<Rol[]> => {
            const { data, error } = await supabase.from('roles').select('*')
            if (error) throw new Error(error.message)
            return data ?? []
        },
        // Los roles prácticamente no cambian.
        staleTime: 5 * 60_000,
    })
}

export interface NuevoEmpleado {
    email: string
    password: string
    nombre: string
    rolId: number
    fechaContratacion: string
}

function traducirError(mensaje: string): string {
    if (mensaje.includes('duplicate') || mensaje.includes('unique')) {
        return 'Ya existe un empleado con ese correo.'
    }
    return mensaje
}

/** Crea el usuario de Auth y el empleado vinculado, en una sola transacción. */
export function useCrearEmpleado() {
    const cliente = useQueryClient()
    return useMutation({
        mutationFn: async (datos: NuevoEmpleado) => {
            const { error } = await supabase.rpc('crear_empleado_con_auth', {
                p_email: datos.email.trim(),
                p_password: datos.password,
                p_nombre: datos.nombre,
                p_rol_id: datos.rolId,
                p_fecha_contratacion: datos.fechaContratacion,
            })
            if (error) throw new Error(traducirError(error.message))
        },
        onSuccess: () => cliente.invalidateQueries({ queryKey: CLAVE_EMPLEADOS }),
    })
}

export interface EdicionEmpleado {
    empleadoId: number
    nombre: string
    usuario: string
    rolId: number
    fechaContratacion: string
}

export function useActualizarEmpleado() {
    const cliente = useQueryClient()
    return useMutation({
        mutationFn: async (datos: EdicionEmpleado) => {
            const { error } = await supabase.rpc('actualizar_empleado_directo', {
                empleado_id_param: datos.empleadoId,
                nombre_completo_param: datos.nombre,
                usuario_param: datos.usuario,
                rol_id_param: datos.rolId,
                fecha_contratacion_param: datos.fechaContratacion,
            })
            if (error) throw new Error(traducirError(error.message))
        },
        onSuccess: () => cliente.invalidateQueries({ queryKey: CLAVE_EMPLEADOS }),
    })
}

/** Baja lógica: conserva el historial de ventas del empleado. */
export function useDesactivarEmpleado() {
    const cliente = useQueryClient()
    return useMutation({
        mutationFn: async (empleadoId: number) => {
            const { error } = await supabase.rpc('desactivar_empleado_directo', {
                empleado_id_param: empleadoId,
            })
            if (error) throw new Error(error.message)
        },
        onSuccess: () => cliente.invalidateQueries({ queryKey: CLAVE_EMPLEADOS }),
    })
}
