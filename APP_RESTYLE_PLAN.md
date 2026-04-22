# Plan de Restyle Visual — Software Alega (NO landing)

**Destinatario:** Agente IA con capacidad de editar código (Claude Code, Cursor, Aider).
**Alcance:** Alinear el software existente (`apps/web`) con la identidad visual del handoff de diseño `../alega/project/`. **No** implementar la landing.
**Proyecto base:** `friendly-succotash/apps/web` (Vue 3 + PrimeVue 4 + Tailwind + Pinia + vue-router).
**Prohibición explícita:** NO usar fuente monoespaciada (`JetBrains Mono`, `font-mono`, `--font-mono`). El usuario la considera visualmente disonante.

---

## 0. Principios rectores

1. **Marca primero, Tailwind después.** Todos los colores deben venir de tokens CSS (`var(--accent)`, `var(--fg-default)`, etc.) o de la escala `brand.*` de Tailwind. Prohibidos los hex sueltos fuera de `#2D3FBF`/familia oficial.
2. **Un solo stack tipográfico.** Solo `Inter` para toda la app. En cualquier lugar donde aparezca `font-mono`, `font-family: 'JetBrains Mono'`, `--font-mono` o una clase `.mono`: reemplazar por `Inter` con `font-variant-numeric: tabular-nums` cuando sea necesario que los números alineen (tablas, cifras, KPIs).
3. **Densidad consistente.** `--density-pad-y` solo aplica a la landing; en el software mantener el padding existente de PrimeVue.
4. **Dark mode obligatorio.** Cada cambio debe verse correcto en `html.dark` y en modo claro. El preset `AlegaPreset` ya cubre PrimeVue; los componentes custom deben usar variables semánticas.
5. **No romper permisos ni routing.** El restyle es puramente visual. Guards, permisos (`requiresPermission`), stores Pinia y llamadas API quedan intactos.
6. **Accesibilidad.** Contraste ≥ 4.5:1 para texto normal, ≥ 3:1 para texto grande. Foco visible en todos los elementos interactivos (`:focus-visible`).

---

## 1. Inventario de referencias del handoff

Archivos a consultar antes de empezar (en orden de importancia para el software):

| Archivo handoff | Qué aporta |
|---|---|
| `../alega/project/assets/brand.css` | Tokens de marca canónicos (paleta, sombras, radios, gradientes). |
| `../alega/project/Alega App.html` | Punto de entrada del prototipo de la app. |
| `../alega/project/src/app-shell.jsx` | Sidebar, topbar, dropdown de usuario, iconos SVG. |
| `../alega/project/src/app-views.jsx` | Vistas: Inicio, Expedientes, Notificaciones, Clientes, Calendario, Cola de revisiones, Plantillas, Papelera. |
| `../alega/project/src/app-editor.jsx` | Editor de documentos + panel asistente. |
| `../alega/project/src/app-settings.jsx` | General, Cuenta, Calendario, SINOE, Usuarios, Roles, Plantillas de flujo. |
| `../alega/project/src/dash-mock.jsx` | Dashboard de Inicio (saludo, KPIs, tareas, actividades). |
| `../alega/project/src/app-data.jsx` | Datos mock que ayudan a inferir estructura y copys. |
| `../alega/chats/chat1.md` | Decisiones del usuario (lee al menos los últimos 3 turnos). |

Archivos del proyecto a intervenir:

