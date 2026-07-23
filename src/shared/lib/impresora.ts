// Impresora de tickets de la terminal.
//
// Dos vías de impresión:
//   1. **Directa (Web Serial + ESC/POS):** para impresoras térmicas de tickets
//      (58/80 mm) conectadas por USB/serie. Soporta corte de papel y apertura
//      de cajón de dinero. Solo disponible en Chrome/Edge; el navegador pide
//      permiso la primera vez y recuerda el puerto, así que al reconectar la
//      impresora se detecta y enlaza sola (eventos connect/disconnect).
//   2. **Navegador (fallback):** imprime el mismo ticket con el diálogo del
//      sistema (sirve cualquier impresora instalada, o "Guardar como PDF"
//      para probar sin hardware).
//
// El estado es un singleton por pestaña; la UI se suscribe con useImpresora().

import { useSyncExternalStore } from 'react'

// --- Tipos mínimos de Web Serial (no vienen en la lib estándar de TS) ------
interface PuertoSerie {
    open(opciones: { baudRate: number }): Promise<void>
    close(): Promise<void>
    writable: WritableStream<Uint8Array> | null
}

interface SerialNavegador extends EventTarget {
    requestPort(): Promise<PuertoSerie>
    getPorts(): Promise<PuertoSerie[]>
}

declare global {
    interface Navigator {
        serial?: SerialNavegador
    }
}

export type EstadoImpresora = 'sin-soporte' | 'desconectada' | 'conectada'

// Ancho del ticket en caracteres (32 = térmica de 58 mm; usa 42 para 80 mm).
const ANCHO_TICKET = 32
const BAUDIOS = 9600
const CLAVE_AUTOIMPRESION = 'roni_imprimir_al_cobrar'

// --- Singleton -------------------------------------------------------------

let puerto: PuertoSerie | null = null
let estado: EstadoImpresora = typeof navigator !== 'undefined' && navigator.serial ? 'desconectada' : 'sin-soporte'
const oyentes = new Set<() => void>()

const notificar = () => oyentes.forEach(fn => fn())

const cambiarEstado = (nuevo: EstadoImpresora) => {
    if (estado === nuevo) return
    estado = nuevo
    notificar()
}

async function abrirPuerto(candidato: PuertoSerie): Promise<boolean> {
    try {
        await candidato.open({ baudRate: BAUDIOS })
        puerto = candidato
        cambiarEstado('conectada')
        return true
    } catch (err) {
        // Típico: el puerto ya está abierto por otra pestaña, o se desenchufó.
        console.error('[impresora] no se pudo abrir el puerto:', err)
        return false
    }
}

/** Pide al usuario elegir la impresora (requiere un clic; Chrome/Edge). */
export async function conectarImpresora(): Promise<boolean> {
    if (!navigator.serial) return false
    try {
        const elegido = await navigator.serial.requestPort()
        return await abrirPuerto(elegido)
    } catch {
        // El usuario cerró el diálogo sin elegir: no es un error.
        return false
    }
}

export async function desconectarImpresora(): Promise<void> {
    try {
        await puerto?.close()
    } catch (err) {
        console.error('[impresora] error al cerrar:', err)
    }
    puerto = null
    cambiarEstado('desconectada')
}

/** Reintenta enlazar una impresora ya autorizada (al cargar la app). */
export async function reconectarImpresoraPrevia(): Promise<void> {
    if (!navigator.serial || puerto) return
    const previos = await navigator.serial.getPorts()
    if (previos[0]) await abrirPuerto(previos[0])
}

// Detección automática: al enchufar una impresora YA autorizada se enlaza
// sola; al desenchufarla, el estado pasa a desconectada.
if (typeof navigator !== 'undefined' && navigator.serial) {
    navigator.serial.addEventListener('connect', (e) => {
        if (!puerto) void abrirPuerto(e.target as unknown as PuertoSerie)
    })
    navigator.serial.addEventListener('disconnect', (e) => {
        if ((e.target as unknown as PuertoSerie) === puerto) {
            puerto = null
            cambiarEstado('desconectada')
        }
    })
}

/** Hook de React: estado reactivo de la impresora. */
export function useImpresora(): EstadoImpresora {
    return useSyncExternalStore(
        (fn) => {
            oyentes.add(fn)
            return () => oyentes.delete(fn)
        },
        () => estado,
    )
}

// --- Preferencia "imprimir al cobrar" (por terminal) -----------------------

export const imprimirAlCobrar = () => localStorage.getItem(CLAVE_AUTOIMPRESION) === '1'
export const fijarImprimirAlCobrar = (valor: boolean) => {
    localStorage.setItem(CLAVE_AUTOIMPRESION, valor ? '1' : '0')
}

// --- Formato del ticket ----------------------------------------------------

export interface RenglonTicket {
    cantidad: number
    descripcion: string
    importe: number
    descuento?: number
}

export interface DatosTicket {
    ventaId: number
    fecha: Date
    empleado: string
    cliente?: string
    renglones: RenglonTicket[]
    total: number
    metodoPago: string
    recibido?: number
    cambio?: number
}

const linea = (relleno = '-') => relleno.repeat(ANCHO_TICKET)
const centrar = (texto: string) => {
    const espacio = Math.max(0, Math.floor((ANCHO_TICKET - texto.length) / 2))
    return ' '.repeat(espacio) + texto
}
const dosColumnas = (izquierda: string, derecha: string) => {
    const hueco = ANCHO_TICKET - izquierda.length - derecha.length
    if (hueco < 1) return `${izquierda.slice(0, ANCHO_TICKET - derecha.length - 1)} ${derecha}`
    return izquierda + ' '.repeat(hueco) + derecha
}
const dinero = (n: number) => `$${n.toFixed(2)}`

