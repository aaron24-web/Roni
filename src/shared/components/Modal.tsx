// Modal reutilizable y accesible. Encapsula el patrón `.modal-overlay` +
// `.modal-content` y añade:
//   - Cierre con Escape y (opcional) clic en el fondo.
//   - Trampa de foco: Tab circula solo dentro del modal.
//   - Al cerrar, el foco vuelve al elemento que abrió el modal.
//   - `aria-labelledby` ligado al título.
//   - Con modales anidados, Escape cierra solo el de hasta arriba (pila).
//   - Con `confirmarDescarte`, avisa antes de tirar un formulario a medias.
//
//   <Modal titulo="Editar" onClose={() => setAbierto(false)} confirmarDescarte>
//       ...campos...
//       <BotonCancelarModal disabled={guardando} />
//   </Modal>

import { useCallback, useEffect, useId, useMemo, useRef, type ReactNode } from 'react'
import { useConfirm } from './feedback/dialog-context'
import { ModalContext, useModal } from './modal-context'

// Pila global de modales abiertos: Escape solo actúa sobre el último.
const pilaModales: symbol[] = []

interface Props {
    children: ReactNode
    /** Se llama al pulsar Escape o (si cerrarAlClickFuera) al hacer clic en el fondo. */
    onClose: () => void
    /** Título opcional; se pinta como <h2> arriba del contenido. */
    titulo?: string
    /** Ancho máximo del cuadro (por defecto el de `.modal-content`). */
    maxWidth?: number | string
    /** Cerrar al hacer clic fuera del cuadro. Por defecto true. */
    cerrarAlClickFuera?: boolean
    /**
     * Si el usuario editó algún campo, pide confirmación antes de cerrar.
     * Actívalo en los modales con formulario; los de solo lectura no lo necesitan.
     * Los campos marcados con `data-sin-confirmar` (buscadores, filtros) no cuentan.
     */
    confirmarDescarte?: boolean
}