| Archivo | Rol |
|---|---|
| `apps/web/src/assets/main.css` | Tokens semánticos ya existentes — aquí se consolidan los ajustes. |
| `apps/web/tailwind.config.js` | Extensión Tailwind ya alineada; se elimina `fontFamily.mono` si existe. |
| `apps/web/src/theme/alegaPreset.ts` | Preset PrimeVue — solo ajustes menores. |
| `apps/web/src/layouts/AppLayout.vue` | Shell principal (sidebar + topbar). |
| `apps/web/src/components/common/AppLogo.vue` | Marca + wordmark. |
| `apps/web/src/components/common/StatusBadge.vue` | Badges de estado. |
| `apps/web/src/views/HomeView.vue` | Equivalente a Inicio del mock. |
| `apps/web/src/views/dashboard/DashboardView.vue` | Vista de dashboard. |
| `apps/web/src/views/trackables/*` | Listado + flow (equivalente a Expedientes). |
| `apps/web/src/views/clients/*` | Clientes. |
| `apps/web/src/views/notifications/*` | Notificaciones. |
| `apps/web/src/views/calendar/*` | Calendario global. |
| `apps/web/src/views/reviews/*` | Cola de revisiones. |
| `apps/web/src/views/templates/*` | Plantillas (docs y flujo). |
| `apps/web/src/views/documents/*` | Editor de documentos + folder browser. |
| `apps/web/src/views/settings/*` | Ajustes (varias secciones). |
| `apps/web/src/views/admin/RolesView.vue` | Roles. |
| `apps/web/src/components/assistant/*` | Panel del asistente virtual. |

---

## 2. Orden de ejecución (13 fases, 1 PR por fase)

### Fase 1 — Auditoría inicial

Objetivo: inventariar desviaciones.

Tareas:

1. `grep -rn "font-mono\|JetBrains\|font-family.*mono\|--font-mono\|\.mono\b" apps/web/src` → lista de archivos que usan mono.
2. `grep -rn "#[0-9a-fA-F]\{3,6\}" apps/web/src/views apps/web/src/components` → lista de hex sueltos.
3. `grep -rn "text-gray-\|bg-gray-\|border-gray-" apps/web/src` → usos de `gray-*` de Tailwind que deberían migrar a `fg-*`/`surface-*`.
4. `grep -rn "text-blue-\|bg-blue-" apps/web/src` → usos de `blue-*` que deberían ser `brand-zafiro`/`accent`.
5. Genera `apps/web/RESTYLE_AUDIT.md` (archivo temporal, no commitear al final) con hallazgos y prioridades.

Criterio de aceptación: lista exhaustiva de desviaciones, agrupadas por archivo.

---

### Fase 2 — Eliminar fuente monoespaciada

Objetivo: purgar cualquier referencia a `mono` en la UI.

Tareas:

1. En `apps/web/tailwind.config.js`:
   - Si existe `fontFamily.mono`, **eliminarla**.
   - Dejar solo `fontFamily.sans`.
2. En `apps/web/src/assets/main.css`:
   - Eliminar cualquier `@font-face` o `@import` de `JetBrains Mono`.
   - Si existe una clase `.mono` o `.font-mono` custom, eliminarla.
3. En cada archivo hallado en Fase 1, reemplazar:
   - `class="font-mono"` → eliminar la clase. Si el contexto es una cifra o tabla, añadir `style="font-variant-numeric: tabular-nums"` o clase utilitaria `tabular-nums` (Tailwind la trae nativa).
   - `font-family: 'JetBrains Mono', ...` → eliminar la declaración (el body ya usa Inter).
   - Etiqueta `<code>` o `<pre>` mantenida solo para fragmentos literales (p. ej. IDs de integración). Forzar `font-family: inherit` en esos casos para heredar Inter.
4. En `apps/web/package.json`, si existe `@fontsource/jetbrains-mono` y nadie más lo usa, **desinstalar**:
   ```bash
   pnpm --filter @tracker/web remove @fontsource/jetbrains-mono
   ```
5. En `main.ts`, eliminar `import '@fontsource/jetbrains-mono/...'` si existe.

Archivos confirmados con uso de `font-mono` según auditoría del 2026-04-18 (verificar):
- `apps/web/src/components/assistant/AssistantQuickActionBar.vue`
- `apps/web/src/views/templates/WorkflowTemplateEditView.vue`
- `apps/web/src/views/admin/RolesView.vue`
- `apps/web/src/views/settings/SettingsWorkflowRulesView.vue`
- `apps/web/src/views/settings/SettingsCalendarView.vue`

