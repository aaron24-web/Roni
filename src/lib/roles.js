// Helpers de rol. La autorización real vive en el servidor (funciones con
// exigir_admin y políticas RLS); esto solo ajusta la interfaz.

export const esAdministrador = (perfil) =>
    perfil?.nombre_rol?.toLowerCase() === 'administrador';
