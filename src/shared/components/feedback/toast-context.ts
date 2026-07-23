// Contexto de notificaciones (toasts). Reemplaza a `alert()`.
//
// Se separa del provider (ToastProvider.tsx) para no mezclar el hook con el
// componente y mantener contento a react-refresh, igual que auth-context.ts.

import { createContext, useContext } from 'react'

export type ToastTipo = 'success' | 'error' | 'info'

export interface Toast {
    id: number
    tipo: ToastTipo
    mensaje: string
}

export interface ToastApi {
    success: (mensaje: string) => void
    error: (mensaje: string) => void
    info: (mensaje: string) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
    const ctx = useContext(ToastContext)
    if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>')
    return ctx
}