Criterio de aceptación: `grep -rn "font-mono\|JetBrains" apps/web/src` devuelve 0 resultados. App renderiza sin regresiones visuales (números de tablas siguen alineados gracias a `tabular-nums`).

---

### Fase 3 — Consolidar tokens en `main.css`

Objetivo: cerrar huecos entre `brand.css` del handoff y `main.css` del proyecto.

Tareas:

1. Añadir en `main.css` los tokens que el handoff define y el proyecto no (si faltan):
   ```css
   :root {
     --accent-600: #2636a8;
     --accent-400: #5467d4;
     --brand-hielo-soft: #E4E7FA;
     --brand-papel-soft: #F8F9FD;
     --radius-sm: 8px;
     --radius: 12px;
     --radius-lg: 18px;
     --radius-xl: 24px;
     --shadow-brand: 0 18px 40px -12px rgba(45, 63, 191, 0.35);
   }
   ```
2. Reemplazar en `main.css` la escala de sombras si difiere del handoff. El handoff usa:
   ```css
   --shadow-sm: 0 1px 2px rgba(13,15,43,0.04), 0 1px 3px rgba(13,15,43,0.03);
   --shadow-md: 0 4px 14px rgba(13,15,43,0.06), 0 2px 4px rgba(13,15,43,0.04);
   --shadow-lg: 0 24px 60px rgba(13,15,43,0.12), 0 8px 20px rgba(13,15,43,0.06);
   ```
   El proyecto ya tiene valores equivalentes. Mantener los del proyecto salvo que visualmente se note aspereza al comparar con el mock.
3. En `html.dark`, verificar que las variables `--brand-hielo-soft`, `--brand-papel-soft` y `--shadow-brand` tengan versiones oscuras coherentes.
4. **NO añadir** `--font-mono`.

Criterio de aceptación: diff mínimo en `main.css`, solo variables nuevas, sin duplicados ni remociones no deseadas.

---

### Fase 4 — Tipografía global

Objetivo: homogeneizar escala tipográfica con el handoff.

Tareas:

1. En `main.css` dentro de `@layer base`:
   ```css
   body {
     font-feature-settings: 'ss01', 'cv11';
     line-height: 1.5;
   }
   h1 { font-size: clamp(28px, 2.2vw, 34px); font-weight: 700; letter-spacing: -0.02em; line-height: 1.1; }
   h2 { font-size: clamp(22px, 1.6vw, 26px); font-weight: 700; letter-spacing: -0.015em; line-height: 1.2; }
   h3 { font-size: 18px; font-weight: 600; letter-spacing: -0.01em; }
   h4 { font-size: 15px; font-weight: 600; }
   p, li, td, th { font-size: 14px; }
   small { font-size: 12px; color: var(--fg-muted); }
   ```
   Estas son escalas para el **software**, no la landing (que usa tipos mucho más grandes).
2. Clase utilitaria nueva en `@layer components`:
   ```css
   .eyebrow {
     display: inline-flex; align-items: center; gap: 6px;
     font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
     text-transform: uppercase; color: var(--accent);
     background: var(--accent-soft); padding: 4px 10px; border-radius: 999px;
     border: 1px solid var(--surface-border);
   }
   ```
3. Eliminar cualquier `font-size` en componentes que no respete esta escala (revisar tras Fase 5-12).

Criterio de aceptación: títulos de todas las vistas visualmente consistentes, sin mono, sin hex sueltos.

---

### Fase 5 — `AppLogo.vue`

Objetivo: unificar marca con el handoff.

Tareas:

1. Abrir `apps/web/src/components/common/AppLogo.vue`.
2. Reemplazar el SVG del marker si difiere del handoff (`../alega/project/src/atoms.jsx` función `LogoMark`).
3. Wordmark: `font-weight: 600` (del handoff usa 600, no 700), `letter-spacing: -0.01em`, tamaño por prop `size` (default 18px para sidebar, 24px para auth).
4. Color del SVG: `currentColor` para heredar de contenedor (claro → Medianoche, oscuro → Papel).

