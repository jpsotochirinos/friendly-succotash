---
name: alega-datatable
description: >
  Patrones de listado lawyer-grade en Alega (Vue 3, PrimeVue 4, Tailwind). TRES variantes
  documentadas: (A) Tabla funcional con CRUD por fila y paginator (clientes, usuarios, roles,
  partes maestras), (B) Cockpit Priority Inbox **agrupado** para expedientes (prototipo sandbox;
  status stripe, deadline pill, progreso), **(D) Lista virtualizada de portafolio** para
  `/trackables` en producción (cursor + chips de urgencia + scroll infinito). (C) Tabla
  informativa read-only para historial / audit log / reportes (sin acciones por fila).
  Usar la tabla "¿qué patrón uso?" para elegir.
---

# Alega — Listados lawyer-grade

**Sandboxes en vivo:** `pnpm --filter @tracker/web dev` → `/sandbox`

| Variante | Sandbox / código | Para |
|----------|------------------|------|
| **A — Tabla funcional (CRUD)** | `/sandbox/recipes/data-table-functional` | Clientes · Usuarios · Roles · Partes · Plantillas · Feed sources |
| **B — Cockpit agrupado (legacy UX)** | `/sandbox/recipes/trackables-cockpit` | Prototipo **agrupado** por buckets de plazo; no es el default de producción |
| **D — Portafolio virtualizado** | `TrackablesListView.vue` (producción) | **Expedientes en `/trackables`**: KPI en chips, facets backend, `GET /api/trackables/list`, virtual scroll |
| **C — Tabla informativa (read-only)** | `/sandbox/recipes/data-table-informational` | Activity log · Historial · Audit trail · Reportes |

**Referencia viva en producción (expedientes):**
- [apps/web/src/views/trackables/TrackablesListView.vue](../../../apps/web/src/views/trackables/TrackablesListView.vue) — patrón **D**: lista densa, infinite scroll, `UrgencyKpiChipsBar`, preferencias `alega:expedientes:prefs:v1`.

Cargar **siempre** junto con [alega-ui-context](../alega-ui-context/SKILL.md) y [alega-ui-coherence](../alega-ui-coherence/SKILL.md).

---

## ¿Qué patrón uso para cada entidad?

| Entidad | Patrón | Razón |
|---------|--------|-------|
| **Expedientes / Trackables (lista principal)** | **D (Portafolio virtualizado)** | Escala 1k–10k+ filas; urgencia en columnas denormalizadas + chips |
| **Expedientes — vista agrupada futura** | **B (Cockpit)** | Cuando se habilite tab **Agrupado** (sandbox mantiene el prototipo) |
| **Audiencias / Eventos calendario** | **B (Cockpit)** | Por fecha (hoy / mañana / esta semana) |
| **Documentos pendientes de revisión** | **B (Cockpit)** | Por urgencia de revisión |
| **WorkflowItems con due date** | **B (Cockpit)** | Por urgencia |
| **"Mis tareas"** | **B (Cockpit)** | Inbox del día |
| **Clientes** | **A (Funcional)** | Catálogo CRUD, sin urgencia temporal |
| **Usuarios del despacho** | **A (Funcional)** | CRUD + estados (activo/invitado/desactivado) → scope tabs |
| **Roles** | **A (Funcional)** | Catálogo CRUD puro |
| **Partes maestras** | **A (Funcional)** | Catálogo CRUD |
| **Plantillas / Blueprints** | **A (Funcional)** | Catálogo CRUD |
| **Feed sources** | **A (Funcional)** | CRUD + estados |
| **Activity log / Historial** | **C (Informativa)** | Read-only cronológico |
| **Audit trail** | **C (Informativa)** | Read-only |
| **Reportes** | **C (Informativa)** | Read-only |

**Regla de oro:** si el usuario va a *interactuar* con cada fila (editar/archivar/eliminar) → A o B. Si solo va a *leer* → C.

---

# Variante A — Tabla funcional (CRUD)

## Cuándo aplicarla

- Cualquier listado con CRUD por fila: clientes, usuarios, roles, plantillas, partes maestras, feed sources.
- El usuario filtra/ordena por columnas y ejecuta acciones (editar / archivar / eliminar).
- Sin dimensión temporal de urgencia.

## Anatomía canónica

