// Panel de configuración de la impresora de tickets de ESTA terminal.
//
// La conexión directa usa Web Serial (Chrome/Edge): el navegador pide
// permiso una vez y después la impresora se enlaza sola al conectarla.
// Sin térmica, la "Imprimir prueba" usa el diálogo del sistema — con
// "Guardar como PDF" se puede verificar el formato sin hardware.

import { useEffect, useState } from 'react'
import {
    useImpresora,
    conectarImpresora,
    desconectarImpresora,
    reconectarImpresoraPrevia,
    imprimirPrueba,
    imprimirAlCobrar,
    fijarImprimirAlCobrar,
} from '../../shared/lib/impresora'
import { useToast } from '../../shared/components/feedback/toast-context'

const BADGES = {
    conectada: { texto: 'Conectada', clase: 'badge--success' },
    desconectada: { texto: 'Sin conectar', clase: 'badge--muted' },
    'sin-soporte': { texto: 'Sin conexión directa', clase: 'badge--info' },
} as const

export default function PanelImpresora() {
    const estado = useImpresora()
    const toast = useToast()
    const [autoImprimir, setAutoImprimir] = useState(imprimirAlCobrar)

    // Si ya se autorizó una impresora antes, intenta enlazarla al entrar.
    useEffect(() => {
        void reconectarImpresoraPrevia()
    }, [])

    const handleConectar = async () => {
        const enlazada = await conectarImpresora()
        if (enlazada) toast.success('Impresora conectada y lista.')
        else toast.info('No se enlazó ninguna impresora.')
    }

    const handlePrueba = async () => {
        try {
            await imprimirPrueba()
            if (estado === 'conectada') toast.success('Ticket de prueba enviado a la impresora.')
        } catch (err) {
            toast.error(`No se pudo imprimir: ${(err as Error).message}`)
        }
    }

    const alternarAutoImprimir = () => {
        const nuevo = !autoImprimir
        setAutoImprimir(nuevo)
        fijarImprimirAlCobrar(nuevo)
    }

    const badge = BADGES[estado]

    return (
        <section className="panel-impresora" aria-label="Impresora de tickets">
            <h4>
                Impresora de tickets
                <span className={`badge ${badge.clase}`}>{badge.texto}</span>
            </h4>

            {estado === 'sin-soporte' ? (
                <p className="texto-silenciado">
                    Este navegador no permite conexión directa con impresoras térmicas
                    (usa Chrome o Edge en la computadora de la caja). La impresión con
                    el diálogo del sistema sigue disponible.
                </p>
            ) : (
                <p className="texto-silenciado">
                    Conecta una impresora térmica de tickets (58/80 mm) por USB. Tras
                    autorizarla una vez, se enlaza sola cada vez que la enchufes.
                    En efectivo, también manda la señal de apertura al cajón de dinero.
                </p>
            )}

            <div className="acciones" style={{ flexWrap: 'wrap' }}>
                {estado === 'desconectada' && (
                    <button className="btn btn--primary" onClick={handleConectar}>Conectar impresora</button>
                )}
                {estado === 'conectada' && (
                    <button className="btn btn--secondary" onClick={() => void desconectarImpresora()}>Desconectar</button>
                )}
                <button className="btn btn--secondary" onClick={handlePrueba}>
                    Imprimir prueba{estado !== 'conectada' ? ' (navegador)' : ''}
                </button>
                <button
                    type="button"
                    className={`toggle-chip${autoImprimir ? ' is-on' : ''}`}
                    aria-pressed={autoImprimir}
                    onClick={alternarAutoImprimir}
                >
                    Imprimir ticket al cobrar
                </button>
            </div>
        </section>
    )
}