Criterio de aceptación: logo idéntico en sidebar y páginas de auth, cambio de tema correcto.

---

### Fase 6 — `AppLayout.vue` (shell)

Objetivo: alinear sidebar + topbar con el prototipo del handoff.

Tareas:

1. **Sidebar:**
   - Ancho expandido: 240px. Ancho colapsado: 64px. Transición 200ms.
   - Fondo: `var(--layout-sidebar-bg)` (ya presente). En claro: blanco. En oscuro: gradiente Medianoche → Abismo (ya presente).
   - Items usar clase `.nav-item` (ya definida). Icono SVG a la izquierda (18px), label, badge opcional a la derecha.
   - Badge estilo chip: `background: var(--accent); color: white; font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 999px`.
   - Indicador activo: barra vertical 3px a la izquierda (`.nav-item.is-active::before` ya existe).
2. **Botón colapsar:** esquina superior derecha del sidebar, icono chevron, botón plano (`background: transparent; border: 0`), hover añade `background: var(--surface-sunken)`.
3. **User chip al pie del sidebar:**
   - Avatar circular 28px con iniciales (`background: var(--accent-soft); color: var(--accent); font-weight: 700`).
   - Nombre + email truncados.
   - Dropdown al hacer clic: Configuración, Tema (con switch), Cerrar sesión.
   - El dropdown usa PrimeVue `OverlayPanel` o `Menu`, con `var(--surface-raised)` y `box-shadow: var(--shadow-lg)`.
4. **Topbar (si existe):**
   - Altura 56px, borde inferior `1px solid var(--surface-border)`.
   - Izquierda: breadcrumbs o título de vista, tipografía `h4`.
   - Derecha: búsqueda global (PrimeVue `IconField` + `InputIcon` con icono lupa), notificaciones (ícono `bell` con contador), avatar.
5. **Main content:**
   - Fondo `var(--surface-app)`.
   - Padding 24px en desktop, 16px en mobile.
   - `max-width: 1440px; margin: 0 auto` opcional para vistas centradas.

Criterio de aceptación: shell coherente con `app-shell.jsx`. Transición fluida al colapsar. Dark mode correcto.

---

### Fase 7 — Vista Inicio (HomeView / Dashboard)

Objetivo: replicar sección de bienvenida del handoff.

Referencia: `../alega/project/src/dash-mock.jsx`.

Tareas:

1. **Saludo:**
   - Fila superior: `h1` con "Buenos días, {{ user.name }}" + subtítulo con resumen del día.
   - Lado derecho: botón primario "Nueva tarea" o similar (usar `<Button severity="primary">` de PrimeVue).
2. **Grid de 4 KPIs:**
   - Cada KPI en card con:
     - Icono circular pequeño (36px) en `var(--accent-soft)` con icono `var(--accent)`.
     - Cifra grande (28px, `font-weight: 700`, `tabular-nums`).
     - Descripción corta (`var(--fg-muted)`, 13px).
     - Delta opcional en chip verde/rojo.
   - Grid `grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4`.
3. **"Tareas con prioridad":**
   - Card blanca (`.app-card`).
   - Título "Tareas con prioridad" + link "Ver todas" alineado derecha.
   - Lista de 5-8 items con:
     - Checkbox a la izquierda.
     - Título + subtítulo (caso/cliente).
     - Chip de prioridad a la derecha (urgent=rojo, high=naranja, normal=azul, low=gris).
     - Fecha límite en `var(--fg-muted)`, formato "en 2 días" (usa `date-fns` si ya está).
4. **"Actividades recientes":**
   - Card blanca.
   - Timeline vertical: avatar + texto "{{ user }} {{ acción }} {{ objeto }}" + timestamp relativo.
   - 5-8 items.
5. Usar `tabular-nums` en cualquier número.

Criterio de aceptación: vista Inicio reconocible respecto al mock, sin mono, todos los colores por tokens.

---