/** Convierte los datos de la venta en las líneas de texto del ticket. */
export function formatearTicket(datos: DatosTicket): string[] {
    const lineas: string[] = []
    lineas.push(centrar('PAPELERIA RONI'))
    lineas.push(centrar('Punto de venta'))
    lineas.push(linea())
    lineas.push(dosColumnas(`Venta #${datos.ventaId}`, datos.fecha.toLocaleDateString()))
    lineas.push(dosColumnas(`Atiende: ${datos.empleado.slice(0, 20)}`, datos.fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })))
    if (datos.cliente && datos.cliente !== 'Público en General') {
        lineas.push(`Cliente: ${datos.cliente.slice(0, ANCHO_TICKET - 9)}`)
    }
    lineas.push(linea())
    for (const renglon of datos.renglones) {
        lineas.push(renglon.descripcion.slice(0, ANCHO_TICKET))
        lineas.push(dosColumnas(`  ${renglon.cantidad} x`, dinero(renglon.importe)))
        if (renglon.descuento && renglon.descuento > 0) {
            lineas.push(dosColumnas('  promo', `-${dinero(renglon.descuento)}`))
        }
    }
    lineas.push(linea())
    lineas.push(dosColumnas('TOTAL', dinero(datos.total)))
    lineas.push(dosColumnas(datos.metodoPago, datos.recibido != null ? dinero(datos.recibido) : ''))
    if (datos.cambio != null && datos.cambio > 0) {
        lineas.push(dosColumnas('Cambio', dinero(datos.cambio)))
    }
    lineas.push(linea())
    lineas.push(centrar('¡Gracias por su compra!'))
    return lineas
}

// --- Impresión directa (ESC/POS) -------------------------------------------

// Codificación CP437/CP1252 básica: ASCII directo; acentos latinos del rango
// Latin-1 pasan tal cual (coinciden con WPC1252 del comando ESC t 16).
function codificar(texto: string): number[] {
    const bytes: number[] = []
    for (const caracter of texto) {
        const codigo = caracter.codePointAt(0) ?? 63
        bytes.push(codigo <= 0xff ? codigo : 63 /* ? */)
    }
    return bytes
}

async function escribirBytes(bytes: number[]): Promise<void> {
    if (!puerto?.writable) throw new Error('La impresora no está conectada.')
    const escritor = puerto.writable.getWriter()
    try {
        await escritor.write(new Uint8Array(bytes))
    } finally {
        escritor.releaseLock()
    }
}

/** Imprime líneas de texto en la térmica, corta y (opcional) abre el cajón. */
export async function imprimirDirecto(lineas: string[], opciones: { abrirCajon?: boolean } = {}): Promise<void> {
    const bytes: number[] = []
    bytes.push(0x1b, 0x40)          // ESC @  — inicializar
    bytes.push(0x1b, 0x74, 16)      // ESC t 16 — página de códigos WPC1252 (acentos)
    for (const l of lineas) {
        bytes.push(...codificar(l), 0x0a)
    }
    bytes.push(0x0a, 0x0a, 0x0a)    // alimentar papel
    bytes.push(0x1d, 0x56, 0x42, 0x00) // GS V B 0 — corte parcial
    if (opciones.abrirCajon) {
        bytes.push(0x1b, 0x70, 0x00, 0x19, 0xfa) // ESC p — pulso al cajón
    }
    await escribirBytes(bytes)
}

// --- Impresión por el navegador (fallback) ---------------------------------

const escaparHtml = (texto: string) =>
    texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Imprime el ticket con el diálogo del sistema (o "Guardar como PDF"). */
export function imprimirEnNavegador(lineas: string[]): void {
    const marco = document.createElement('iframe')
    marco.style.position = 'fixed'
    marco.style.right = '0'
    marco.style.bottom = '0'
    marco.style.width = '0'
    marco.style.height = '0'
    marco.style.border = '0'
    document.body.appendChild(marco)

    const documento = marco.contentDocument
    if (!documento) return
    documento.open()
    documento.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Ticket</title><style>
        @page { margin: 4mm; size: 80mm auto; }
        body { font-family: 'Courier New', Courier, monospace; font-size: 12px; line-height: 1.35; white-space: pre; margin: 0; }
    </style></head><body>${lineas.map(escaparHtml).join('\n')}</body></html>`)
    documento.close()
    marco.contentWindow?.focus()
    marco.contentWindow?.print()
    // Se retira el iframe cuando el diálogo ya tomó el contenido.
    setTimeout(() => marco.remove(), 2000)
}

/**
 * Imprime el ticket por la mejor vía disponible: directa si hay térmica
 * conectada (abriendo el cajón si se pagó en efectivo), o navegador si no.
 */
export async function imprimirTicket(datos: DatosTicket, opciones: { abrirCajon?: boolean } = {}): Promise<void> {
    const lineas = formatearTicket(datos)
    if (estado === 'conectada') {
        await imprimirDirecto(lineas, opciones)
    } else {
        imprimirEnNavegador(lineas)
    }
}

/** Ticket de prueba para verificar la conexión/configuración. */
export async function imprimirPrueba(): Promise<void> {
    await imprimirTicket({
        ventaId: 0,
        fecha: new Date(),
        empleado: 'Prueba de impresión',
        renglones: [{ cantidad: 1, descripcion: 'Artículo de prueba', importe: 10 }],
        total: 10,
        metodoPago: 'Efectivo',
        recibido: 10,
    })
}
