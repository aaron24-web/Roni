// Contexto de diálogos modales. Reemplaza a `confirm()` y `prompt()` con una
// API imperativa basada en promesas:
//
//   const confirmar = useConfirm()
//   if (await confirmar({ mensaje: '¿Eliminar?', peligro: true })) { ... }
//
//   const pedirTexto = usePrompt()
//   const motivo = await pedirTexto({ mensaje: 'Motivo:' })  // string | null

import { createContext, useContext } from 'react'

export interface ConfirmOpciones {
    titulo?: string
    mensaje: string
    textoConfirmar?: string
    textoCancelar?: string
    /** Pinta el botón de confirmar en rojo (acciones destructivas). */
    peligro?: boolean
}

export interface PromptOpciones {
    titulo?: string
    mensaje: string
    textoConfirmar?: string
    textoCancelar?: string
    valorInicial?: string
    placeholder?: string
    /** Si es true, no deja confirmar con el campo vacío. */
    requerido?: boolean
}

export interface DialogApi {
    confirmar: (opciones: ConfirmOpciones) => Promise<boolean>
    pedirTexto: (opciones: PromptOpciones) => Promise<string | null>
}

export const DialogContext = createContext<DialogApi | null>(null)

export function useConfirm(): DialogApi['confirmar'] {
    const ctx = useContext(DialogContext)
    if (!ctx) throw new Error('useConfirm debe usarse dentro de <DialogProvider>')
    return ctx.confirmar
}

export function usePrompt(): DialogApi['pedirTexto'] {
    const ctx = useContext(DialogContext)
    if (!ctx) throw new Error('usePrompt debe usarse dentro de <DialogProvider>')
    return ctx.pedirTexto
}