### Fase 8 — Expedientes (trackables)

Referencia: `app-views.jsx` sección Expedientes.

Tareas:

1. **Header de vista:**
   - `h2` "Expedientes" + contador total.
   - Botón primario "Nuevo expediente".
   - Barra de filtros: buscador (`IconField` con lupa), dropdowns (materia, estado, responsable), botón reset.
2. **Tabla principal** (`DataTable` de PrimeVue):
   - Columnas: Nº (monospace NO, usar `tabular-nums`), Cliente, Materia, Estado (StatusBadge), Responsable (avatar + nombre), Última actividad, Próximo plazo.
   - Fila hover: fondo `var(--accent-soft)` muy sutil (10% opacity).
   - Fila activa/seleccionada: borde izquierdo 3px `var(--accent)`.
   - Paginación PrimeVue con estilos heredados del preset.
3. **StatusBadge**: asegurar que `StatusBadge.vue` use los colores:
   - En curso → `brand.zafiro` bg soft + texto zafiro.
   - Pendiente → amber-100 bg + amber-700 texto.
   - Finalizado → emerald-100 bg + emerald-700 texto.
   - Cancelado → gris.
   - Urgente → rose-100 bg + rose-700 texto.
4. **Vista flow (`TrackableFlowView`):** ya usa `vue-flow`. Ajustar solo nodos custom para usar `.app-card` y `var(--accent)` en aristas activas.

Criterio de aceptación: listado y flow coherentes con dashboard. Sin mono en nºs.

---

### Fase 9 — Notificaciones, Clientes, Calendario, Revisiones, Plantillas

Referencia: `app-views.jsx` secciones correspondientes.

**Notificaciones:**
1. Filtros arriba: "Solo no leídas" (toggle), "Marcar todas como leídas" (botón link).
2. Lista con:
   - Ícono del tipo de notificación a la izquierda (bell, doc, user, calendar).
   - Título + mensaje truncado.
   - Timestamp relativo.
   - Dot `var(--accent)` 8px si no leída.
   - Fondo `var(--surface-raised)` si no leída, `var(--surface-sunken)` si leída.
3. Click → navega al objeto relacionado.

**Clientes:**
1. Listado DataTable con avatar, nombre, tipo (persona/empresa), expedientes activos, teléfono.
2. Botón "Nuevo cliente".
3. Drawer lateral para detalle (PrimeVue `Drawer`).

**Calendario global (`GlobalCalendarView`):**
1. Ya usa FullCalendar. Mantener.
2. Ajustes: header `h2` "Calendario" + toggles vista (mes/semana/día), filtros (materia, responsable).
3. Mini calendario lateral opcional como en el mock.

**Cola de revisiones:**
1. DataTable con: documento, enviado por, fecha, prioridad, estado revisión.
2. Acciones inline: aprobar (check verde), devolver con comentarios, asignar a otro revisor.

**Plantillas (docs):**
1. Grid de cards 3×n.
2. Cada card: nombre, materia, veces usada, botón "Usar" primario + menu kebab (editar, duplicar, archivar).
3. Botón "Nueva plantilla" arriba derecha.

Criterio de aceptación: cada vista replica el layout del mock en estructura y jerarquía visual.

---

### Fase 10 — Editor de documentos

Referencia: `../alega/project/src/app-editor.jsx`.

Tareas:

1. **Topbar del editor:**
   - Back arrow + título editable del documento + pill "Draft" (verde soft) / "Enviado a revisión" (zafiro).
   - Tabs: Editar / Sugerir / Ver.
   - Derecha: "Historial", "Enviar a revisión" (botón gradiente `.bg-brand-gradient`).
2. **Toolbar de edición** (bajo topbar):
   - Fuente, tamaño, B/I/U/S, color, alineación, listas, indent, imagen, tabla, enlace.
   - Fondo `var(--surface-raised)`, borde inferior `1px solid var(--surface-border)`, padding 8px.
   - Iconos 16px en `var(--fg-muted)`, activos en `var(--accent)`.
