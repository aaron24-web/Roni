// Estructura común de la aplicación autenticada: barra lateral con navegación
// por rol, encabezado con el título de la sección, las pestañas de tickets
// (solo en Ventas) y el contenido de la ruta en el <Outlet />.

import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { usePos } from '../context/pos-context'
import { useAuth } from '../context/auth-context'
import {
    IconVentas, IconProductos, IconClientes, IconCaja,
    IconDepartamentos, IconProveedores, IconEmpleados, IconReportes,
    IconPromociones, IconLogout,
} from './icons'
import type { ComponentType, SVGProps } from 'react'
import '../styles/layout.css'

interface Enlace {
    to: string
    label: string
    Icono: ComponentType<SVGProps<SVGSVGElement>>
}

// Rutas visibles para cualquier empleado autenticado.
const enlacesComunes: Enlace[] = [
    { to: '/ventas', label: 'Ventas', Icono: IconVentas },
    { to: '/productos', label: 'Productos', Icono: IconProductos },
    { to: '/clientes', label: 'Clientes', Icono: IconClientes },
    { to: '/caja', label: 'Caja', Icono: IconCaja },
]

// Rutas exclusivas de administrador (ver matriz de roles).
const enlacesAdmin: Enlace[] = [
    { to: '/departamentos', label: 'Departamentos', Icono: IconDepartamentos },
    { to: '/proveedores', label: 'Proveedores', Icono: IconProveedores },
    { to: '/empleados', label: 'Empleados', Icono: IconEmpleados },
    { to: '/reportes', label: 'Reportes', Icono: IconReportes },
    { to: '/promociones', label: 'Promociones', Icono: IconPromociones },
]

const TITULOS: Record<string, string> = {
    '/ventas': 'Punto de venta',
    '/productos': 'Productos',
    '/clientes': 'Clientes',
    '/caja': 'Corte de caja',
    '/departamentos': 'Departamentos',
    '/proveedores': 'Proveedores',
    '/empleados': 'Empleados',
    '/reportes': 'Reportes',
    '/promociones': 'Promociones',
}

const claseEnlace = ({ isActive }: { isActive: boolean }) =>
    `nav-link${isActive ? ' is-active' : ''}`

const iniciales = (nombre?: string) =>
    (nombre ?? '?')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('')

export default function Layout() {
    const { perfil, esAdmin, cerrarSesion } = useAuth()
    const {
        corteActivo, cargandoCorte, tickets, ticketActivoId,
        setTicketActivoId, crearNuevoTicket, cerrarTicket,
    } = usePos()
    const { pathname } = useLocation()
    const enVentas = pathname.startsWith('/ventas')
    const titulo = TITULOS[pathname] ?? 'Papelería Roni'

    return (
        <div className="app-shell">
            <aside className="sidebar">
                <div className="sidebar__brand">
                    <div className="sidebar__mark" aria-hidden="true">R</div>
                    <div className="sidebar__title">
                        <strong>Papelería Roni</strong>
                        <span>Punto de venta</span>
                    </div>
                </div>

                <nav className="sidebar__nav" aria-label="Navegación principal">
                    <div className="sidebar__section">Operación</div>
                    {enlacesComunes.map(({ to, label, Icono }) => (
                        <NavLink key={to} to={to} className={claseEnlace}>
                            <Icono aria-hidden="true" />
                            <span>{label}</span>
                        </NavLink>
                    ))}

                    {esAdmin && (
                        <>
                            <div className="sidebar__section">Administración</div>
                            {enlacesAdmin.map(({ to, label, Icono }) => (
                                <NavLink key={to} to={to} className={claseEnlace}>
                                    <Icono aria-hidden="true" />
                                    <span>{label}</span>
                                </NavLink>
                            ))}
                        </>
                    )}
                </nav>

                <div className="sidebar__footer">
                    <div className="sidebar__avatar" aria-hidden="true">{iniciales(perfil?.nombre_completo)}</div>
                    <div className="sidebar__user">
                        <strong>{perfil?.nombre_completo}</strong>
                        <span>{perfil?.nombre_rol}</span>
                    </div>
                    <button className="sidebar__logout" onClick={cerrarSesion} title="Cerrar sesión" aria-label="Cerrar sesión">
                        <IconLogout />
                    </button>
                </div>
            </aside>

            <div className="app-main">
                <header className="topbar">
                    <h1 className="topbar__title">{titulo}</h1>
                    <span className="topbar__meta">
                        {corteActivo ? 'Caja abierta' : 'Caja cerrada'}
                    </span>
                </header>

                {enVentas && corteActivo && (
                    <div className="tickets-nav" role="tablist" aria-label="Tickets abiertos">
                        {tickets.map((ticket, index) => (
                            <button
                                key={ticket.id}
                                role="tab"
                                aria-selected={ticket.id === ticketActivoId}
                                className={`ticket-tab ${ticket.id === ticketActivoId ? 'active' : ''}`}
                                onClick={() => setTicketActivoId(ticket.id)}
                            >
                                Ticket {index + 1}
                                {tickets.length > 1 && (
                                    <span
                                        className="ticket-tab__cerrar"
                                        aria-hidden="true"
                                        title="Cerrar ticket"
                                        onClick={(e) => { e.stopPropagation(); cerrarTicket(ticket.id) }}
                                    >×</span>
                                )}
                            </button>
                        ))}
                        <button className="new-ticket-btn" onClick={crearNuevoTicket} title="Nuevo ticket (F7)" aria-label="Nuevo ticket (F7)">+</button>
                    </div>
                )}

                <main className="app-content">
                    {cargandoCorte ? <div style={{ padding: 'var(--space-5)' }}>Cargando...</div> : <Outlet />}
                </main>
            </div>
        </div>
    )
}
