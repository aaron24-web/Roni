// Objeto de contexto y hook de acceso. Van en un módulo aparte del provider
// para no romper Fast Refresh (un archivo de componentes solo exporta componentes).

import { createContext, useContext } from 'react'
import type { Corte, Ticket, ItemCarrito } from '../types/domain'

export interface PosContextValor {
    /** Identificador de esta computadora (ver lib/terminal) */
    terminalId: string
    /** Corte de caja abierto en ESTA terminal, o null si la caja está cerrada */
    corteActivo: Corte | null
    setCorteActivo: (corte: Corte | null) => void
    cargandoCorte: boolean
    /** Tickets (ventas en curso) abiertos en esta terminal */
    tickets: Ticket[]
    ticketActivo: Ticket
    ticketActivoId: number | null
    setTicketActivoId: (id: number) => void
    crearNuevoTicket: () => Promise<void>
    /** Cancela un ticket (nunca deja la terminal sin ninguno abierto) */
    cerrarTicket: (idTicket: number) => void
    /** Marca el ticket como COBRADO y lo liga a su venta */
    marcarTicketCobrado: (idTicket: number, ventaId: number | null) => void
    actualizarCarritoActivo: (carrito: ItemCarrito[]) => void
}

export const PosContext = createContext<PosContextValor | null>(null)

export function usePos(): PosContextValor {
    const contexto = useContext(PosContext)
    if (!contexto) {
        throw new Error('usePos debe usarse dentro de <PosProvider>')
    }
    return contexto
}