3. **Canvas:**
   - Fondo gris claro (`var(--surface-sunken)`).
   - Página blanca centrada, sombra `var(--shadow-lg)`, ancho A4 (794px).
   - Contenido editable (`superdoc` o contenteditable).
4. **Panel lateral derecho "Asistente Alega":**
   - Ancho 340px, colapsable.
   - Tabs: Chat / Editar documento.
   - 6 acciones rápidas como chips: Mejorar redacción, Corregir ortografía, Resumir, Agregar conclusión, Revisar coherencia, Analizar riesgos.
   - Burbujas de chat (usuario a derecha en `var(--accent)`, asistente a izquierda en `var(--surface-sunken)`).
   - Input multilinea con Ctrl+Enter para enviar; botón circular de enviar con gradiente.
   - NO monospace en ningún lugar.
5. **Panel de historial** (modal o drawer):
   - Lista de versiones con autor + timestamp + botón "Restaurar" + "Comparar".

Criterio de aceptación: editor idéntico al mock. Sin fuente mono en el canvas ni toolbar.

---

### Fase 11 — Configuración

Referencia: `../alega/project/src/app-settings.jsx`.

Secciones (rutas ya existentes):
- General → `SettingsGeneralView`
- Cuenta → `SettingsAccountView`
- Calendario → `SettingsCalendarView`
- SINOE → `SettingsSinoeView`
- Privacidad → `SettingsComingSoonView`
- Facturación → `SettingsComingSoonView`
- Créditos → `SettingsComingSoonView`
- Plan → `SettingsComingSoonView`
- Usuarios → `UsersListView`
- Roles → `admin/RolesView`
- Plantillas de flujo → `templates/WorkflowTemplatesView`
- Reglas de flujo → `SettingsWorkflowRulesView`

Tareas comunes:
1. **`SettingsLayout.vue`:** sidebar secundaria izquierda con 10 items agrupados (Organización, Integraciones, Gestión, Facturación). Item activo con `.nav-item.is-active`.
2. **Cada vista:** título `h2` + subtítulo `muted`, luego secciones en cards (`.app-card`) con título y contenido.
3. **Formularios:** labels arriba del input (14px, `font-weight: 500`), input PrimeVue con ancho completo, descripción opcional debajo (`var(--fg-muted)`, 12px), botón "Guardar" al final de cada card.
4. **`SettingsComingSoonView`:** ilustración SVG minimalista + texto "Próximamente" + subtexto descriptivo. Fondo `.brand-gradient-soft` sutil.
5. **Usuarios:** DataTable con avatar, nombre, email, rol (dropdown inline), último acceso, menú kebab (editar, desactivar).
6. **Roles:** lista de roles + matriz de permisos. Checkbox `PrimeVue` con color zafiro. Eliminar cualquier `font-mono` en IDs de permiso.
7. **Plantillas de flujo:** grid de cards por plantilla. Edición en `WorkflowTemplateEditView` (ya existe, limpiar mono).

Criterio de aceptación: Config navegable, coherente, sin mono, botones primarios en zafiro.

---

### Fase 12 — Componentes del Asistente

Referencia: `../alega/project/src/app-shell.jsx` FAB + panel del asistente.

Tareas:

1. **FAB (floating action button):**
   - Esquina inferior derecha, 56px, gradiente `.bg-brand-gradient`, sombra `var(--shadow-lg)`, icono sparkle blanco.
   - Hover: `transform: scale(1.05)`.
2. **Panel del asistente:**
   - Drawer derecho 420px o modal lateral.
   - Header: título "Alega asistente" + contexto actual (nombre de la vista) + botón cerrar.
   - Banner superior en `var(--brand-hielo-soft)` (claro) / gradiente sutil (oscuro) con eyebrow y frase hook.
   - Chips de "acciones rápidas" debajo (6 chips).
   - Historial de chat con burbujas.
   - Input multilinea al pie con tag "trackable-flow" como chip pequeño a la izquierda del input.