```
┌─────────────────────────────────────────────────────────────────┐
│ [PageHeader · Botón Nuevo X]                                    │
├─────────────────────────────────────────────────────────────────┤
│ [Scope tabs: Activos · Archivados]  (opcional)                  │
├─────────────────────────────────────────────────────────────────┤
│ ╔═══════════════════════════════════════════════════════════╗   │
│ ║ 🔍 buscar... [Tipo▼] [Asignado▼] [👤A mí] [Limpiar]  N res║   │
│ ║───────────────────────────────────────────────────────────║   │
│ ║ ENTIDAD     │ TIPO  │ ESTADO  │ ASIGNADO  │ ACCIONES      ║   │
│ ║ avatar+name │ chip  │ Tag     │ avatar+rt │ ✏️ 📦 🗑️       ║   │
│ ║───────────────────────────────────────────────────────────║   │
│ ║ « < 1 > »  10 ▼   1–7 de 7 entidades                      ║   │
│ ╚═══════════════════════════════════════════════════════════╝   │
└─────────────────────────────────────────────────────────────────┘
```

## Reglas inviolables (variante A)

1. **Sin padding root** (`AppLayout` aplica). Vista raíz: `class="flex flex-col gap-6"`.
2. **PageHeader** con `title` + `subtitle` obligatorio en i18n. CTA "Nuevo X" en `#actions` (solo visible en scope `active`).
3. **Tabla envuelta** en `.app-card.flex.flex-col.overflow-hidden.table-card` con `max-height: calc(100vh - 240px)` para scroll interno.
4. **Toolbar** con: `IconField` búsqueda (flex-1) + Dropdowns de filtro (Tipo, Asignado, etc.) + Pill "A mí" + Botón "Limpiar" (solo si `hasActiveFilters`) + contador de resultados.
5. **Scope tabs** (`SelectButton`) entre PageHeader y card cuando aplique (ej. activos/archivados).
6. **Skeleton** al `loading.value` (no solo first-load). `min-h-[360px]` para evitar layout jumps.
7. **`<DataTable size="small" row-hover>`** sin scroll propio (lo gestiona el card).
8. **Header de columnas** uppercase 11px, `tracking-wide`, `bg-[var(--surface-sunken)]`. Aplicar con CSS `:deep(.functional-table .p-datatable-thead > tr > th)`.
9. **Paginator** fuera del `<DataTable>`, en footer del card con `border-top` y `bg-[var(--surface-raised)]`. Visible **siempre que haya registros** (no solo cuando `total > pageSize`).
10. **Empty state contextual** con icono + mensaje + acción "Limpiar filtros" si hay filtros activos.
11. **Acciones de fila**: `Button` outlined + rounded + size small + severity por acción (gap 0.5rem). Ver § "Acciones de fila".
12. **Sin `font-mono`, `font-bold` ni `text-gray-*`**: usar `--fg-default`/`--fg-muted`/`--fg-subtle`, `tabular-nums` para números, `font-mono-num` para documentos legales.
13. **i18n** para todos los strings (encabezados, vacíos, tooltips, paginación, botones).

## Toolbar canónico (componentes)

```vue
<div class="flex items-center gap-2 px-4 py-3 flex-wrap"
  style="border-bottom: 1px solid var(--surface-border); background: var(--surface-raised);">

  <!-- Búsqueda -->
  <IconField class="flex-1 min-w-[200px]">
    <InputIcon class="pi pi-search" style="color: var(--fg-subtle);" />
    <InputText v-model="searchQuery" :placeholder="t('clients.searchPlaceholder')" size="small" class="w-full" />
  </IconField>

  <!-- Dropdowns de filtro -->
  <Dropdown v-model="typeFilter" :options="typeFilterOptions"
    option-label="label" option-value="value" placeholder="Tipo"
    show-clear size="small" class="toolbar-dropdown" />

  <Dropdown v-model="assigneeFilter" :options="assigneeFilterOptions"
    option-label="label" option-value="value" placeholder="Asignado"
    show-clear size="small" class="toolbar-dropdown" />

  <!-- Pill "A mí" -->
  <button type="button" class="cockpit-pill" :class="{ 'cockpit-pill--active': onlyMine }"
    @click="onlyMine = !onlyMine">
    <i class="pi pi-user text-[10px]" /> A mí
  </button>

  <!-- Limpiar (solo si hay filtros) -->
  <Button v-if="hasActiveFilters" :label="t('common.clearFilters')"
    icon="pi pi-filter-slash" variant="text" severity="secondary" size="small"
    @click="clearFilters" />

  <!-- Contador -->
  <span class="text-xs tabular-nums" style="color: var(--fg-subtle); white-space: nowrap;">
    {{ totalRecords }} {{ t('clients.recordsLabel', totalRecords) }}
  </span>
</div>
```

CSS para dropdowns:

```css
:deep(.toolbar-dropdown.p-select),
:deep(.toolbar-dropdown.p-dropdown) {
  min-width: 160px;
  max-width: 200px;
}
```

