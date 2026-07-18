// src/context/pos-context.js
//
// Objeto de contexto y hook de acceso. Van en un módulo aparte del provider
// para no romper Fast Refresh (un archivo de componentes solo exporta componentes).

import { createContext, useContext } from 'react';

export const PosContext = createContext(null);

export function usePos() {
    const contexto = useContext(PosContext);
    if (!contexto) {
        throw new Error('usePos debe usarse dentro de <PosProvider>');
    }
    return contexto;
}
