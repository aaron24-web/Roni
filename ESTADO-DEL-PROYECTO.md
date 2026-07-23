# Estado del proyecto · Papelería Roni (POS)

> Documento de traspaso para continuar el trabajo. Léelo completo antes de
> empezar. Última actualización: **2026-07-23**.

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

### ✅ Fase 3 — UX/UI profesional (COMPLETA salvo pulido responsivo)

- [x] **Sistema de diseño por tokens** (variables CSS en `shared/styles/ui.css`):
      colores semánticos, espaciado, radios, sombras y clases `.btn`. Se decidió
      **no** usar Tailwind: tokens sobre el CSS existente, sin dependencias.
- [x] **Toasts y diálogos propios** que reemplazan los 42 `alert()`/`confirm()`/
      `prompt()` nativos. `useToast()`, `useConfirm()` y `usePrompt()`.
- [x] **Identidad "Tinta & Papel" propagada a toda la app**: sidebar con iconos,
      topbar por sección, login split-screen, tablas tipo tarjeta, componente
      `Modal` único en las 12 pantallas (0 modales a mano), botones `.btn`
      (el verde queda reservado para Cobrar). Errores del backend traducidos
      a español claro (`shared/lib/errores.ts`).
- [x] **Atajos de teclado** en el punto de venta: F10 buscar producto, F9
      cobrar, F7 nuevo ticket (con pista visual en el pie).
- [x] **Accesibilidad**: trampa y restauración de foco en modales,
      `aria-labelledby`, Escape con pila (modales anidados cierran de a uno),
      ARIA en tabs de tickets/botones de icono/métodos de pago, foco visible,
      `prefers-reduced-motion`, `lang="es"`.
- [x] **Impresión de tickets** (`shared/lib/impresora.ts`): térmicas ESC/POS
      por **Web Serial** (Chrome/Edge) con corte de papel, pulso al cajón de
      dinero en efectivo y **re-enlace automático al conectarla**; fallback de
      impresión por el navegador (verificable con "Guardar como PDF"). Panel
      de configuración en Caja + "imprimir al cobrar" por terminal.
      ⚠️ Pendiente validar con una impresora física.
- [x] **Guardarraíl contra perder lo escrito** (2026-07-23): con
      `confirmarDescarte`, cerrar un formulario a medias pide confirmación por
      las tres salidas (Cancelar, Escape y clic fuera). Los cambios se detectan
      por eventos de edición, no comparando valores; `data-editable` marca lo
      que cuenta sin ser un campo y `data-sin-confirmar` excluye buscadores.
      Botón compartido `<BotonCancelarModal>`.
- [x] **Bug del foco corregido** (2026-07-23): el efecto de `Modal` dependía de
      `onClose`, que las pantallas pasan inline, así que cada tecla lo
      remontaba y el foco saltaba al primer campo. **No volver a meter `onClose`
      en las dependencias.**
- [ ] Pulido responsivo fino (la sidebar ya colapsa en pantallas angostas;
      faltan tablas en móvil).

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
    auth/        LoginPage (split-screen con panel de marca)
    ventas/      VentasPage (atajos F10/F9/F7, impresión al cobrar) ·
                 CantidadModal · SupervisorApprovalModal ·
                 useVentas.ts · promociones.ts (cálculo puro, espejo del servidor)
    productos/   ProductosPage (catálogo + filtros por depto/tipo/stock/promo) ·
                 AddStockModal · useProductos
    clientes/    ClientesPage · EstadoCuentaModal · useClientes
    empleados/   EmpleadosPage · useEmpleados
    caja/        CajaPage · PanelImpresora (config de térmica) · useCaja
    reportes/    ReportesPage · DetalleCorteModal · DetalleVentaModal · useReportes
    departamentos/ (con promo por depto) · proveedores/ · promociones/ (4 tipos,
                 badges de vigencia, asignación de productos en bloque)
  shared/
    components/  Layout.tsx (sidebar con iconos + topbar + tabs de tickets) ·
                 Modal.tsx (accesible: foco, Escape por pila) · icons.tsx
                 feedback/  ToastProvider (useToast) ·
                            DialogProvider (useConfirm/usePrompt)
    context/     auth-context + AuthProvider · pos-context + PosProvider
    lib/         supabase.ts · roles.ts · terminal.ts · searchTerm.ts ·
                 queryClient.ts · errores.ts (traducirError) ·
                 impresora.ts (Web Serial ESC/POS + fallback navegador)
    routes/      RequireAdmin.tsx
    styles/      ui.css (tokens + primitivos) · layout.css (shell/login) · pos.css
    types/       database.ts (generado; parcheado a mano tras migraciones 011-014,
                 regenerar con types:db cuando haya Docker) · domain.ts
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

