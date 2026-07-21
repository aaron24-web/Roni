# Estado del proyecto · Papelería Roni (POS)

> Documento de traspaso para continuar el trabajo. Léelo completo antes de
> empezar. Última actualización: **2026-07-18**.

## Qué es esto

Punto de venta (POS) para Papelería Roni. Empezó como proyecto escolar y se
está convirtiendo en una **aplicación web profesional para uso real** (dos
computadoras en la tienda).

- **Frontend:** React 19 + Vite 7 + TypeScript (`strict`) + React Router 7 +
  React Query (TanStack).
- **Backend:** Supabase (PostgreSQL). La lógica de negocio vive en funciones
  RPC de Postgres (patrón a conservar).
- **Repo:** `github.com/aaron24-web/Roni.git` (público, rama `main`).

## Reglas de trabajo (ver `CLAUDE.md`)

1. **Responder antes de actuar:** si el usuario hace una pregunta, se responde
   primero; no se ejecutan herramientas hasta contestar.
2. **Plan antes de ejecutar:** presentar el plan (qué, dónde, por qué), pedir
   autorización y esperar el visto bueno antes de hacer cambios.
3. **Autorización para commits/push:** nunca commitear ni hacer push por
   iniciativa propia; pedir permiso explícito siempre.

Convenciones observadas: código y comentarios **en español**; mensajes de
commit en español terminando con la línea `Co-Authored-By`.

---

## Roadmap y progreso

### ✅ Fase 1 — Fundaciones y seguridad (COMPLETA)

- [x] Credenciales fuera del repo, en `.env.local` (`VITE_SUPABASE_*`).
- [x] Supabase Auth real (JWT/sesiones); contraseñas con bcrypt.
- [x] RLS activo en las 21 tablas; solo `authenticated` accede. Escritura de
      catálogo (departamentos, proveedores, promociones) restringida a
      Administrador por políticas RLS.
- [x] Funciones críticas `SECURITY DEFINER` con validación de rol
      (`exigir_admin`, `mi_rol`).
- [x] Inyección en la búsqueda de productos corregida (`sanitizeSearchTerm`).
- [x] Backdoor de login con contraseñas en texto plano eliminado.

### ✅ Fase 2 — Arquitectura y base de código (COMPLETA)

- [x] TypeScript `strict` en todo el proyecto (0 archivos `.js/.jsx`).
- [x] Tipos generados desde la BD (`src/shared/types/database.ts`).
- [x] React Router con rutas reales y guards por rol (`RequireAdmin`).
- [x] Estado global con Context (`useAuth`, `usePos`) — sin props drilling.
      Se decidió **no** usar Zustand: Context basta.
- [x] Capa de datos con React Query (un hook `useX` por feature).
- [x] Estructura de carpetas por features.

### ⏳ Fase 3 — UX/UI profesional (SIGUIENTE)

- [ ] Sistema de diseño (Tailwind o similar), reemplazar `alert()`/`confirm()`
      por toasts/modales.
- [ ] Layout responsivo, atajos de teclado, impresión de tickets.
- [ ] Estados de carga/error consistentes, accesibilidad.

### ⏳ Fase 4 — Producción (PENDIENTE)

- [ ] Tests (Vitest + Testing Library), CI/CD, error tracking (Sentry).
- [ ] Deploy (Vercel/Netlify), dominios, backups automáticos.

---

## Arquitectura actual

```
src/
  main.tsx                 monta QueryClientProvider + AuthProvider + App
  App.tsx                  BrowserRouter + PosProvider + rutas
  features/
    auth/        LoginPage
    ventas/      VentasPage · CantidadModal · SupervisorApprovalModal
                 useVentas.ts · promociones.ts (cálculo puro)
    productos/   ProductosPage · AddStockModal · useProductos
    clientes/    ClientesPage · EstadoCuentaModal · useClientes
    empleados/   EmpleadosPage · useEmpleados
    caja/        CajaPage · useCaja
    reportes/    ReportesPage · DetalleCorteModal · DetalleVentaModal · useReportes
    departamentos/ · proveedores/ · promociones/   (CRUD simples)
  shared/
    components/  Layout.tsx (header + nav por rol + pestañas de ticket)
    context/     auth-context + AuthProvider · pos-context + PosProvider
    lib/         supabase.ts · roles.ts · terminal.ts · searchTerm.ts · queryClient.ts
    routes/      RequireAdmin.tsx
    styles/      pos.css
    types/       database.ts (generado) · domain.ts (atajos a mano)
```

