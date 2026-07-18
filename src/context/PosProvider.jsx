// src/context/PosProvider.jsx
//
// Estado del punto de venta. El corte de caja y los tickets son POR TERMINAL
// (ver src/lib/terminal.js) y viven en la base de datos, de modo que
// sobreviven a recargas, cierres accidentales o cortes de luz.

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { PosContext } from './pos-context';
import { getTerminalId } from '../lib/terminal';

// Espera de inactividad antes de guardar el carrito, para no escribir en
// la base de datos con cada pulsación.
const GUARDADO_DEBOUNCE_MS = 800;

const aTicketLocal = (fila) => ({
    id: fila.ticket_id,
    carrito: fila.carrito ?? [],
    nombre: fila.nombre ?? null,
});

export default function PosProvider({ perfil, children }) {
    const terminalId = getTerminalId();

    const [corteActivo, setCorteActivo] = useState(null);
    const [cargandoCorte, setCargandoCorte] = useState(true);
    const [tickets, setTickets] = useState([]);
    const [ticketActivoId, setTicketActivoId] = useState(null);

    // Temporizadores de guardado pendientes, por ticket.
    const temporizadores = useRef(new Map());
    // Corte ya inicializado (evita crear tickets duplicados en StrictMode).
    const corteInicializado = useRef(null);

    // --- Corte de caja de ESTA terminal -------------------------------
    useEffect(() => {
        let cancelado = false;
        const cargarCorte = async () => {
            setCargandoCorte(true);
            const { data } = await supabase
                .from('cortescaja')
                .select('*')
                .eq('terminal_id', terminalId)
                .is('fecha_hora_cierre', null)
                .maybeSingle();
            if (!cancelado) {
                setCorteActivo(data ?? null);
                setCargandoCorte(false);
            }
        };
        cargarCorte();
        return () => { cancelado = true; };
    }, [perfil, terminalId]);

    // --- Crear un ticket vacío en la base de datos ---------------------
    const insertarTicket = useCallback(async (corteId) => {
        const { data, error } = await supabase
            .from('tickets')
            .insert({
                corte_id: corteId,
                empleado_id: perfil.empleado_id,
                terminal_id: terminalId,
                carrito: [],
            })
            .select('ticket_id, carrito, nombre')
            .single();
        if (error) {
            console.error('No se pudo crear el ticket:', error);
            return null;
        }
        return aTicketLocal(data);
    }, [perfil, terminalId]);

    // --- Cargar los tickets abiertos del corte -------------------------
    useEffect(() => {
        let cancelado = false;

        if (!corteActivo) {
            corteInicializado.current = null;
            setTickets([]);
            setTicketActivoId(null);
            return;
        }
        // Sin esta guarda, StrictMode ejecutaría el efecto dos veces y
        // crearía dos tickets vacíos.
        if (corteInicializado.current === corteActivo.corte_id) return;
        corteInicializado.current = corteActivo.corte_id;

        const cargarTickets = async () => {
            const { data, error } = await supabase
                .from('tickets')
                .select('ticket_id, carrito, nombre')
                .eq('terminal_id', terminalId)
                .eq('corte_id', corteActivo.corte_id)
                .eq('estado', 'ABIERTO')
                .order('ticket_id');

            if (cancelado) return;
            if (error) {
                console.error('No se pudieron cargar los tickets:', error);
                return;
            }

            let lista = (data ?? []).map(aTicketLocal);
            if (lista.length === 0) {
                const nuevo = await insertarTicket(corteActivo.corte_id);
                if (cancelado) return;
                lista = nuevo ? [nuevo] : [];
            }
            setTickets(lista);
            setTicketActivoId(lista[0]?.id ?? null);
        };

        cargarTickets();
        return () => { cancelado = true; };
    }, [corteActivo, terminalId, insertarTicket]);

    // --- Guardado del carrito (debounced) ------------------------------
    const guardarCarrito = useCallback((ticketId, carrito) => {
        const pendientes = temporizadores.current;
        clearTimeout(pendientes.get(ticketId));
        pendientes.set(ticketId, setTimeout(async () => {
            pendientes.delete(ticketId);
            const { error } = await supabase
                .from('tickets')
                .update({ carrito })
                .eq('ticket_id', ticketId);
            if (error) console.error('No se pudo guardar el ticket:', error);
        }, GUARDADO_DEBOUNCE_MS));
    }, []);

    // Al desmontar, cancelamos temporizadores pendientes.
    useEffect(() => {
        const pendientes = temporizadores.current;
        return () => {
            pendientes.forEach(clearTimeout);
            pendientes.clear();
        };
    }, []);

    // --- Acciones sobre tickets ----------------------------------------
    const crearNuevoTicket = useCallback(async () => {
        if (!corteActivo) return;
        const nuevo = await insertarTicket(corteActivo.corte_id);
        if (!nuevo) return;
        setTickets(prev => [...prev, nuevo]);
        setTicketActivoId(nuevo.id);
    }, [corteActivo, insertarTicket]);

    // Quita un ticket de la lista y garantiza que siempre quede uno abierto.
    const descartarTicket = useCallback(async (idTicket, estado, ventaId = null) => {
        clearTimeout(temporizadores.current.get(idTicket));
        temporizadores.current.delete(idTicket);

        const { error } = await supabase
            .from('tickets')
            .update({ estado, venta_id: ventaId })
            .eq('ticket_id', idTicket);
        if (error) {
            console.error('No se pudo cerrar el ticket:', error);
            return;
        }

        const restantes = tickets.filter(t => t.id !== idTicket);
        if (restantes.length === 0) {
            const nuevo = corteActivo ? await insertarTicket(corteActivo.corte_id) : null;
            setTickets(nuevo ? [nuevo] : []);
            setTicketActivoId(nuevo?.id ?? null);
            return;
        }
        setTickets(restantes);
        if (ticketActivoId === idTicket) {
            setTicketActivoId(restantes[0].id);
        }
    }, [tickets, ticketActivoId, corteActivo, insertarTicket]);

    const cerrarTicket = useCallback((idTicket) => {
        // No permitimos quedarnos sin ningún ticket abierto.
        if (tickets.length <= 1) return;
        descartarTicket(idTicket, 'CANCELADO');
    }, [tickets, descartarTicket]);

    // Tras cobrar: el ticket queda registrado como COBRADO y ligado a su venta.
    const marcarTicketCobrado = useCallback((idTicket, ventaId) => {
        descartarTicket(idTicket, 'COBRADO', ventaId ?? null);
    }, [descartarTicket]);

    const actualizarCarritoActivo = useCallback((nuevoCarrito) => {
        if (!ticketActivoId) return;
        // La interfaz responde de inmediato; la base de datos, con debounce.
        setTickets(prev => prev.map(t => (t.id === ticketActivoId ? { ...t, carrito: nuevoCarrito } : t)));
        guardarCarrito(ticketActivoId, nuevoCarrito);
    }, [ticketActivoId, guardarCarrito]);

    const ticketActivo = tickets.find(t => t.id === ticketActivoId) || tickets[0] || { id: null, carrito: [] };

    const valor = {
        perfil,
        terminalId,
        corteActivo,
        setCorteActivo,
        cargandoCorte,
        tickets,
        ticketActivo,
        ticketActivoId,
        setTicketActivoId,
        crearNuevoTicket,
        cerrarTicket,
        marcarTicketCobrado,
        actualizarCarritoActivo,
    };

    return <PosContext.Provider value={valor}>{children}</PosContext.Provider>;
}