- **Migraciones versionadas:** `supabase/migrations/001..015_*.sql`. Son "el
  esquema como código". Se aplican con `psql` (o el CLI de Supabase). Las
  últimas: `011` promos N×M · `012` venta íntegra en servidor · `013` tipos de
  promo avanzados y promo por departamento · `014` asignación de productos a
  promo en bloque (las cuatro aplicadas el 2026-07-21) · `015` los servicios
  no controlan existencias (aplicada el 2026-07-23). **Todas aplicadas.**
- **Conexión a la base:** `SUPABASE_DB_URL` en `.env.local` (ignorado por git).
  Aplicar una migración:
  `set -a && . ./.env.local && set +a && psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/XXX.sql`

**Sistema de promociones (reescrito 2026-07-21):** 4 tipos — PORCENTAJE,
CANTIDAD_X_CANTIDAD (N×M real: 3x1, 3x2...), PRECIO_ESPECIAL ($ fijo) y
MAYOREO (N+ piezas a $X). Promos asignables por producto o por departamento
(la del producto gana). `registrar_venta_completa` **recalcula todo en el
servidor** (ignora importes del cliente), audita promo+descuento por renglón
en `detalleventa`, registra el CARGO de ventas a Crédito Tienda con límite, y
cierra el ticket en la misma transacción. El cálculo del carrito en el front
(`features/ventas/promociones.ts`) es un espejo visual del servidor.
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

1. ~~**Atomicidad al cobrar**~~ **HECHO (2026-07-21, migración 012):**
   `registrar_venta_completa` recibe el `ticket_id` y marca el ticket como
   `COBRADO` dentro de su transacción. Ya no hay tickets fantasma. (La sección
   correspondiente del `README.md` quedó desactualizada; ver pendiente 6.)

2. ~~**`alert()` / `confirm()` / `prompt()`**~~ **HECHO (2026-07-21):** los 42
   diálogos nativos se sustituyeron por toasts (`useToast`) y modales
   (`useConfirm`/`usePrompt`) en las 12 pantallas. No quedan llamadas nativas.

3. ~~**Estilos**~~ **HECHO (2026-07-22):** los tokens/`.btn`/`Modal` están
   adoptados en las 12 pantallas; no quedan modales a mano ni colores
   hardcodeados relevantes (los únicos hex restantes son el arte SVG del login).

4. **Despliegue:** el enrutado de cliente exige *rewrite* a `index.html`
   (ejemplos en `README.md`). Tenerlo en cuenta al hacer deploy.

4.b **El tipo de producto `KIT` es decorativo — decisión tomada, falta
   ejecutarla.** La cadena `'KIT'` aparece solo como etiqueta del desplegable
   en `features/productos/useProductos.ts`: no hay tabla de componentes ni
   lógica, así que un paquete se vende como un producto normal y **no descuenta
   sus componentes**. De los cuatro tipos, solo `GRANEL` tiene comportamiento
   real. El usuario eligió el modelo de **paquete virtual**: el paquete no se
   arma físicamente y al cobrarlo se descuentan los componentes. Pendiente:
   tabla `kit_componentes`, explosión en `registrar_venta_completa`, arreglo de
   `cancelar_venta_completa` (hoy devolvería el stock al paquete, que no tiene
   fila en `inventario`, sin dar error) y el editor de contenido en Productos.

5. **Detalle menor:** un commit anterior (`1f05726`) quedó sin la línea
   `Co-Authored-By`; no se enmendó para no reescribir historia por un metadato.