CSS para la pill "A mí":

```css
.cockpit-pill {
  display: inline-flex; align-items: center; gap: 0.35rem;
  padding: 0.35rem 0.75rem; border-radius: 9999px;
  border: 1px solid var(--surface-border);
  background: var(--surface-raised); color: var(--fg-muted);
  font-size: 0.75rem; font-weight: 600; cursor: pointer;
  transition: all 0.15s ease; white-space: nowrap;
}
.cockpit-pill:hover { border-color: var(--accent); color: var(--accent); }
.cockpit-pill--active {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
}
```

## State para filtros + clear

```ts
const searchQuery = ref('');
const typeFilter = ref<string | null>(null);
const assigneeFilter = ref<string | null>(null);
const onlyMine = ref(false);
const currentUserId = 'u1'; // del authStore en producción

const hasActiveFilters = computed(
  () =>
    !!searchQuery.value.trim() ||
    typeFilter.value !== null ||
    assigneeFilter.value !== null ||
    onlyMine.value,
);

function clearFilters() {
  searchQuery.value = '';
  typeFilter.value = null;
  assigneeFilter.value = null;
  onlyMine.value = false;
}
```

## DataTable props base (CRÍTICO: scroll interno + paginator pinned)

**Regla inviolable:** la tabla debe escrolear por DENTRO del card, no debe empujar el paginator fuera de pantalla. Esto requiere TRES cosas juntas:

1. **Card** con `flex flex-col overflow-hidden` y `max-height` — establece la altura total.
2. **DataTable** con `scrollable` + `scroll-height="flex"` + clase `flex-1 min-h-0` — el body de la tabla escrolea internamente.
3. **Paginator** afuera del DataTable, en footer del card — siempre visible.

```vue
<DataTable
  :value="paginatedRows"
  data-key="id"
  size="small"
  scrollable
  scroll-height="flex"
  row-hover
  responsive-layout="scroll"
  class="flex-1 min-h-0 functional-table"
  :table-props="{ 'aria-label': t('clients.tableLabel') }"
>
  <template #empty>
    <div class="flex flex-col items-center gap-3 py-16" style="color: var(--fg-subtle);">
      <i class="pi pi-users text-4xl opacity-40" />
      <p class="m-0 text-sm">
        {{ hasActiveFilters ? t('common.noResults') : t('clients.empty') }}
      </p>
      <Button v-if="hasActiveFilters" :label="t('common.clearFilters')" ... @click="clearFilters" />
    </div>
  </template>
  <!-- columnas -->
</DataTable>
```

**Por qué `scrollable` + `scroll-height="flex"` + `min-h-0`:**
- Sin `scrollable`, PrimeVue DataTable crece tan alto como sus filas → el card hace overflow → paginator queda oculto.
- `scroll-height="flex"` le dice a PrimeVue que use el espacio disponible del padre flex.
- `min-h-0` rompe la regla por defecto de flex que evita que un hijo encogiera por debajo de su contenido.
- Faltando uno de los tres → la tabla NO escrolea por dentro y el paginator se va fuera.

**Misma regla para el `<Skeleton>`:** usar `flex-1 min-h-0 overflow-auto` para que el skeleton también respete la altura del card.

## Columnas canónicas

| Columna | Contenido | Width |
|---------|-----------|-------|
| **Entidad** (primera, key) | Avatar (35px) iniciales o color por id + nombre `font-semibold` + sub-info (documento + email) `text-xs text-subtle` | `min-width: 260px` |
| **Tipo** (`cockpit-chip`) | Pill custom (no `<Tag>` PrimeVue) con severity color | `width: 120px` |
| **Estado** (`<Tag>`) | PrimeVue `<Tag>` con `severity` mapeado | `width: 130px` |
| **Asignado / Actividad** | Avatar 1.5px dot + nombre, debajo `relative time` (hace 2h, hace 3d) y conteos | `width: 160px` |
| **Acciones** | `Button` outlined+rounded+severity (ver abajo) | `width: 160px`, `text-align: center` |

### Header de columnas (densidad uniforme)

```css
:deep(.functional-table .p-datatable-thead > tr > th) {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--fg-muted);
  background: var(--surface-sunken);
}
```

## Sistema de chips unificado (Tag-equivalent custom)

Usa este sistema cuando necesites un pill/badge inline al lado de un `<Tag>` PrimeVue, para que **alineen visualmente** (mismo height, mismo padding, mismo font-size). El `<Tag>` PrimeVue por sí solo tiene padding inconsistente.

