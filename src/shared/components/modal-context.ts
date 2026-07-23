// Contexto que `Modal` ofrece a su contenido. Sirve para que el botón
// "Cancelar" del formulario cierre por la misma puerta que Escape y el clic
// fuera, y así pase por el aviso de "¿descartar los cambios?".
//
// Se consume con el componente `<BotonCancelarModal>` (ver Modal.tsx), no con
// un hook llamado desde la pantalla: la pantalla está POR ENCIMA de <Modal> en
// el árbol, así que ahí el contexto todavía no existe.

import { createContext, useContext } from 'react'

export interface ModalApi {
    /** Pide cerrar el modal. Si hay cambios sin guardar, avisa antes. */
    pedirCierre: () => void
}

export const ModalContext = createContext<ModalApi | null>(null)

export function useModal(): ModalApi {
    const ctx = useContext(ModalContext)
    if (!ctx) throw new Error('useModal debe usarse dentro de <Modal>')
    return ctx
}