6. **`README.md` desactualizado:** su sección "Estructura" todavía describe la
   organización previa a la Fase 2 (`src/components/`, `supabaseClient.js`,
   `src/lib/terminal.js`). Este documento sí está al día; el README no. Pendiente
   alinearlo.

7. ~~**Script `types:db` apuntaba a la ruta equivocada**~~ **HECHO (2026-07-21):**
   escribía en `src/types/database.ts` (carpeta inexistente) en vez de
   `src/shared/types/database.ts`, el archivo que importa el código. Corregido en
   `package.json`.

---

## Cómo continuar (guía para la siguiente sesión)

### 1) Validar en el navegador lo más reciente (aún sin probar a fondo)

La sesión del 2026-07-21/22 hizo cambios grandes que compilan en verde pero
requieren validación funcional:

- **Promociones completas:** crear una de cada tipo (%, N×M p. ej. 3x1, precio
  especial, mayoreo), asignar una **por departamento** (Departamentos → campo
  "Promoción del departamento") y otra en bloque (Promociones → "Asignar
  productos"). Vender con cada una: el total de caja debe coincidir con lo
  registrado (el servidor recalcula todo).
- **Crédito Tienda:** venta a crédito con un cliente que sí tenga crédito → el
  **CARGO** debe aparecer en su Estado de cuenta (antes ese cargo nunca se
  registraba). Verificar que rechaza si excede el límite.
- **Atajos y accesibilidad:** F10/F9/F7 en Ventas; Tab dentro de modales,
  Escape en modales anidados (Reportes) cierra de a uno.
- **Ticket:** Caja → "Imprimir prueba (navegador)" → *Guardar como PDF* para
  ver el formato. Activar "Imprimir ticket al cobrar" y hacer una venta.
- **2026-07-21:** el usuario ya validó toasts/diálogos, el fix de modales al
  cambiar de pestaña, y el 3x1 básico. Lo demás sigue pendiente de su ✓.

### 2) Qué falta corregir / pulir

- **Impresora física:** el ESC/POS (`shared/lib/impresora.ts`) sigue el
  estándar Epson pero **no se ha probado con hardware**. Con la térmica en
  mano, quizá haya que ajustar `BAUDIOS` o la página de códigos (`ESC t`).
- **Responsivo fino:** la sidebar ya colapsa, pero las tablas no se adaptan
  bien a pantallas angostas.
- **README.md desactualizado** (pendiente 6): estructura pre-Fase 2 y sección
  de atomicidad ya resuelta por la migración 012.
- **Regenerar tipos** con `npm run types:db` (Docker) — hoy `database.ts` está
  parcheado a mano tras las migraciones 011–014; regenerarlo debe dar lo mismo.
- F10 puede chocar con el menú del navegador en Firefox (Chrome/Edge bien).

### 3) Roadmap — siguiente gran bloque: Fase 4 (Producción)

Orden sugerido:

1. **Tests (Vitest):** empezar por las funciones puras, que son fáciles de
   cubrir y las más críticas: `features/ventas/promociones.ts` (cálculo de los
   4 tipos), `shared/lib/errores.ts` (traducción), `shared/lib/impresora.ts`
   (`formatearTicket`). Después Testing Library para flujos (login, venta).
2. **CI:** GitHub Actions que corra `typecheck + lint + build + test` en cada
   push a `main`.
3. **Deploy:** Vercel o Netlify con el *rewrite* a `index.html` (ejemplos en
   `README.md`); variables `VITE_SUPABASE_*` como secretos del entorno.
4. **Observabilidad y respaldo:** Sentry para errores en producción; activar
   respaldos automáticos de Supabase.

> **Nota de commits (importante):** hay ~48 archivos sin commitear — TODO el
> trabajo del 2026-07-21/22 (toasts/diálogos, traducción de errores, rediseño
> completo, fix de modales, promociones N×M+avanzadas, venta íntegra en
> servidor, atajos, accesibilidad e impresora). El último commit local es
> `a96a645`. Lo primero de la siguiente sesión debería ser proponer al usuario
> commits por bloque temático (recordar: nunca commitear sin su autorización
> explícita). Las migraciones 011–014 ya están APLICADAS en la BD aunque el
> repo no esté commiteado.
