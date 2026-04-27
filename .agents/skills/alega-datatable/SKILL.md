---
name: alega-datatable
description: >
  Patrón canónico de DataTable lawyer-grade en Alega (Vue 3, PrimeVue 4, Tailwind). KPI cards
  con mesh gradient, command toolbar (search + chips de tipo + filtros popover + saved views),
  skeleton siempre que `loading`, columnas densas (Id+emoji / tipo / asignado / actividad mini /
  acciones), acciones como `Button` outlined+rounded por severity con gap >=1rem.
  Usar al crear listados nuevos, refactorizar existentes ("hazlo como expedientes"),
  o estandarizar tablas con KPIs filtrables.
---

# Alega — DataTable canónico (cockpit lawyer-grade)

Referencia viva: [apps/web/src/views/trackables/TrackablesListView.vue](../../../apps/web/src/views/trackables/TrackablesListView.vue).

Cargar **siempre** junto con [alega-ui-context](../alega-ui-context/SKILL.md) y [alega-ui-coherence](../alega-ui-coherence/SKILL.md).

## Cuándo aplicarla

- Listados maestros (expedientes, clientes, documentos, partes, plantillas).
- "Hazlo como `TrackablesListView`", "vista cockpit", "tabla con KPIs filtrables".
- Refactor de tablas viejas con `text-gray-*`, `font-mono`, footer con paginador inline, acciones inline `<Button text rounded>` apiladas.

## Anatomía canónica

```
<section class="flex flex-col gap-6">
  <PageHeader :title :subtitle> <template #actions>...</template> </PageHeader>
  <ScopeTabs />               <!-- activos | archivados | papelera -->
  <KpiCards v-if="scope === 'active'" />
  <div class="app-card matters-cockpit-card flex flex-col overflow-hidden">
    <CommandToolbar />
    <TypeChipsRow />
    <DataTable | Skeleton />
    <Paginator />
  </div>
</section>
```

## Reglas inviolables

1. **Sin padding root** (`AppLayout` aplica). Vista raíz: `class="flex flex-col gap-6"`.
2. **PageHeader** con `title` + `subtitle` obligatorio en i18n.
3. **Tabla envuelta** en `.app-card` con `overflow-hidden` y `flex flex-col`.
4. **Skeleton** al `loading.value` (cualquier filtrado/scope/paginación), no solo first-load. `min-h-[420px]` para evitar layout jumps.
5. **Pagination** fuera del `<DataTable>`, en footer del card con borde top y `bg-[var(--surface-raised)]`.
6. **Sin `font-mono`, `font-bold` ni `text-gray-*`**: usar `--fg-default`/`--fg-muted`/`--fg-subtle`, `tabular-nums` para números.
7. **i18n** para todos los strings (encabezados, vacíos, tooltips, paginación).

## KPI cards (mesh gradient)

```vue
<button
  class="exp-kpi-card group relative min-h-[5.75rem] overflow-hidden rounded-2xl
         border border-[var(--surface-border)] bg-[var(--surface-raised)] p-4 ..."
  :style="{
    '--stagger-delay': `${idx * 60}ms`,
    '--kpi-accent': card.accentColor,
    '--kpi-mesh-1': card.mesh1,
    '--kpi-mesh-2': card.mesh2,
  }"
>
  <div class="exp-kpi-mesh absolute inset-0" />
  <div class="exp-kpi-grain absolute inset-0" aria-hidden="true" />
  <div class="exp-kpi-pulse" v-if="card.pulse" />
  ...
  <span class="exp-kpi-icon-wrap"><i :class="card.icon" /></span>
</button>
```

Por KPI: `accentColor` + `mesh1` (radial top-left) + `mesh2` (radial bottom-right) + `numberClass` + `activeRingClass`. El icono usa `--kpi-accent` (variable CSS scoped por card).

CSS reusable:

