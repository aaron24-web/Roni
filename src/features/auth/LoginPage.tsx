// Inicio de sesión con Supabase Auth (correo + contraseña).
// Al autenticarse, AuthProvider detecta la sesión y carga el perfil.

import { useState, type FormEvent } from 'react'
import { supabase } from '../../shared/lib/supabase'
import '../../shared/styles/layout.css'

export default function LoginPage() {
    const [cargando, setCargando] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault()
        setError(null)
        setCargando(true)

        const { error: errorLogin } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        })

        if (errorLogin) {
            setError(
                errorLogin.message === 'Invalid login credentials'
                    ? 'Correo o contraseña incorrectos.'
                    : errorLogin.message
            )
            setCargando(false)
        }
        // Si el login es exitoso, AuthProvider toma el control.
    }

    return (
        <div className="login-screen">
            <aside className="login-hero">
                <div className="login-hero__content">
                    <div className="login-hero__mark" aria-hidden="true">R</div>
                    <h1>Papelería Roni</h1>
                    <p className="login-hero__tag">
                        El punto de venta pensado para tu papelería: rápido, claro y siempre a la mano.
                    </p>
                    <ul className="login-hero__features">
                        <li>
                            <Palomita />
                            Cobra rápido con varios tickets a la vez
                        </li>
                        <li>
                            <Palomita />
                            Inventario y cortes de caja al día
                        </li>
                        <li>
                            <Palomita />
                            Crédito y estado de cuenta de tus clientes
                        </li>
                    </ul>
                </div>
                <TicketArt />
            </aside>

            <main className="login-main">
                <div className="login-form-wrap">
                    <h2>Inicia sesión</h2>
                    <p className="login-main__sub">Ingresa tus credenciales para continuar</p>
                    <form onSubmit={handleLogin} className="login-form">
                        <label htmlFor="login-email">Correo electrónico</label>
                        <input
                            id="login-email"
                            className="pos-input"
                            type="email"
                            placeholder="tucorreo@roni.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="username"
                            required
                        />
                        <label htmlFor="login-password">Contraseña</label>
                        <input
                            id="login-password"
                            className="pos-input"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            required
                        />
                        <button className="btn btn--primary" type="submit" disabled={cargando}>
                            {cargando ? 'Ingresando...' : 'Ingresar'}
                        </button>
                        {error && <p className="texto-error" style={{ textAlign: 'center', margin: 0 }}>{error}</p>}
                    </form>
                </div>
            </main>
        </div>
    )
}

// Palomita ámbar de las viñetas del panel de marca.
function Palomita() {
    return (
        <span className="login-hero__badge" aria-hidden="true">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
            </svg>
        </span>
    )
}

// Ilustración decorativa: un ticket de venta (guiño al POS), en trazo.
function TicketArt() {
    return (
        <svg className="login-hero__art" viewBox="0 0 180 240" fill="none" aria-hidden="true">
            <path
                d="M20 14h140v206l-16-10-16 10-16-10-16 10-16-10-16 10-16-10-16 10z"
                fill="#fff" fillOpacity="0.06" stroke="#F4B740" strokeWidth="2.5" strokeLinejoin="round"
            />
            <line x1="40" y1="46" x2="140" y2="46" stroke="#F4B740" strokeWidth="3" strokeLinecap="round" />
            <line x1="40" y1="74" x2="120" y2="74" stroke="#fff" strokeOpacity="0.5" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="40" y1="94" x2="128" y2="94" stroke="#fff" strokeOpacity="0.5" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="40" y1="114" x2="112" y2="114" stroke="#fff" strokeOpacity="0.5" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="40" y1="150" x2="140" y2="150" stroke="#fff" strokeOpacity="0.3" strokeWidth="2" strokeDasharray="4 6" strokeLinecap="round" />
            <line x1="40" y1="176" x2="80" y2="176" stroke="#fff" strokeOpacity="0.7" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="112" y1="176" x2="140" y2="176" stroke="#F4B740" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
    )
}