3. **`AssistantQuickActionBar.vue`:** eliminar `font-mono`, usar chips con `Inter` y `tabular-nums` si hay teclas atajo.

Criterio de aceptación: FAB visible en todas las vistas autenticadas, abre panel funcional, estilo coherente.

---

### Fase 13 — QA visual y regresión

Tareas:

1. **Checklist por vista** (hacer screenshot + comparar mentalmente con el mock):
   - [ ] Login / Register / Magic link
   - [ ] Onboarding wizard
   - [ ] Inicio
   - [ ] Expedientes (lista + flow + detalle)
   - [ ] Notificaciones
   - [ ] Clientes
   - [ ] Calendario global
   - [ ] Cola de revisiones
   - [ ] Plantillas (docs)
   - [ ] Editor de documentos
   - [ ] Panel asistente (desde FAB)
   - [ ] Configuración / General
   - [ ] Configuración / Cuenta
   - [ ] Configuración / Calendario
   - [ ] Configuración / SINOE
   - [ ] Configuración / Usuarios
   - [ ] Configuración / Roles
   - [ ] Configuración / Plantillas de flujo
   - [ ] Configuración / Reglas de flujo
   - [ ] Papelera (redirección trackables?scope=trash)
2. **Ambos temas**: probar cada vista en claro y en oscuro.
3. **Breakpoints**: 360px (mobile), 768px (tablet), 1280px (desktop), 1920px (wide).
4. **Grep final de anti-patrones:**
   ```bash
   grep -rn "font-mono\|JetBrains\|--font-mono\|font-family.*mono" apps/web/src
   # debe devolver 0
   grep -rn "#[0-9a-fA-F]\{6\}" apps/web/src/views apps/web/src/components | grep -v "^.*\.svg:"
   # revisar cada hit, reemplazar por tokens si aplica
   ```
5. **Lighthouse** en la ruta `/` autenticada (o vista Inicio):
   - Performance ≥ 85
   - Accessibility ≥ 95
   - Best Practices ≥ 90
6. **Tests**:
   - `pnpm --filter @tracker/web lint` → sin errores nuevos.
   - `pnpm --filter @tracker/web test` → verde.
   - `pnpm --filter @tracker/web test:e2e` → verde.

Criterio de aceptación: cada item del checklist marcado. Sin regresiones funcionales.

---

## 3. Mapeo Token → Uso en el software

Guía rápida para saber qué token aplicar en cada contexto. Si dudas, usa esta tabla antes de inventar:

| Situación | Token / clase |
|---|---|
| Fondo principal de la app | `var(--surface-app)` |
| Fondo de panel elevado (card, modal) | `var(--surface-raised)` o `.app-card` |
| Fondo hundido (sidebar interno, zona secundaria) | `var(--surface-sunken)` |
| Borde sutil | `var(--surface-border)` |
| Borde marcado | `var(--surface-border-strong)` |
| Texto principal | `var(--fg-default)` |
| Texto secundario | `var(--fg-muted)` |
| Texto placeholder / auxiliar | `var(--fg-subtle)` |
| Texto sobre botón primario / gradiente | `var(--fg-on-brand)` |
| Acento (CTAs, links, activos) | `var(--accent)` |
| Acento hover | `var(--accent-hover)` |
| Acento de fondo suave | `var(--accent-soft)` |
| Foco (ring) | `var(--accent-ring)` |
| Gradiente oficial (hero de sección / CTA) | `.bg-brand-gradient` |
| Gradiente atmosférico (onboarding, auth) | `.brand-gradient-soft` |
| Texto con gradiente | `.text-brand-gradient` |
| Radios: botón/input | `0.5rem` (8px) |
| Radios: card | `1rem` (16px) |
| Radios: modal / sheet | `1.25rem` (20px) |
| Sombras: elementos planos | `var(--shadow-sm)` |
| Sombras: cards | `var(--shadow-md)` |
| Sombras: overlays / FAB | `var(--shadow-lg)` |
| Tipografía: siempre | `Inter` (body hereda) |
| Números alineados (tablas, KPIs) | clase `tabular-nums` |

