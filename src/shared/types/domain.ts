// Atajos legibles sobre los tipos generados desde la base de datos.
// `database.ts` se regenera con `npm run types:db`; este archivo se escribe
// a mano y da nombres de dominio a las estructuras que más usamos.

import type { Database } from './database'

/** Fila de una tabla: `Tabla<'productos'>` */
export type Tabla<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Row']

/** Datos para insertar en una tabla */
export type Insertar<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Insert']

/** Datos para actualizar una tabla */
export type Actualizar<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Update']

/** Perfil del empleado con sesión iniciada (lo devuelve get_mi_perfil) */
export type Perfil = Database['public']['Functions']['get_mi_perfil']['Returns'][number]

export type Corte = Tabla<'cortescaja'>
export type TicketFila = Tabla<'tickets'>
export type Producto = Tabla<'productos'>
export type Cliente = Tabla<'clientes'>
export type Empleado = Tabla<'empleados'>

/** Estados posibles de un ticket (ver migración 009) */
export type EstadoTicket = 'ABIERTO' | 'COBRADO' | 'CANCELADO'

/** Renglón del carrito de un ticket. Se guarda como JSON en tickets.carrito. */
export interface ItemCarrito {
    producto_id: number
    descripcion: string
    cantidad: number
    precio_unitario_registrado: number
    tipo_producto?: string | null
    unidad_medida?: string | null
    /** Promoción asociada al producto, tal como viene del join */
    promociones?: Tabla<'promociones'> | null
    /** Importe calculado en la interfaz (no se persiste como fuente de verdad) */
    importe?: number
}

/** Un ticket tal como lo maneja la interfaz */
export interface Ticket {
    id: number
    carrito: ItemCarrito[]
    nombre: string | null
}
