import type { Perfil } from '../types/domain'

// Helpers de rol. La autorización real vive en el servidor (funciones con
// exigir_admin y políticas RLS); esto solo ajusta la interfaz.
export const esAdministrador = (perfil: Perfil | null | undefined): boolean =>
    perfil?.nombre_rol?.toLowerCase() === 'administrador'