---

## 4. Patrones prohibidos

Antipatrones que deben provocar rechazo del PR:

- `font-family: 'JetBrains Mono'`, `font-mono`, `class="font-mono"`, `.mono { ... }`, importación de `@fontsource/jetbrains-mono`.
- Hex sueltos (`#2d3fbf`, `#fff`, etc.) dentro de archivos `.vue` o `.ts` de `apps/web/src/views` y `apps/web/src/components`. Excepciones: `StatusBadge.vue` si colores semánticos (success/warn/danger) no están como tokens, y assets SVG estáticos.
- `text-blue-*`, `bg-blue-*` cuando el contexto es "acento de marca" (usar `accent`/`brand-zafiro`).
- Clases inline de Tailwind mezcladas con `style="..."` para el mismo aspecto (elegir una).
- Estilos hardcoded `width: 240px` para la sidebar que ignoren el modo colapsado.
- Modificar `alegaPreset.ts` sin justificación (el preset ya está afinado).
- Añadir paquetes npm adicionales (shadcn, headless-ui, otros sistemas de componentes) — usar PrimeVue 4 exclusivamente.

---

## 5. Checklist maestro antes de merge final

- [ ] Fase 1 auditoría completa y archivada (no subida).
- [ ] Fase 2: `grep "font-mono\|JetBrains"` devuelve 0.
- [ ] Fase 3: tokens añadidos a `main.css` sin duplicados.
- [ ] Fase 4: tipografía homogénea, sin declaraciones `font-size` aisladas contradictorias.
- [ ] Fase 5: `AppLogo` idéntico al handoff.
- [ ] Fase 6: `AppLayout` con sidebar/topbar/user dropdown alineados.
- [ ] Fase 7: Inicio con saludo, KPIs, tareas, actividades.
- [ ] Fase 8: Expedientes listado + flow pulidos.
- [ ] Fase 9: Notificaciones, Clientes, Calendario, Revisiones, Plantillas coherentes.
- [ ] Fase 10: Editor con toolbar y panel asistente.
- [ ] Fase 11: Configuración completa y consistente.
- [ ] Fase 12: FAB + panel asistente visibles y funcionales.
- [ ] Fase 13: QA visual en claro/oscuro, todos los breakpoints, Lighthouse, lint, tests.
- [ ] Commits atómicos con mensajes Conventional (`style(web): restyle sidebar`, `refactor(web): remove mono font`, etc.).
- [ ] `CHANGELOG.md` o PR description resumiendo el restyle completo.

---

## 6. Qué preguntar al usuario si surge duda

- **Prioridad de vistas:** ¿qué vista debe verse primero pulida? (default: Inicio → Expedientes → Editor → Config).
- **Ancho máximo de contenido:** ¿1440px centrado o full width hasta 1920px?
- **Densidad:** el handoff menciona compact/normal/spacious. ¿El software debe exponer un selector o fijar "normal"?
- **Emoji/ilustraciones:** si alguna vista `ComingSoonView` queda vacía, ¿usar ilustración SVG custom o placeholder minimalista?
- **FAB siempre visible:** ¿o sólo en vistas que lo necesiten (editor, expedientes)?
- **Editor:** ¿mantener `superdoc` ya integrado o cambiar a otro motor? (default: mantener).

Si no hay respuesta en 2 iteraciones, decidir según default y dejar nota en el PR.

---

## 7. Entregables finales

1. Código actualizado en `apps/web/src/**` en 13 PRs (o 1 PR grande dividido en commits lógicos).
2. `main.css` consolidado.
3. Sin regresiones en tests existentes.
4. Screenshots comparativos (antes/después) de al menos 6 vistas clave, adjuntos al PR final.
5. Este archivo `APP_RESTYLE_PLAN.md` **no se commitea al main** o se mueve a `docs/` si el usuario quiere conservarlo.

---

**Fin.**