```css
.cockpit-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  height: 1.25rem;
  padding: 0 0.5rem;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  line-height: 1;
  white-space: nowrap;
}

/* Variantes por severity */
.cockpit-chip--info     { background: color-mix(in srgb, #2563eb 14%, var(--surface-raised)); color: #1d4ed8; }
.cockpit-chip--warn     { background: color-mix(in srgb, #d97706 14%, var(--surface-raised)); color: #b45309; }
.cockpit-chip--success  { background: color-mix(in srgb, #10b981 14%, var(--surface-raised)); color: #047857; }
.cockpit-chip--secondary{ background: var(--surface-sunken); color: var(--fg-muted); }
.cockpit-chip--urgent   { background: color-mix(in srgb, #f43f5e 14%, var(--surface-raised)); color: #be123c; }

/* Dark variants */
html.dark .cockpit-chip--info    { background: color-mix(in srgb, #2563eb 28%, transparent); color: #93c5fd; }
html.dark .cockpit-chip--warn    { background: color-mix(in srgb, #d97706 28%, transparent); color: #fbbf24; }
html.dark .cockpit-chip--success { background: color-mix(in srgb, #10b981 28%, transparent); color: #6ee7b7; }
html.dark .cockpit-chip--urgent  { background: color-mix(in srgb, #f43f5e 28%, transparent); color: #fda4af; }
```

## Acciones de fila (inviolable)

Usar **PrimeVue `Button`** outlined + rounded + severity por acción. Nunca botones nativos en cápsula.

```vue
<div class="row-actions" role="group" :aria-label="t('common.actions')">
  <Button icon="pi pi-pencil" variant="outlined" rounded size="small" severity="secondary"
    aria-label="Editar" v-tooltip.top="'Editar'" @click="openEdit(data)" />
  <Button v-if="scope === 'active'" icon="pi pi-inbox" variant="outlined" rounded size="small" severity="warn"
    aria-label="Archivar" v-tooltip.top="'Archivar'" @click="requestArchive(data)" />
  <Button v-if="scope === 'archived'" icon="pi pi-replay" variant="outlined" rounded size="small" severity="success"
    aria-label="Reactivar" v-tooltip.top="'Reactivar'" @click="requestReactivate(data)" />
  <Button icon="pi pi-trash" variant="outlined" rounded size="small" severity="danger"
    :aria-label="scope === 'active' ? 'Mover a archivados' : 'Eliminar permanentemente'"
    v-tooltip.top="scope === 'active' ? 'Archivar' : 'Eliminar permanentemente'"
    @click="requestDelete(data)" />
</div>
```

CSS:

```css
:deep(.row-actions) {
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  gap: 0.5rem !important;
}
:deep(.row-actions .p-button) {
  width: 2.25rem !important;
  height: 2.25rem !important;
  padding: 0 !important;
}
:deep(.row-actions .p-button-icon) { font-size: 0.875rem; }
```

| Acción | severity | icono |
|--------|----------|-------|
| Editar | `secondary` | `pi-pencil` |
| Archivar | `warn` | `pi-inbox` |
| Reactivar | `success` | `pi-replay` |
| Eliminar | `danger` | `pi-trash` |

> **No duplicar header de columna acciones**. Si se usa `<Column header="Acciones">`, **no** agregar `<template #header>` adicional — pinta la misma palabra dos veces.

## Paginator

```vue
<div v-if="!loading && totalRecords > 0"
  style="border-top: 1px solid var(--surface-border); background: var(--surface-raised);">
  <Paginator
    :rows="pageSize"
    :total-records="totalRecords"
    :rows-per-page-options="[5, 10, 25]"
    :first="(currentPage - 1) * pageSize"
    current-page-report-template="{first}–{last} de {totalRecords} clientes"
    template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
    @page="onPageChange"
  />
</div>
```

> **Visible siempre con registros**, incluso si `total ≤ pageSize`. Da contexto ("Mostrando 1–7 de 7").

## Skeleton

Reservar altura (`min-h-[360px]`) y dibujar 5 columnas con grid CSS estática:

