// Provider de toasts: mantiene la cola de notificaciones y las pinta arriba a
// la derecha. Cada toast se descarta solo tras unos segundos o al pulsar la X.

import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { ToastContext, type Toast, type ToastApi, type ToastTipo } from './toast-context'

const DURACION_MS = 4000

export default function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])
    const siguienteId = useRef(1)

    const quitar = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    const mostrar = useCallback(
        (tipo: ToastTipo, mensaje: string) => {
            const id = siguienteId.current++
            setToasts((prev) => [...prev, { id, tipo, mensaje }])
            window.setTimeout(() => quitar(id), DURACION_MS)
        },
        [quitar],
    )

    const api = useMemo<ToastApi>(
        () => ({
            success: (m) => mostrar('success', m),
            error: (m) => mostrar('error', m),
            info: (m) => mostrar('info', m),
        }),
        [mostrar],
    )

    return (
        <ToastContext.Provider value={api}>
            {children}
            <div className="toast-container" role="region" aria-live="polite" aria-label="Notificaciones">
                {toasts.map((t) => (
                    <div key={t.id} className={`toast toast--${t.tipo}`} role="alert">
                        <span className="toast__mensaje">{t.mensaje}</span>
                        <button className="toast__cerrar" onClick={() => quitar(t.id)} aria-label="Cerrar notificación">
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}
