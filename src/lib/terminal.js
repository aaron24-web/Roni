// Identidad de la terminal (computadora) donde corre el POS.
//
// Cada equipo genera un identificador propio la primera vez y lo guarda en
// su localStorage. Con él, la caja y los tickets son independientes por
// computadora: cada terminal abre y cuadra su propia caja, y sus tickets
// aparcados no se mezclan con los de la otra.

const CLAVE_ID = 'roni.terminal.id';
const CLAVE_NOMBRE = 'roni.terminal.nombre';

function generarId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Respaldo para contextos sin crypto.randomUUID (http no seguro)
    return `term-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getTerminalId() {
    let id = localStorage.getItem(CLAVE_ID);
    if (!id) {
        id = generarId();
        localStorage.setItem(CLAVE_ID, id);
    }
    return id;
}

export function getTerminalNombre() {
    return localStorage.getItem(CLAVE_NOMBRE) || 'Esta terminal';
}

export function setTerminalNombre(nombre) {
    localStorage.setItem(CLAVE_NOMBRE, nombre);
}
