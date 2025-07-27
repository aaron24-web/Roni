// src/App.jsx

import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Login from './components/Login';
import PantallaVenta from './components/PantallaVenta';
import GestionEmpleados from './components/GestionEmpleados';
import GestionProductos from './components/GestionProductos';
import GestionDepartamentos from './components/GestionDepartamentos';
import GestionClientes from './components/GestionClientes';
import CorteCaja from './components/CorteCaja';
import Reportes from './components/Reportes';
import GestionProveedores from './components/GestionProveedores';
import './App.css';

const navStyles = {
    padding: '10px 20px',
    background: '#e9ecef',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    borderBottom: '1px solid #dee2e6'
};
const navButton = {
    padding: '8px 15px',
    border: '1px solid transparent',
    borderRadius: '5px',
    background: 'none',
    fontSize: '16px',
    cursor: 'pointer'
};
const navButtonSelected = {
    ...navButton,
    background: 'white',
    borderColor: '#dee2e6'
};

function App() {
    const [perfil, setPerfil] = useState(null);
    const [vistaActual, setVistaActual] = useState('ventas');
    const [corteActivo, setCorteActivo] = useState(null);
    const [cargandoCorte, setCargandoCorte] = useState(true);
    const [tickets, setTickets] = useState([{ id: 1, carrito: [] }]);
    const [ticketActivoId, setTicketActivoId] = useState(1);
    const [nextTicketId, setNextTicketId] = useState(2);

    useEffect(() => {
        const verificarCorteActivoGlobal = async () => {
            if (!perfil) {
                setCorteActivo(null);
                setCargandoCorte(false);
                return;
            }
            setCargandoCorte(true);
            const { data } = await supabase.from('cortescaja').select('*').is('fecha_hora_cierre', null).single();
            setCorteActivo(data);
            setCargandoCorte(false);
        };
        verificarCorteActivoGlobal();
    }, [perfil]);

    const handleLoginSuccess = (loggedInProfile) => { setPerfil(loggedInProfile); };
    const handleLogout = () => {
        setPerfil(null);
        setTickets([{ id: 1, carrito: [] }]);
        setTicketActivoId(1);
        setNextTicketId(2);
        setVistaActual('ventas');
        setCorteActivo(null);
    };

    const crearNuevoTicket = () => {
        const nuevoTicket = { id: nextTicketId, carrito: [] };
        setTickets([...tickets, nuevoTicket]);
        setTicketActivoId(nextTicketId);
        setNextTicketId(nextTicketId + 1);
    };
    const cerrarTicket = (idACerrar) => {
        if (tickets.length <= 1) return;
        const nuevosTickets = tickets.filter(t => t.id !== idACerrar);
        setTickets(nuevosTickets);
        if (ticketActivoId === idACerrar) {
            setTicketActivoId(nuevosTickets[0].id);
        }
    };
    const actualizarCarritoActivo = (nuevoCarrito) => {
        setTickets(tickets.map(t => t.id === ticketActivoId ? { ...t, carrito: nuevoCarrito } : t));
    };
    
    const ticketActivo = tickets.find(t => t.id === ticketActivoId) || tickets[0];

    const renderizarVista = () => {
        switch (vistaActual) {
            case 'ventas':
                return <PantallaVenta perfil={perfil} carrito={ticketActivo.carrito} onCarritoChange={actualizarCarritoActivo} onVentaCompleta={() => cerrarTicket(ticketActivo.id)} corteActivo={corteActivo} />;
            case 'productos':
                return <GestionProductos perfil={perfil} />;
            case 'departamentos':
                return <GestionDepartamentos perfil={perfil} />;
            case 'clientes':
                return <GestionClientes perfil={perfil} />;
            case 'empleados':
                return <GestionEmpleados perfil={perfil} />;
            case 'proveedores':
                return <GestionProveedores perfil={perfil} />;
            case 'caja':
                return <CorteCaja perfil={perfil} corteActivo={corteActivo} onCajaStateChange={setCorteActivo} />;
            case 'reportes':
                return <Reportes perfil={perfil} />;
            default:
                return <div>Vista no encontrada</div>;
        }
    };

    return (
        <div className="App">
            {!perfil ? (
                <Login onLogin={handleLoginSuccess} />
            ) : (
                <>
                    <header className="App-header">
                        <h1>Papelería Roni</h1>
                        <div>
                            {perfil.nombre_completo} ({perfil.nombre_rol})
                            <button onClick={handleLogout} style={{marginLeft: '15px'}}>Cerrar Sesión</button>
                        </div>
                    </header>
                    
                    <nav style={navStyles}>
                        <button style={vistaActual === 'ventas' ? navButtonSelected : navButton} onClick={() => setVistaActual('ventas')}>Ventas</button>
                        <button style={vistaActual === 'productos' ? navButtonSelected : navButton} onClick={() => setVistaActual('productos')}>Productos</button>
                        <button style={vistaActual === 'departamentos' ? navButtonSelected : navButton} onClick={() => setVistaActual('departamentos')}>Departamentos</button>
                        <button style={vistaActual === 'clientes' ? navButtonSelected : navButton} onClick={() => setVistaActual('clientes')}>Clientes</button>
                        <button style={vistaActual === 'caja' ? navButtonSelected : navButton} onClick={() => setVistaActual('caja')}>Caja</button>
                        
                        {/* Pestañas solo para Administradores */}
                        {perfil?.nombre_rol?.toLowerCase() === 'administrador' && (
                            <>
                                <button style={vistaActual === 'proveedores' ? navButtonSelected : navButton} onClick={() => setVistaActual('proveedores')}>Proveedores</button>
                                <button style={vistaActual === 'empleados' ? navButtonSelected : navButton} onClick={() => setVistaActual('empleados')}>Empleados</button>
                                <button style={vistaActual === 'reportes' ? navButtonSelected : navButton} onClick={() => setVistaActual('reportes')}>Reportes</button>
                            </>
                        )}
                    </nav>
                    
                    {vistaActual === 'ventas' && corteActivo && (
                        <div className="tickets-nav">
                            {tickets.map((ticket, index) => (
                                <button key={ticket.id} className={`ticket-tab ${ticket.id === ticketActivoId ? 'active' : ''}`} onClick={() => setTicketActivoId(ticket.id)}>
                                    Ticket {index + 1}
                                    {tickets.length > 1 && <span onClick={(e) => { e.stopPropagation(); cerrarTicket(ticket.id); }} style={{marginLeft: '8px', color: 'red', fontWeight:'bold'}}>x</span>}
                                </button>
                            ))}
                            <button className="new-ticket-btn" onClick={crearNuevoTicket}>+</button>
                        </div>
                    )}

                    <main>
                        {cargandoCorte ? <div>Cargando...</div> : renderizarVista()}
                    </main>
                </>
            )}
        </div>
    );
}

export default App;