```css
.exp-kpi-mesh {
  position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(120% 80% at 0% 0%, var(--kpi-mesh-1, transparent), transparent 60%),
    radial-gradient(120% 80% at 100% 100%, var(--kpi-mesh-2, transparent), transparent 60%);
}
.exp-kpi-grain {
  position: absolute; inset: 0; opacity: 0.35; pointer-events: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='...'><filter id='n'>...</filter><rect filter='url(%23n)' opacity='0.06'/></svg>");
  mix-blend-mode: overlay;
}
.exp-kpi-icon-wrap {
  border: 1px solid color-mix(in srgb, var(--kpi-accent) 24%, var(--surface-border));
  background: color-mix(in srgb, var(--kpi-accent) 10%, var(--surface-raised));
  color: var(--kpi-accent);
}
.exp-kpi-card--active { background: color-mix(in srgb, var(--kpi-accent) 12%, var(--surface-raised)); }
@media (prefers-reduced-motion: reduce) {
  .exp-kpi-card { animation: none !important; }
  .exp-kpi-grain { opacity: 0.12 !important; }
}
```

Paleta KPI sugerida (alineada con marca Alega):

| KPI | accent | mesh1 | mesh2 |
|-----|--------|-------|-------|
| Total | `#2D3FBF` (zafiro) | `#2D3FBF/22` | `#7C3AED/12` |
| Urgentes hoy | `#B45309` | `#F59E0B/22` | `#FB7185/10` |
| Vencidas | `#B91C1C` | `#EF4444/24` | `#F97316/12` |
| Próximos 14d | `#0F766E` | `#14B8A6/20` | `#06B6D4/14` |

## Command toolbar

`IconField` con search a la izquierda (`Ctrl/Cmd+K`), contador de resultados, botón "Filtros activos" → `Popover`, "Vistas guardadas" → `Menu`, kebab `pi-ellipsis-h` → `Menu` (export, densidad, columnas).

```vue
<IconField ref="searchFieldRef" class="toolbar-iconfield min-w-0 flex-1">
  <InputIcon class="pi pi-search text-[var(--fg-subtle)]" />
  <InputText v-model="filters.search" :placeholder="t('...')" autocomplete="off" @input="resetAndLoad" />
</IconField>
```

Hotkey global:

```ts
function onGlobalSearchHotkey(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
  if (tag === 'input' || tag === 'textarea') return;
  if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault();
    focusSearch();
  }
}
```

## Type chips coloreados

Filtro principal por tipo como chips píldora con dot 6px del color del tipo + `--chip-accent` activo.

```vue
<button class="type-chip" :class="active ? 'type-chip--active' : ''"
  :style="{ '--chip-accent': typeChipAccent(opt.value) }">
  <span class="type-chip__dot" :style="{ background: typeChipAccent(opt.value) }" />
  {{ opt.label }}
</button>
```

```css
.type-chip { padding: 0.35rem 0.95rem; border-radius: 9999px; gap: 0.5rem; }
.type-chip__dot { width: 6px; height: 6px; border-radius: 9999px; }
.type-chip--active {
  border-width: 1.5px;
  border-color: var(--chip-accent);
  background: color-mix(in srgb, var(--chip-accent) 12%, var(--surface-raised));
  color: var(--chip-accent);
}
```

## DataTable props base

```vue
<DataTable
  ref="dtRef"
  class="matters-data-table min-h-0 flex-1"
  :value="rows"
  :loading="loading"
  data-key="id"
  size="small"
  scrollable
  scroll-height="flex"
  row-hover
  responsive-layout="scroll"
  :row-class="rowClass"
  :table-props="{ 'aria-label': t('...') }"
>
  <template #empty>
    <EmptyState :icon :title :subtitle />
  </template>
  ...
</DataTable>
```

`mattersShowSkeleton = computed(() => loading.value)` (no `&& rows.length === 0`).

## Columnas canónicas

| Columna | Contenido |
|---------|-----------|
| **Title** | Emoji 40px en `rounded-xl bg-[var(--accent-soft)]` + chip case-key (font-mono, uppercase, 10px) + `<router-link>` con `font-semibold text-accent line-clamp-2` + meta line `text-xs text-[var(--fg-subtle)] line-clamp-1` |
| **Type** | `<Tag>` uppercase, `severity` mapeado por tipo |
| **Assignee** | Avatar 32px (`img` o iniciales con `assigneeAvatarBg(id)`) + nombre truncado, o CTA `pi-user-plus` borde dashed si vacío |
| **Activity mini** | 1-3 mini-stats inline (icono + label uppercase 10px + número 0.95rem). Solo aparecen las que tengan valor > 0. Variante `--danger` con fondo `#fef2f2/70` + texto `#991b1b` |
| **Actions** | Ver sección **Acciones de fila** |

