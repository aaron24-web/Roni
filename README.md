# Papelería Roni · Punto de Venta

Aplicación web de punto de venta (POS) para Papelería Roni. Construida con **React 19 + Vite** y **Supabase** (PostgreSQL) como backend.

## Funcionalidades

- Ventas con múltiples tickets simultáneos, productos a granel y promociones.
- Gestión de productos, departamentos, proveedores, clientes y empleados.
- Control de inventario y movimientos de stock.
- Cortes de caja (apertura/cierre de turno) y reportes.
- Crédito a clientes y estados de cuenta.
- Roles: Administrador y Cajero, con aprobación de supervisor para acciones sensibles.

## Requisitos

- Node.js 20+ y npm.
- Un proyecto de Supabase con el esquema de la base de datos restaurado.

## Configuración

1. Instala las dependencias:

   ```bash
   npm install
   ```

2. Copia el archivo de ejemplo de variables de entorno y rellénalo con las
   credenciales de tu proyecto Supabase (Project Settings → API):

   ```bash
   cp .env.example .env.local
   ```

   ```
   VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key-publica
   ```

3. Arranca el servidor de desarrollo:

   ```bash
   npm run dev
   ```

## Scripts

| Comando           | Descripción                              |
| ----------------- | ---------------------------------------- |
| `npm run dev`     | Servidor de desarrollo (Vite).           |
| `npm run build`   | Compila la app para producción.          |
| `npm run preview` | Previsualiza el build de producción.     |
| `npm run lint`    | Analiza el código con ESLint.            |

## Estructura

```
src/
  components/   Componentes de la interfaz (pantallas y modales)
  lib/          Utilidades compartidas
  supabaseClient.js   Cliente de Supabase (lee credenciales de .env.local)
Backups/        Respaldos de la base de datos (no versionar los dumps con datos)
```

## Notas de seguridad

Las credenciales viven en `.env.local` (ignorado por git). Nunca subas
`.env.local` ni respaldos de base de datos con datos reales al repositorio.