```vue
<div v-if="loading" class="flex-1 min-h-[360px] overflow-x-auto">
  <div class="min-w-[760px]">
    <div class="grid gap-4 px-4 py-3"
      style="grid-template-columns: minmax(260px,2fr) 120px 130px 160px 140px;">
      <Skeleton v-for="col in 5" :key="col" height="0.75rem" />
    </div>
    <div v-for="row in 8" :key="row"
      class="grid items-center gap-4 px-4 py-4"
      style="grid-template-columns: minmax(260px,2fr) 120px 130px 160px 140px;">
      <div class="flex items-center gap-3">
        <Skeleton shape="circle" size="2.25rem" />
        <div class="flex-1 flex flex-col gap-2">
          <Skeleton height="0.9rem" width="80%" />
          <Skeleton height="0.7rem" width="55%" />
        </div>
      </div>
      <Skeleton height="1.2rem" width="4.5rem" border-radius="999px" />
      <Skeleton height="1.2rem" width="5rem" border-radius="999px" />
      <Skeleton height="0.8rem" width="65%" />
      <div class="flex justify-center gap-2">
        <Skeleton shape="circle" size="2rem" />
        <Skeleton shape="circle" size="2rem" />
        <Skeleton shape="circle" size="2rem" />
      </div>
    </div>
  </div>
</div>
```

## Dialog form unificado (create + edit)

Reutiliza el mismo `<Dialog>` para crear y editar (`formMode: 'create' | 'edit'`). Patrón completo en [alega-form-dialog](../alega-form-dialog/SKILL.md).

Reglas adicionales para tabla funcional:
- `formMode === 'create'`: botón siempre habilitado si campos requeridos completos.
- `formMode === 'edit'`: botón **solo habilitado** si `formIsDirty && canSubmit`.
- Snapshot del form al abrir; comparar con `JSON.stringify` para `isDirty`.
- En cierre: si `isDirty`, pedir confirmación con `window.confirm` o `ConfirmDialogBase`.

## Validación al terminar (variante A)

1. `pnpm --filter @tracker/web exec vue-tsc --noEmit` limpio.
2. Greps de antipatrones (alega-ui-coherence): `font-mono` (excepto `font-mono-num`), `font-bold` en títulos, `text-gray-*`, `p-6` en root.
3. Probar claro + dark.
4. Probar todos los filtros + "Limpiar".
5. Probar empty states (sin datos, sin resultados con filtros).
6. Probar dirty guard en edit.
7. `prefers-reduced-motion`.

## Anti-patrones (variante A)

- ❌ `<Column header="Acciones">` + `<template #header>` adicional → header duplicado.
- ❌ Paginator dentro del `<DataTable>`.
- ❌ Paginator solo cuando `total > pageSize` → cuando hay 1 página el usuario pierde el contexto numérico.
- ❌ Dropdown sin `show-clear` cuando es opcional.
- ❌ Olvidar el botón "Limpiar filtros" → frustra al usuario que aplicó 3 filtros y no encuentra cómo resetear.
- ❌ "A mí" como Dropdown más → es un toggle binario, debe ser pill.
- ❌ Empty state genérico ("No data") → siempre contextual.
- ❌ Avatar como `<img>` sin fallback → siempre iniciales con color por id.

---

# Variante B — Cockpit (expedientes)

## Cuándo aplicarla

**SOLO** cuando hay urgencia temporal real. Ver tabla "¿qué patrón uso?" arriba.

- ✅ Expedientes (canónico).
- ✅ Audiencias programadas.
- ✅ Documentos pendientes de revisión con SLA.
- ✅ "Mis tareas" del día.
- ❌ Clientes / Usuarios / Roles / Feed sources (catálogos sin urgencia) → variante A.

## Anatomía canónica

```
┌──────────────────────────────────────────────────────────────────┐
│ [PageHeader · Densidad: Cómodo/Compacto · Nuevo expediente]      │
├──────────────────────────────────────────────────────────────────┤
│ [Scope tabs: Activos · Archivados · Papelera]                    │
├──────────────────────────────────────────────────────────────────┤
│ ╔══════════════════════════════════════════════════════════════╗ │
│ ║ 🔍 buscar... [Asignado▼] [👤A mí] [Limpiar]    7 expedientes ║ │
│ ║──────────────────────────────────────────────────────────────║ │
│ ║ ● Todos · ● Caso · ● Proceso · ● Proyecto · ● Auditoría     ║ │
│ ║──────────────────────────────────────────────────────────────║ │
│ ║ ⚠ VENCIDOS (2) · Plazo cumplido. Acción inmediata.       ▼   ║ │
│ ║ ┃ ⚖️  EXP-2024 · CASO · 🔥 Urgente                            ║ │
│ ║ ┃    Divorcio Quispe — Régimen de visitas                    ║ │
│ ║ ┃    [Venció hace 2 días] 📄8 📅4 💬5  [───●─────] 20% · Cliente  [CR] [✏️] [🗑️] ║ │
│ ║                                                              ║ │
│ ║ 🕒 ESTA SEMANA (3) · Vencen en los próximos 7 días.    ▼     ║ │
│ ║ ...                                                          ║ │
│ ╚══════════════════════════════════════════════════════════════╝ │
└──────────────────────────────────────────────────────────────────┘
```

