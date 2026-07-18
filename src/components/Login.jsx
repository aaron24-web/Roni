// src/components/Login.jsx

import { useState } from 'react';
import { supabase } from '../supabaseClient';

const styles = {
    container: { height: '100vh', width: '100vw', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f5' },
    loginBox: { padding: '40px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', width: '100%', maxWidth: '400px', textAlign: 'center' },
    input: { width: '100%', padding: '12px', fontSize: '16px', marginBottom: '15px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' },
    button: { width: '100%', padding: '12px', fontSize: '16px', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: '#0078d4', color: 'white', cursor: 'pointer' },
    error: { color: 'red', marginTop: '10px' }
};

// El inicio de sesión ahora usa Supabase Auth (email + contraseña con JWT).
// Al autenticarse, App.jsx detecta la sesión y carga el perfil del empleado.
export default function Login() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });

        if (error) {
            setError(
                error.message === 'Invalid login credentials'
                    ? 'Correo o contraseña incorrectos.'
                    : error.message
            );
            setLoading(false);
        }
        // Si el login es exitoso, el listener de sesión en App.jsx toma el control.
    };

    return (
        <div style={styles.container}>
            <div style={styles.loginBox}>
                <h2>Iniciar Sesión · Papelería Roni</h2>
                <form onSubmit={handleLogin}>
                    <input
                        style={styles.input}
                        type="email"
                        placeholder="Correo electrónico"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="username"
                        required
                    />
                    <input
                        style={styles.input}
                        type="password"
                        placeholder="Contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                    />
                    <button style={styles.button} type="submit" disabled={loading}>
                        {loading ? 'Ingresando...' : 'Ingresar'}
                    </button>
                    {error && <p style={styles.error}>{error}</p>}
                </form>
            </div>
        </div>
    );
}