## Acciones de fila (inviolable)

Usar **PrimeVue `Button`** outlined + rounded + severity por acción. Nunca botones nativos en cápsula.

```vue
<div class="matters-row-actions" role="group" :aria-label="t('common.actions')">
  <Button icon="pi pi-pencil" variant="outlined" rounded size="small" severity="secondary"
    class="matter-action matter-action--edit" :aria-label="..." v-tooltip.top="..." @click="..." />
  <Button icon="pi pi-inbox" variant="outlined" rounded size="small" severity="warn"
    class="matter-action matter-action--archive" ... />
  <Button icon="pi pi-replay" variant="outlined" rounded size="small" severity="success"
    class="matter-action matter-action--restore" ... />
  <Button icon="pi pi-trash" variant="outlined" rounded size="small" severity="danger"
    class="matter-action matter-action--danger" ... />
</div>
```

CSS (forzar `!important` por especificidad de PrimeVue):

```css
:deep(.matters-row-actions) {
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  gap: 1rem !important;
}
:deep(.matters-row-actions > *) { margin: 0 0.25rem !important; }
:deep(.matter-action.p-button) {
  width: 2.25rem !important;
  height: 2.25rem !important;
  padding: 0 !important;
}
:deep(.matter-action .p-button-icon) { font-size: 0.875rem; }
```

Mapeo severidad → acción:

| Acción | severity | icono |
|--------|----------|-------|
| Editar | `secondary` | `pi-pencil` |
| Archivar | `warn` | `pi-inbox` |
| Reactivar | `success` | `pi-replay` |
| Eliminar | `danger` | `pi-trash` |

Header de columna acciones: `text-align: center !important`, `min-w-[7.5rem] whitespace-nowrap`.

## Skeleton

Reservar altura (`min-h-[420px]`) y dibujar 5 columnas con grid CSS estática:

```vue
<div v-if="showSkeleton" class="matters-skeleton-shell flex-1 min-h-[420px] overflow-x-auto">
  <div class="min-w-[760px]">
    <div class="grid grid-cols-[minmax(280px,1.8fr)_140px_220px_220px_140px] gap-4 border-b px-4 py-3">
      <Skeleton v-for="col in 5" :key="col" height="0.75rem" />
    </div>
    <div v-for="row in 8" class="grid grid-cols-[...] gap-4 px-4 py-4 border-b last:border-0">
      <div class="flex items-center gap-3">
        <Skeleton shape="circle" size="2.25rem" />
        <div class="flex-1 flex flex-col gap-2">
          <Skeleton height="0.9rem" width="80%" />
          <Skeleton height="0.7rem" width="55%" />
        </div>
      </div>
      <Skeleton height="1.4rem" width="5.5rem" border-radius="999px" />
      ...
    </div>
  </div>
</div>
```

## Validación al terminar

1. `pnpm --filter @tracker/web exec vue-tsc --noEmit` limpio.
2. Greps de antipatrones (alega-ui-coherence): `font-mono`, `font-bold` en títulos, `text-gray-*`, `p-6` en root.
3. Probar claro + dark, teclado (`Ctrl+K`), `prefers-reduced-motion`.

## Skills relacionadas

- [alega-ui-context](../alega-ui-context/SKILL.md) — marca, tokens, ConfirmDialogBase.
- [alega-ui-coherence](../alega-ui-coherence/SKILL.md) — Tier 2 PageHeader, padding root, antipatrones.
- [alega-confirm-dialog](../alega-confirm-dialog/SKILL.md) — confirmaciones para acciones destructivas en filas.
- [alega-form-dialog](../alega-form-dialog/SKILL.md) — diálogos de creación/edición disparados desde la tabla.
- [primevue](../primevue/SKILL.md) — `DataTable`, `Skeleton`, `IconField`, `Popover`, `Menu`.