**Patrón por feature:** cada pantalla (`XPage.tsx`) consume hooks de datos
(`useX.ts`). Los hooks son los únicos que hablan con Supabase; hacen queries y
mutaciones con React Query e invalidan la caché tras cada cambio. Al añadir una
feature nueva, seguir este mismo molde (ver `departamentos/` como el más simple).

**Roles:** `useAuth()` da `perfil`, `esAdmin`, `session`, `cerrarSesion`. La UI
oculta lo que no aplica, pero **la autorización real está en el servidor**
(políticas RLS + `exigir_admin` en las funciones). Nunca confiar solo en el
front.

**Tickets y caja por terminal:** cada computadora tiene un `terminal_id` en su
`localStorage` (`shared/lib/terminal.ts`). La caja y los tickets (ventas en
curso) son independientes por terminal y **se persisten en la BD** (tabla
`tickets`, carrito en `jsonb`), sobreviviendo a recargas o cortes de luz.
`PosProvider` guarda el carrito con *debounce* de 800 ms.

---

## Base de datos

- **Migraciones versionadas:** `supabase/migrations/001..010_*.sql`. Son "el
  esquema como código". Se aplican con `psql` (o el CLI de Supabase). La última
  es `010_verificar_supervisor_auth.sql`.
- **NO** hay volcados de datos en el repo; `Backups/` está ignorado por git y
  los respaldos viven fuera del repositorio.
- **Regenerar tipos** tras cambiar el esquema: `npm run types:db` (requiere la
  variable `SUPABASE_DB_URL` y **Docker corriendo** — el CLI de Supabase lo
  usa). Genera `src/shared/types/database.ts`.

**Funciones clave (RPC):** `iniciar` login vía Supabase Auth (no RPC);
`get_mi_perfil`, `mi_rol`, `exigir_admin`; `crear_empleado_con_auth`;
`registrar_venta_completa`, `abrir_caja`/`cerrar_caja`, `obtener_resumen_corte`;
`crear_producto_con_promo`/`actualizar_producto_con_promo`,
`registrar_entrada_stock`; `verificar_supervisor_auth` (aprobación de
supervisor contra `auth.users`).

---

## Cómo correr el proyecto

```bash
cd Roni
npm install
cp .env.example .env.local     # rellenar con URL y anon key de Supabase
npm run dev                    # http://localhost:5173
```

Scripts: `npm run dev` · `npm run build` (incluye `tsc --noEmit`) ·
`npm run typecheck` · `npm run lint` · `npm run types:db`.

Estado esperado: **typecheck, build y lint en verde, sin avisos.** Mantenerlo así.

> Credenciales operativas (URL/clave de Supabase, cadena de conexión a la BD,
> usuarios de prueba admin/cajero) **no van en el repo**: están en `.env.local`
> (ignorado) y en la memoria privada del asistente. Pídelas al usuario si las
> necesitas.

---

## Pendientes técnicos concretos (además de las fases)

1. **Atomicidad al cobrar** (documentado en `README.md`): al confirmar una venta
   ocurren dos operaciones separadas —`registrar_venta_completa` y luego marcar
   el ticket como `COBRADO`—. Si se interrumpe entre ambas, la venta queda
   registrada pero el ticket abierto (ticket fantasma). Arreglo propuesto: pasar
   el `ticket_id` a `registrar_venta_completa` y que la función marque el ticket
   dentro de su transacción.

2. **`alert()` / `confirm()` / `prompt()`** siguen usándose en varias pantallas
   (ventas, caja, todas las gestiones). Es lo primero de la Fase 3: sustituir por
   toasts/modales.

3. **Estilos:** hoy todo es CSS inline + un único `shared/styles/pos.css`
   reutilizado en todas las pantallas. La Fase 3 debería introducir un sistema de
   diseño coherente.

4. **Despliegue:** el enrutado de cliente exige *rewrite* a `index.html`
   (ejemplos en `README.md`). Tenerlo en cuenta al hacer deploy.

5. **Detalle menor:** un commit anterior (`1f05726`) quedó sin la línea
   `Co-Authored-By`; no se enmendó para no reescribir historia por un metadato.

---

## Antes de empezar la Fase 3

Recomendación al usuario cada vez que se termina una fase grande: **probar en el
navegador** los flujos principales (login con ambos roles, abrir caja, vender con
recarga de por medio, aprobación de supervisor como cajero, CRUDs). La Fase 2
reescribió todas las pantallas, así que conviene validar antes de apilar más.
