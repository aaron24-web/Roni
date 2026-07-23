// Aprobación de un supervisor para acciones sensibles del cajero.
//
// El supervisor introduce sus credenciales de Supabase Auth; se validan en el
// servidor sin cerrar ni alterar la sesión del cajero que está en caja.

import { useState, type FormEvent } from 'react'
import { useVerificarSupervisor } from './useVentas'
import Modal from '../../shared/components/Modal'

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
        <Modal
            titulo="Se requiere aprobación de supervisor"
            onClose={onCancel}
            maxWidth={450}
            cerrarAlClickFuera={false}
        >
            <p>Un administrador debe ingresar sus credenciales para continuar.</p>
            <form onSubmit={handleAprobar}>
                <div className="form-vertical" style={{ marginTop: '20px' }}>
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
                    {error && <p className="texto-error">{error}</p>}
                </div>
                <div className="footer" style={{ marginTop: '20px' }}>
                    <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={verificar.isPending}>
                        Cancelar
                    </button>
                    <button type="submit" className="btn btn--primary" disabled={verificar.isPending}>
                        {verificar.isPending ? 'Verificando...' : 'Aprobar'}
                    </button>
                </div>
            </form>
        </Modal>
    )
}
