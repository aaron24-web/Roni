// src/context/PosProvider.jsx
//
// Estado compartido del punto de venta que debe sobrevivir a la navegación
// entre rutas: el corte de caja activo y los tickets abiertos.

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { PosContext } from './pos-context';

const ticketInicial = () => [{ id: 1, carrito: [] }];

export default function PosProvider({ perfil, children }) {
    const [corteActivo, setCorteActivo] = useState(null);
    const [cargandoCorte, setCargandoCorte] = useState(true);
    const [tickets, setTickets] = useState(ticketInicial);
    const [ticketActivoId, setTicketActivoId] = useState(1);
    const [nextTicketId, setNextTicketId] = useState(2);

    // Busca el corte de caja abierto (sin fecha de cierre) del turno actual.
    useEffect(() => {
        let cancelado = false;
        const verificarCorteActivo = async () => {
            setCargandoCorte(true);
            const { data } = await supabase
                .from('cortescaja')
                .select('*')
                .is('fecha_hora_cierre', null)
                .maybeSingle();
            if (!cancelado) {
                setCorteActivo(data ?? null);
                setCargandoCorte(false);
            }
        };
        verificarCorteActivo();
        return () => { cancelado = true; };
    }, [perfil]);

    const crearNuevoTicket = useCallback(() => {
        setTickets(prev => [...prev, { id: nextTicketId, carrito: [] }]);
        setTicketActivoId(nextTicketId);
        setNextTicketId(id => id + 1);
    }, [nextTicketId]);

    const cerrarTicket = useCallback((idACerrar) => {
        setTickets(prev => {
            if (prev.length <= 1) return prev;
            const restantes = prev.filter(t => t.id !== idACerrar);
            setTicketActivoId(actual => (actual === idACerrar ? restantes[0].id : actual));
            return restantes;
        });
    }, []);

    const actualizarCarritoActivo = useCallback((nuevoCarrito) => {
        setTickets(prev => prev.map(t => (t.id === ticketActivoId ? { ...t, carrito: nuevoCarrito } : t)));
    }, [ticketActivoId]);

    const reiniciarTickets = useCallback(() => {
        setTickets(ticketInicial());
        setTicketActivoId(1);
        setNextTicketId(2);
    }, []);

    const ticketActivo = tickets.find(t => t.id === ticketActivoId) || tickets[0];

    const valor = {
        perfil,
        corteActivo,
        setCorteActivo,
        cargandoCorte,
        tickets,
        ticketActivo,
        ticketActivoId,
        setTicketActivoId,
        crearNuevoTicket,
        cerrarTicket,
        actualizarCarritoActivo,
        reiniciarTickets,
    };

    return <PosContext.Provider value={valor}>{children}</PosContext.Provider>;
}
