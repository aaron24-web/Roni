// Provider de diálogos: muestra un único modal a la vez (confirmación o
// entrada de texto) y resuelve la promesa devuelta por useConfirm()/usePrompt()
// con la elección del usuario.

import { useCallback, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
    DialogContext,
    type ConfirmOpciones,
    type DialogApi,
    type PromptOpciones,
} from './dialog-context'

type Estado =
    | { modo: 'confirm'; opciones: ConfirmOpciones }
    | { modo: 'prompt'; opciones: PromptOpciones }
    | null

export default function DialogProvider({ children }: { children: ReactNode }) {
    const [estado, setEstado] = useState<Estado>(null)
    const [texto, setTexto] = useState('')
    // Guarda el `resolve` de la promesa en curso para llamarlo al cerrar.
    const resolver = useRef<((valor: boolean | string | null) => void) | null>(null)

    const cerrar = useCallback((valor: boolean | string | null) => {
        resolver.current?.(valor)
        resolver.current = null
        setEstado(null)
        setTexto('')
    }, [])

    const confirmar = useCallback(
        (opciones: ConfirmOpciones) =>
            new Promise<boolean>((resolve) => {
                resolver.current = resolve as (valor: boolean | string | null) => void
                setEstado({ modo: 'confirm', opciones })
            }),
        [],
    )

    const pedirTexto = useCallback(
        (opciones: PromptOpciones) =>
            new Promise<string | null>((resolve) => {
                resolver.current = resolve as (valor: boolean | string | null) => void
                setTexto(opciones.valorInicial ?? '')
                setEstado({ modo: 'prompt', opciones })
            }),
        [],
    )

    const api = useMemo<DialogApi>(() => ({ confirmar, pedirTexto }), [confirmar, pedirTexto])

    // Valor con el que se resuelve al cancelar según el tipo de diálogo.
    const valorCancelar = estado?.modo === 'prompt' ? null : false

    const handleSubmitPrompt = (e: FormEvent) => {
        e.preventDefault()
        if (estado?.modo !== 'prompt') return
        if (estado.opciones.requerido && texto.trim() === '') return
        cerrar(texto)
    }

    return (
        <DialogContext.Provider value={api}>
            {children}
            {estado && (
                <div className="modal-overlay" onClick={() => cerrar(valorCancelar)}>
                    <div
                        className="dialog"
                        role="dialog"
                        aria-modal="true"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {estado.opciones.titulo && <h2 className="dialog__titulo">{estado.opciones.titulo}</h2>}
                        <p className="dialog__mensaje">{estado.opciones.mensaje}</p>

                        {estado.modo === 'prompt' ? (
                            <form onSubmit={handleSubmitPrompt}>
                                <input
                                    autoFocus
                                    className="pos-input"
                                    style={{ width: '100%' }}
                                    value={texto}
                                    placeholder={estado.opciones.placeholder}
                                    onChange={(e) => setTexto(e.target.value)}
                                />
                                <div className="dialog__acciones">
                                    <button type="button" className="btn btn--secondary" onClick={() => cerrar(null)}>
                                        {estado.opciones.textoCancelar ?? 'Cancelar'}
                                    </button>
                                    <button type="submit" className="btn btn--primary">
                                        {estado.opciones.textoConfirmar ?? 'Aceptar'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="dialog__acciones">
                                <button className="btn btn--secondary" onClick={() => cerrar(false)}>
                                    {estado.opciones.textoCancelar ?? 'Cancelar'}
                                </button>
                                <button
                                    className={`btn ${estado.opciones.peligro ? 'btn--danger' : 'btn--primary'}`}
                                    onClick={() => cerrar(true)}
                                >
                                    {estado.opciones.textoConfirmar ?? 'Aceptar'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </DialogContext.Provider>
    )
}