const SELECTOR_ENFOCABLE =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function Modal({
    children,
    onClose,
    titulo,
    maxWidth,
    cerrarAlClickFuera = true,
    confirmarDescarte = false,
}: Props) {
    const contenedorRef = useRef<HTMLDivElement>(null)
    const idModal = useRef(Symbol('modal'))
    const tituloId = useId()
    const confirmar = useConfirm()

    // ¿El usuario tocó algún campo? Se marca escuchando los eventos de edición
    // dentro del modal, no comparando valores: los formularios que cargan datos
    // de forma asíncrona (o que muestran campos según lo elegido) cambiarían
    // solos y darían falsos avisos.
    const editadoRef = useRef(false)
    // Evita que Escape cierre a la vez el aviso y el modal de abajo: mientras se
    // pregunta, este modal ignora las peticiones de cierre.
    const preguntandoRef = useRef(false)

    // `onClose` suele llegar como función inline (`onClose={() => setAbierto(false)}`),
    // así que cambia de identidad en cada render. Lo guardamos en una ref para que el
    // efecto de abajo NO dependa de él: si dependiera, cada tecla escrita en el
    // formulario lo remontaría, la limpieza devolvería el foco al botón que abrió el
    // modal y el foco terminaría saltando al primer campo.
    const onCloseRef = useRef(onClose)
    useEffect(() => {
        onCloseRef.current = onClose
    }, [onClose])

    const pedirCierre = useCallback(() => {
        if (preguntandoRef.current) return
        if (!confirmarDescarte || !editadoRef.current) {
            onCloseRef.current()
            return
        }
        preguntandoRef.current = true
        void confirmar({
            titulo: '¿Descartar los cambios?',
            mensaje: 'Lo que escribiste en este formulario se perderá.',
            textoConfirmar: 'Descartar',
            textoCancelar: 'Seguir editando',
            peligro: true,
        }).then((descartar) => {
            preguntandoRef.current = false
            if (descartar) onCloseRef.current()
        })
    }, [confirmar, confirmarDescarte])

    // Igual que `onClose`: la referencia cambia entre renders y el efecto de
    // abajo se monta una sola vez.
    const pedirCierreRef = useRef(pedirCierre)
    useEffect(() => {
        pedirCierreRef.current = pedirCierre
    }, [pedirCierre])

    // Se monta y se desmonta una sola vez, con el modal.
    useEffect(() => {
        const id = idModal.current
        pilaModales.push(id)
        const abridor = document.activeElement as HTMLElement | null
        const nodo = contenedorRef.current

        // Lleva el foco adentro del modal (si no está ya, p. ej. por autoFocus).
        if (nodo && !nodo.contains(document.activeElement)) {
            const primero = nodo.querySelector<HTMLElement>(SELECTOR_ENFOCABLE)
            ;(primero ?? nodo).focus()
        }

        const alEditar = (e: Event) => {
            const campo = e.target as HTMLElement | null
            if (!campo || campo.closest('[data-sin-confirmar]')) return
            editadoRef.current = true
        }
        // Hay elecciones que no pasan por un campo de formulario: p. ej. marcar
        // una fila de una tabla. Márcalas con `data-editable` para que cuenten.
        const alClicar = (e: Event) => {
            const objetivo = e.target as HTMLElement | null
            if (objetivo?.closest('[data-editable]')) alEditar(e)
        }
        // En captura para enterarnos aunque el campo detenga la propagación.
        nodo?.addEventListener('input', alEditar, true)
        nodo?.addEventListener('change', alEditar, true)
        nodo?.addEventListener('click', alClicar, true)

        const alPresionar = (e: KeyboardEvent) => {
            // Solo responde el modal de hasta arriba de la pila.
            if (pilaModales[pilaModales.length - 1] !== id) return

            if (e.key === 'Escape') {
                pedirCierreRef.current()
                return
            }
            if (e.key === 'Tab' && nodo) {
                // Trampa de foco: Tab circula dentro del modal.
                const enfocables = Array.from(nodo.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLE))
                if (enfocables.length === 0) return
                const primero = enfocables[0]
                const ultimo = enfocables[enfocables.length - 1]
                if (e.shiftKey && document.activeElement === primero) {
                    e.preventDefault()
                    ultimo.focus()
                } else if (!e.shiftKey && document.activeElement === ultimo) {
                    e.preventDefault()
                    primero.focus()
                }
            }
        }
        window.addEventListener('keydown', alPresionar)

        return () => {
            window.removeEventListener('keydown', alPresionar)
            nodo?.removeEventListener('input', alEditar, true)
            nodo?.removeEventListener('change', alEditar, true)
            nodo?.removeEventListener('click', alClicar, true)
            const posicion = pilaModales.indexOf(id)
            if (posicion !== -1) pilaModales.splice(posicion, 1)
            // Devuelve el foco a quien abrió el modal.
            abridor?.focus()
        }
    }, [])

    const api = useMemo(() => ({ pedirCierre }), [pedirCierre])

    return (
        <ModalContext.Provider value={api}>
            <div className="modal-overlay" onClick={cerrarAlClickFuera ? pedirCierre : undefined}>
                <div
                    ref={contenedorRef}
                    className="modal-content"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={titulo ? tituloId : undefined}
                    tabIndex={-1}
                    style={maxWidth ? { maxWidth } : undefined}
                    onClick={(e) => e.stopPropagation()}
                >
                    {titulo && <h2 id={tituloId}>{titulo}</h2>}
                    {children}
                </div>
            </div>
        </ModalContext.Provider>
    )
}

/**
 * Botón "Cancelar" de un modal. Cierra por la misma puerta que Escape y el
 * clic fuera, así que respeta el aviso de `confirmarDescarte`.
 */
export function BotonCancelarModal({
    children = 'Cancelar',
    disabled,
}: {
    children?: ReactNode
    disabled?: boolean
}) {
    const { pedirCierre } = useModal()
    return (
        <button type="button" className="btn btn--secondary" disabled={disabled} onClick={pedirCierre}>
            {children}
        </button>
    )
}