## Reglas inviolables (variante B)

1. **Card con altura constreñida** — `max-height: calc(100vh - 280px)`, `min-height: 400px`. Scroll vertical interno en la lista de filas, **no** en la página completa.
2. **Agrupar por urgencia, no por tipo/estado**. El abogado piensa en plazos, no en categorías.
3. **4 grupos canónicos** con metadata fija:
   | Grupo | Accent | Icono | Cuándo | Descripción |
   |-------|--------|-------|--------|-------------|
   | `overdue` | `#dc2626` rojo | `pi-exclamation-circle` | days < 0 | "Plazo cumplido. Requiere acción inmediata." |
   | `thisWeek` | `#d97706` ámbar | `pi-bolt` | 0 ≤ days ≤ 7 | "Vencen en los próximos 7 días." |
   | `thisMonth` | `#0f766e` teal | `pi-calendar` | 8 ≤ days ≤ 30 | "Plazos a más de una semana." |
   | `noDeadline` | `#64748b` slate | `pi-clock` | sin fecha | "Expedientes sin fecha límite definida." |
4. **Tira lateral de color (4px)** en el lado izquierdo de cada fila, opacidad escalada por grupo:
   - `overdue` → opacity 0.95
   - `thisWeek` → opacity 0.75
   - `thisMonth` / `noDeadline` → opacity 0.55
5. **Pill de plazo** prominente con texto natural: "Vence hoy", "En 5 días", "Venció hace 2 días", "Sin plazo". Color del pill por grupo (no neutro para `overdue`/`thisWeek`).
6. **Densidad toggle** (cómodo/compacto) en el header (`SelectButton`):
   - Cómodo: emoji 40px, título 15px, muestra progreso + cliente.
   - Compacto: emoji 32px, título 14px, oculta topline + secondary meta.
7. **Grupos colapsables** con `<button>` y chevron. Estado guardado en `Set<Urgency>`.
8. **Progreso del expediente** como mini-bar (4px) + número %, calculado por etapas completadas / totales (mock o real).
9. **Counters compactos** (📄/📅/💬) solo si el valor es > 0. Tooltip con el nombre.
10. **Empty state por scope**: nunca "No data". Siempre contextual.
11. **Footer con totales y atajos**: "X expedientes · Y grupos · Tip: click en sección para colapsar".
12. **Sort intra-grupo**: por deadline ascendente (más urgentes primero), luego por createdAt descendente.
13. **Toolbar idéntico a variante A** (búsqueda + Asignado + A mí + Limpiar).
14. **Type chips coloreados por tipo** (`cockpit-chip` system + dot 6px). Estilo `type-chip` con `--chip-accent`.
15. **NO usar estrella / favoritos** — ya descartado por UX.

## Estructura de fila (CSS Grid)

```css
.cockpit-row {
  position: relative;
  display: grid;
  grid-template-columns: 4px 2.5rem 1fr auto auto;
  /*                    ┃   🎭     content avatar actions */
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem 0.875rem 0;
  border-bottom: 1px solid var(--surface-border);
  transition: background-color 0.15s ease;
}
.cockpit-row:hover {
  background: color-mix(in srgb, var(--row-accent) 4%, var(--surface-raised));
}
```

Cada fila usa `--row-accent` inline (color del grupo).

### Topline visual unificado (Tag + Urgent badge alineados)

**Problema resuelto:** PrimeVue `<Tag>` y un badge custom no alinean. Solución: ambos usan el mismo sistema `cockpit-chip`:

```vue
<div class="cockpit-row__topline">
  <span class="cockpit-row__casekey">{{ row.caseNumber.slice(0, 18) }}</span>
  <span class="cockpit-chip" :class="`cockpit-chip--${typeSeverity[row.type]}`">
    {{ typeLabel[row.type] }}
  </span>
  <span v-if="row.isUrgent" class="cockpit-chip cockpit-chip--urgent">
    <i class="pi pi-bolt text-[9px]" />
    Urgente
  </span>
</div>
```

Ver § "Sistema de chips unificado" en variante A para el CSS completo.

## Group header (CSS)

```css
.cockpit-group__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  background: linear-gradient(
    to right,
    color-mix(in srgb, var(--group-accent) 7%, transparent),
    transparent 60%
  );
  border: none;
  cursor: pointer;
  border-bottom: 1px solid var(--surface-border);
}

html.dark .cockpit-group__header {
  background: linear-gradient(
    to right,
    color-mix(in srgb, var(--group-accent) 18%, transparent),
    transparent 60%
  );
}

.cockpit-group__indicator {
  width: 28px; height: 28px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--group-accent) 14%, var(--surface-raised));
  color: var(--group-accent);
}
```

