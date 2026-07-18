// Aprobación de un supervisor para acciones sensibles del cajero.
//
// El supervisor introduce sus credenciales de Supabase Auth; se validan en el
// servidor sin cerrar ni alterar la sesión del cajero que está en caja.

import { useState, type FormEvent } from 'react'
import { useVerificarSupervisor } from './useVentas'

interface Props {
    onApprove: (supervisorId: number) => void
    onCancel: () => void
}

export default function SupervisorApprovalModal({ onApprove, onCancel }: Props) {
    const verificar = useVerificarSupervisor()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    const handleAprobar = async (e: FormEvent) => {
        e.preventDefault()
        setError('')
        try {
            const supervisorId = await verificar.mutateAsync({ email: email.trim(), password })
            if (supervisorId) {
                onApprove(supervisorId)
            } else {
                setError('Credenciales incorrectas o la cuenta no es de un administrador activo.')
            }
        } catch (err) {
            setError((err as Error).message)
        }
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '450px' }}>
                <h2>Se Requiere Aprobación de Supervisor</h2>
                <p>Un administrador debe ingresar sus credenciales para continuar.</p>
                <form onSubmit={handleAprobar}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                        <label>Correo del supervisor:</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pos-input"
                            autoComplete="off"
                            required
                            autoFocus
                        />
                        <label>Contraseña:</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pos-input"
                            autoComplete="off"
                            required
                        />
                        {error && <p style={{ color: 'red' }}>{error}</p>}
                    </div>
                    <div className="footer" style={{ marginTop: '20px' }}>
                        <button type="button" className="pos-button" onClick={onCancel} disabled={verificar.isPending}>
                            Cancelar
                        </button>
                        <button type="submit" className="checkout-btn" disabled={verificar.isPending}>
                            {verificar.isPending ? 'Verificando...' : 'Aprobar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
