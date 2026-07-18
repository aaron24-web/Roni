// src/components/Layout.tsx
//
// Estructura común de la aplicación autenticada: encabezado, navegación
// por rol y las pestañas de tickets (solo en Ventas). El contenido de cada
// ruta se renderiza en el <Outlet />.

import { NavLink, Outlet, useLocation } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { usePos } from '../context/pos-context'
import { useAuth } from '../context/auth-context'

const navStyles: CSSProperties = {
    padding: '10px 20px',
    background: '#e9ecef',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    borderBottom: '1px solid #dee2e6',
}
const navButton: CSSProperties = {
    padding: '8px 15px',
    border: '1px solid transparent',
    borderRadius: '5px',
    background: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    textDecoration: 'none',
    color: 'inherit',
}
const navButtonSelected: CSSProperties = {
    ...navButton,
    background: 'white',
    borderColor: '#dee2e6',
}

const enlaceEstilo = ({ isActive }: { isActive: boolean }) =>
    (isActive ? navButtonSelected : navButton)

// Rutas visibles para cualquier empleado autenticado.
const enlacesComunes = [
    { to: '/ventas', label: 'Ventas' },
    { to: '/productos', label: 'Productos' },
    { to: '/clientes', label: 'Clientes' },
    { to: '/caja', label: 'Caja' },
]

// Rutas exclusivas de administrador (ver matriz de roles).
const enlacesAdmin = [
    { to: '/departamentos', label: 'Departamentos' },
    { to: '/proveedores', label: 'Proveedores' },
    { to: '/empleados', label: 'Empleados' },
    { to: '/reportes', label: 'Reportes' },
    { to: '/promociones', label: 'Promociones' },
]

export default function Layout() {
    const { perfil, esAdmin, cerrarSesion } = useAuth()
    const {
        corteActivo, cargandoCorte, tickets, ticketActivoId,
        setTicketActivoId, crearNuevoTicket, cerrarTicket,
    } = usePos()
    const { pathname } = useLocation()
    const enVentas = pathname.startsWith('/ventas')

    return (
        <div className="App">
            <header className="App-header">
                <h1>Papelería Roni</h1>
                <div>
                    {perfil?.nombre_completo} ({perfil?.nombre_rol})
                    <button onClick={cerrarSesion} style={{ marginLeft: '15px' }}>Cerrar Sesión</button>
                </div>
            </header>

            <nav style={navStyles}>
                {enlacesComunes.map(({ to, label }) => (
                    <NavLink key={to} to={to} style={enlaceEstilo}>{label}</NavLink>
                ))}
                {esAdmin && enlacesAdmin.map(({ to, label }) => (
                    <NavLink key={to} to={to} style={enlaceEstilo}>{label}</NavLink>
                ))}
            </nav>

            {enVentas && corteActivo && (
                <div className="tickets-nav">
                    {tickets.map((ticket, index) => (
                        <button
                            key={ticket.id}
                            className={`ticket-tab ${ticket.id === ticketActivoId ? 'active' : ''}`}
                            onClick={() => setTicketActivoId(ticket.id)}
                        >
                            Ticket {index + 1}
                            {tickets.length > 1 && (
                                <span
                                    onClick={(e) => { e.stopPropagation(); cerrarTicket(ticket.id) }}
                                    style={{ marginLeft: '8px', color: 'red', fontWeight: 'bold' }}
                                >x</span>
                            )}
                        </button>
                    ))}
                    <button className="new-ticket-btn" onClick={crearNuevoTicket}>+</button>
                </div>
            )}

            <main>
                {cargandoCorte ? <div>Cargando...</div> : <Outlet />}
            </main>
        </div>
    )
}