## Helpers para clasificar urgencia

```ts
type Urgency = 'overdue' | 'thisWeek' | 'thisMonth' | 'noDeadline';

function getUrgency(row: Trackable): Urgency {
  if (!row.deadlineDate) return 'noDeadline';
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const deadline = new Date(row.deadlineDate);
  const daysDiff = Math.floor((deadline.getTime() - now.getTime()) / 86400000);
  if (daysDiff < 0) return 'overdue';
  if (daysDiff <= 7) return 'thisWeek';
  return 'thisMonth';
}

function getDeadlineLabel(row: Trackable): string {
  if (!row.deadlineDate) return 'Sin plazo';
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const deadline = new Date(row.deadlineDate);
  const daysDiff = Math.floor((deadline.getTime() - now.getTime()) / 86400000);
  if (daysDiff === 0) return 'Vence hoy';
  if (daysDiff === 1) return 'Vence mañana';
  if (daysDiff > 0 && daysDiff <= 30) return `En ${daysDiff} días`;
  if (daysDiff > 30) return deadline.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
  if (daysDiff === -1) return 'Venció ayer';
  return `Hace ${Math.abs(daysDiff)} días`;
}
```

## Validación al terminar (variante B)

1. `pnpm --filter @tracker/web exec vue-tsc --noEmit` limpio.
2. Probar con datasets vacíos en cada grupo (sólo "vencidos", sólo "sin plazo", etc.) — verificar que no aparezcan secciones vacías.
3. Probar dark mode: gradients de group header se ven bien.
4. Probar densidad: cambio entre cómodo y compacto sin layout jumps.
5. Probar colapsar/expandir grupos: estado persistente durante la sesión.
6. Probar todos los filtros + "Limpiar".
7. Probar accesibilidad: navegación por teclado en chips de tipo + actions.

## Anti-patrones (variante B)

- ❌ Estrella / favoritos — descartado por UX.
- ❌ Card sin altura constreñida → scroll de página, lista crece infinito.
- ❌ Grupo "Otros" o "Sin clasificar" — siempre debe haber criterio claro.
- ❌ Mezclar grupos por estado (Activo/Archivado) con grupos por urgencia. Estado = scope tabs arriba; urgencia = grupos.
- ❌ Color del stripe que no coincide con el del group header — debe ser visual unitario.
- ❌ Pill de plazo con valor numérico crudo (`2024-04-15`) — usar texto humano ("En 5 días").
- ❌ Progreso sin contexto — siempre mostrar el % además de la barra.
- ❌ Compactar tanto que ya no quepa el case-key — promover a comfortable o partir a tabla A.
- ❌ Scroll independiente por grupo — el contenedor padre maneja todo el scroll.
- ❌ Aplicar este patrón a entidades sin urgencia (clientes, usuarios) — usar variante A.

## Estado del listado de expedientes (`TrackablesListView.vue`)

La ruta **`/trackables`** usa la **variante D — portafolio virtualizado** (cursor `GET /api/trackables/list`, chips `UrgencyKpiChipsBar`, densidad persistida, scroll infinito). El sandbox **`/sandbox/recipes/trackables-cockpit`** conserva el prototipo **agrupado (variante B)** para futura tab **Agrupado** / comparación UX.

---

# Variante C — Tabla informativa (read-only)

## Cuándo aplicarla

- Activity log / historial de acciones.
- Audit trail / pista de auditoría.
- Reportes cronológicos.
- Cualquier listado donde el usuario solo lee y filtra (no edita ni elimina).

## Anatomía canónica

```
┌─────────────────────────────────────────────────────────────────┐
│ [PageHeader · sin botón Nuevo]                                  │
├─────────────────────────────────────────────────────────────────┤
│ ╔═════════════════════════════════════════════════════════════╗ │
│ ║ 🔍 buscar... [Categoría▼] [Actor▼] [Rango▼] [Limpiar] N ev. ║ │
│ ║─────────────────────────────────────────────────────────────║ │
│ ║ FECHA/HORA │ ACTOR        │ ACCIÓN     │ DETALLE             ║ │
│ ║ 27 abr     │ avatar+name  │ ⊕ Creó     │ Carlos Mendoza creó ║ │
│ ║ 14:32      │ carlos@a.pe  │            │ el expediente «...» ║ │
│ ║                                                              ║ │
│ ║─────────────────────────────────────────────────────────────║ │
│ ║ « < 1 2 3 > »  15 ▼   1–15 de 28 eventos                    ║ │
│ ╚═════════════════════════════════════════════════════════════╝ │
└─────────────────────────────────────────────────────────────────┘
```

## Reglas inviolables (variante C)

1. **Sin acciones por fila**. Sin botón "Nuevo X". Sin scope tabs.
2. **Sin Skeleton de columna acciones** ni `Column` de acciones.
3. **PageHeader sin `#actions`** (read-only).
4. **Toolbar igual estructura** que A/B pero con filtros temáticos del log: Categoría, Actor, Rango temporal (24h/7d/30d).
5. **Columnas canónicas**:
   | Columna | Contenido | Width |
   |---------|-----------|-------|
   | **Fecha / Hora** | Fecha (`27 abr`) + Hora (`14:32`), `tabular-nums` | `width: 110px` |
   | **Actor** | Avatar 28px + nombre + email | `min-width: 180px` |
   | **Acción** (`info-action-chip`) | Pill con icono + verbo (Creó, Eliminó, etc.) coloreado por tipo | `width: 130px` |
   | **Detalle** | Frase narrativa + entity link `«...»` + sub-detalle italic + categoría mini-chip | `min-width: 220px` |
6. **Action chip coloreado** por tipo (create=verde, update=azul, delete=rojo, archive=ámbar, etc.):
   ```css
   .info-action-chip {
     display: inline-flex; align-items: center; gap: 0.3rem;
     padding: 0.25rem 0.55rem;
     border-radius: 9999px;
     font-size: 0.6875rem; font-weight: 600;
     border: 1px solid color-mix(in srgb, var(--action-accent) 22%, var(--surface-border));
     background: color-mix(in srgb, var(--action-accent) 9%, var(--surface-raised));
     color: var(--action-accent);
   }
   ```
7. **Categoría mini-chip** debajo del detalle (más pequeño que action chip):
   ```css
   .info-category-chip {
     font-size: 0.5625rem; font-weight: 700;
     letter-spacing: 0.06em; text-transform: uppercase;
     padding: 0.05rem 0.4rem; border-radius: 4px;
   }
   ```
8. **Detalle como narrativa** — actor + verbo + objeto entrecomillado:
   - "Carlos Mendoza creó el expediente «García vs. Municipalidad»"
   - El objeto va en `font-semibold` color `var(--accent)`.
9. **Empty state** con icono `pi-history` + texto contextual.
10. **Paginator** simple, sin density toggle.

## Helpers para fechas en log

```ts
function formatActivityDate(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
  const time = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  return { date, time };
}

function withinRange(iso: string, range: '24h' | '7d' | '30d'): boolean {
  const ageH = (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
  if (range === '24h') return ageH <= 24;
  if (range === '7d') return ageH <= 24 * 7;
  return ageH <= 24 * 30;
}
```

## Validación al terminar (variante C)

1. `pnpm --filter @tracker/web exec vue-tsc --noEmit` limpio.
2. Probar todos los filtros + "Limpiar".
3. Probar empty (sin eventos, sin resultados con filtros).
4. Probar dark mode.
5. Verificar que el detalle narrativo lee bien en español.

## Anti-patrones (variante C)

- ❌ Botón "Nuevo evento" — el log es read-only por definición.
- ❌ Acciones por fila ("Editar evento") — los logs no se editan.
- ❌ Mostrar la fecha completa (`2024-04-27T14:32:18Z`) — usar `formatActivityDate`.
- ❌ Tabla con UNA sola columna "evento" como string largo — siempre 4 columnas claras.
- ❌ Action chip sin color por tipo — aporta scaneabilidad.
- ❌ Categoría sin diferenciación visual — confunde "qué tipo de evento es".

---

# Skills relacionadas

- [alega-ui-context](../alega-ui-context/SKILL.md) — marca, tokens, ConfirmDialogBase.
- [alega-ui-coherence](../alega-ui-coherence/SKILL.md) — Tier 2 PageHeader, padding root, antipatrones.
- [alega-confirm-dialog](../alega-confirm-dialog/SKILL.md) — confirmaciones para acciones destructivas en filas (variante A y B).
- [alega-form-dialog](../alega-form-dialog/SKILL.md) — diálogos de creación/edición disparados desde la tabla (variante A).
- [alega-primevue-components](../alega-primevue-components/SKILL.md) — hub índice.
- [primevue](../primevue/SKILL.md) — `DataTable`, `Skeleton`, `IconField`, `Popover`, `Menu`, `Tag`, `SelectButton`, `Dropdown`, `Paginator`.
