---
name: alega-bespoke-patterns
description: >
  Patrones UI específicos de Alega no cubiertos por PrimeVue puro: type-chip con --chip-accent,
  assignee-avatar con hash determinista de color, KPI card con --kpi-accent y pulse dot,
  urgency KPI chips + banda de urgencia en filas de expedientes, activity-stat mini-rows,
  calendario lawyer-grade, y misceláneos (case-key pill, dirty-dot, counter-chip, empty-states).
  Usar como referencia al implementar cualquier vista lawyer-grade.
---

# Alega — Patrones bespoke

**Sandbox:** `/sandbox/patterns/*`

Estos patrones combinan tokens CSS, Tailwind y PrimeVue de forma específica para Alega. Son la "capa 3" del sistema: encima de foundations (tokens/tipografía) y componentes PrimeVue.

Cargar junto con [alega-tokens](../alega-tokens/SKILL.md), [alega-typography](../alega-typography/SKILL.md) y [alega-primevue-components](../alega-primevue-components/SKILL.md).

---

## F1. type-chip — filtro de tipo con `--chip-accent`

**Sandbox:** `/sandbox/patterns/type-chip`
**Origen:** `TrackablesListView.vue` L362-381 (template) + L3038-3061 (CSS)

### Uso

```vue
<button
  v-for="opt in typeChipOptions"
  :key="String(opt.value)"
  type="button"
  class="type-chip"
  :class="{ 'type-chip--active': filters.type === opt.value }"
  :style="{ '--chip-accent': typeChipAccentColor(opt.value) }"
  :aria-pressed="filters.type === opt.value"
  @click="setTypeChip(opt.value)"
>
  <span class="type-chip__dot" :style="{ background: typeChipAccentColor(opt.value) }" aria-hidden="true" />
  {{ opt.label }}
</button>
```

### Mapa de colores por tipo

```ts
function typeChipAccentColor(value: string | null): string {
  switch (value) {
    case 'caso':      return '#0F766E'; // teal
    case 'proceso':   return '#7C3AED'; // violet
    case 'proyecto':  return '#B45309'; // amber dark
    case 'auditoria': return '#0E7490'; // cyan
    default:          return 'var(--brand-zafiro)';
  }
}
```

### CSS canónico

```css
.type-chip {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.75rem; /* touch-friendly */
  border-radius: 9999px;
  border: 1px solid var(--surface-border);
  background: var(--surface-raised);
  padding: 0.35rem 0.95rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--fg-muted);
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
.type-chip:hover {
  border-color: color-mix(in srgb, var(--chip-accent, var(--accent)) 35%, var(--surface-border));
  color: var(--fg-default);
}
.type-chip--active {
  border-width: 1.5px;
  border-color: var(--chip-accent, var(--accent));
  background: color-mix(in srgb, var(--chip-accent, var(--accent)) 12%, var(--surface-raised));
  color: var(--chip-accent, var(--accent));
}
:global(.dark) .type-chip--active {
  background: color-mix(in srgb, var(--chip-accent, var(--accent)) 22%, var(--surface-raised));
}
.type-chip:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--chip-accent, var(--accent)) 45%, var(--surface-border));
  outline-offset: 2px;
}
.type-chip__dot {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 9999px;
}
```

### Reglas
- `aria-pressed` obligatorio (el chip actúa como toggle).
- `min-height: 2.75rem` siempre (touch-friendly).
- Máximo 6 chips en una fila antes de truncar al Dropdown.

---

## F2. assignee-avatar — avatar de usuario con hash determinista

**Sandbox:** `/sandbox/components/avatar`
**Utilidad:** `apps/web/src/utils/avatarColor.ts`
**Origen:** `TrackablesCockpitSandbox.vue` L644-654

### Utilidad `avatarColor.ts`

```ts
export function hashAvatarColor(name: string): string {
  const palette = [
    '#3b5bdb', '#0ca678', '#e67700', '#862e9c',
    '#1971c2', '#c92a2a', '#2f9e44', '#5f3dc4',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  }
  return palette[hash % palette.length];
}

export function avatarInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}
```

### Template canónico

```vue
<!-- Avatar asignado -->
<div
  class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white"
  :style="{ background: hashAvatarColor(user.name) }"
  :aria-label="user.name"
  v-tooltip.top="user.name"
>
  {{ avatarInitials(user.name) }}
</div>

<!-- Sin asignar -->
<div
  class="w-9 h-9 rounded-full flex items-center justify-center"
  style="background: var(--surface-sunken); border: 1.5px dashed var(--surface-border);"
  v-tooltip.top="'Sin asignar'"
  aria-label="Sin asignar"
>
  <i class="pi pi-user-plus text-sm" style="color: var(--fg-subtle);" />
</div>
```

### Reglas
- Siempre `aria-label` + `v-tooltip.top` con el nombre completo.
- Iniciales: máximo 2 caracteres.
- Mínimo 24px. Para filas de tabla: 32-36px. Para perfil: 40-48px.

---

## F3. kpi-card — tarjeta de métrica

**Sandbox:** `/sandbox/patterns/kpi-card`
**Origen:** `TrackablesListView.vue` L228-250 (template) + L3073-3118 (CSS)

### Mapa de `--kpi-accent` por urgencia

```ts
const urgencyAccents = {
  overdue:   '#dc2626', // red — vencidos
  thisWeek:  '#d97706', // amber — esta semana
  thisMonth: '#2d3fbf', // zafiro — próximos 30d
  total:     '#0ca678', // emerald — total activos
};
```

### Template canónico

```vue
<button
  type="button"
  class="exp-kpi-card relative overflow-hidden rounded-2xl border p-5 text-left"
  :style="{ '--kpi-accent': card.accent }"
  @click="filterByKpi(card.key)"
>
  <!-- Pulse dot (solo urgentes) -->
  <span
    v-if="card.pulse"
    class="pointer-events-none absolute right-3 top-3 h-2 w-2 rounded-full bg-amber-500"
    aria-hidden="true"
  />
  <div class="flex min-h-[4.75rem] items-start justify-between gap-3">
    <div>
      <p class="m-0 text-[10px] font-semibold uppercase tracking-[0.08em]" style="color: var(--fg-muted);">
        {{ card.label }}
      </p>
      <p class="m-0 mt-2 text-3xl font-semibold tabular-nums tracking-tight" :class="card.numberClass"
         style="font-feature-settings: 'tnum' 1, 'lnum' 1;">
        {{ card.count }}
      </p>
    </div>
    <span
      class="inline-flex h-10 w-10 items-center justify-center rounded-xl"
      :style="{
        background: \`color-mix(in srgb, var(--kpi-accent) 14%, var(--surface-sunken))\`,
        color: 'var(--kpi-accent)',
      }"
    >
      <i :class="card.icon" class="text-sm" />
    </span>
  </div>
</button>
```

### CSS canónico

```css
.exp-kpi-card {
  background: var(--surface-raised);
  border-color: var(--surface-border);
  box-shadow: var(--shadow-sm);
  animation: expKpiFadeSlideUp 350ms ease both;
}
.exp-kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
@keyframes expKpiFadeSlideUp {
  from { opacity: 0; transform: translateY(14px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .exp-kpi-card { animation: none !important; }
  .exp-kpi-card:hover { transform: none !important; }
}
```

### Reglas
- `<button>` no `<div>` — la card filtra la lista al hacer clic.
- `tabular-nums` + `font-feature-settings: 'tnum' 1` obligatorio en el número.
- Pulse dot solo si `count > 0` y requiere acción inmediata.
- `animation-delay` escalonado para múltiples cards (índice × 75ms).

---

## F3b. Lista expedientes — `UrgencyKpiChipsBar` + banda de urgencia en fila

**Producción:** `apps/web/src/views/trackables/components/UrgencyKpiChipsBar.vue` + columnas en `TrackablesListView.vue`.

- **Chips (`listing-urgency-chip`)**: tira compacta Total · Vencidos · Hoy · 7 días · 30 días · Sin plazo; togglean filtro `urgencia` exclusivo combinable con tipo/asignado/búsqueda. Counts vienen de `facets` del API (`GET /api/trackables/list`).
- **Fila compacta / cómoda (`matters-dt--comfortable`)**: densidad persistida `alega:expedientes:prefs:v1`. Scroll infinito + `virtualScrollerOptions` en `DataTable` para portafolios grandes.
- **Banda lateral de urgencia**: aplicar borde/accent vía `matterRowClass` según `listing_urgency` mapeada al row (mismo semáforo que chips).

Las **cards KPI grandes** (`exp-kpi-card`, §F3) quedan como referencia histórica / sandbox; el patrón **principal** de `/trackables` es la tira de chips.

---

## F4. activity-stat — mini-row de estadística

**Sandbox:** `/sandbox/patterns/activity-stat`
**Origen:** `TrackablesListView.vue` L593-638

```vue
<div
  v-for="stat in stats"
  :key="stat.label"
  class="flex items-center gap-3 rounded-lg px-3 py-2"
  style="background: var(--surface-sunken);"
>
  <i :class="stat.icon" class="text-sm shrink-0" :style="{ color: stat.accent }" aria-hidden="true" />
  <span class="text-sm flex-1 min-w-0 truncate" style="color: var(--fg-muted);">{{ stat.label }}</span>
  <span
    class="text-sm font-semibold shrink-0"
    :style="{
      color: stat.count > 0 ? stat.accent : 'var(--fg-subtle)',
      fontFeatureSettings: '\'tnum\' 1',
    }"
  >{{ stat.count }}</span>
</div>
```

### Reglas
- Número: `tabular-nums` + color condicional (accent si `> 0`, subtle si `=== 0`).
- Label: `min-w-0 truncate` para no empujar el número.
- Icono con `aria-hidden="true"`.

---

## F5. Misc pills & empty states

**Sandbox:** `/sandbox/patterns/misc-pills`

### matter-case-key (n.º expediente)

```vue
<span
  class="inline-flex w-fit rounded-md border px-1.5 py-0.5
         font-mono text-[10px] font-semibold uppercase tracking-[0.04em]"
  style="
    border-color: var(--surface-border);
    background: color-mix(in srgb, var(--surface-raised) 88%, var(--accent-soft));
    color: var(--fg-muted);
  "
>{{ caseKey }}</span>
```

### dirty-dot (cambios sin guardar)

```vue
<p class="flex items-center gap-1.5 text-[0.8125rem]" style="color: #d97706;">
  <span class="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
  Cambios sin guardar
</p>
```

### counter-chip (icon + count + tooltip)

```vue
<span
  class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
  style="background: var(--surface-sunken); color: var(--fg-muted); border: 1px solid var(--surface-border);"
  v-tooltip="'Documentos adjuntos'"
  :aria-label="\`${count} documentos\`"
>
  <i class="pi pi-file text-[11px]" aria-hidden="true" />
  {{ count }}
</span>
```

### empty-state canónico

```vue
<div class="flex flex-col items-center gap-3 py-16 text-center">
  <i class="pi pi-inbox text-4xl opacity-40" style="color: var(--fg-subtle);" />
  <div class="flex flex-col gap-1">
    <p class="text-sm font-semibold m-0" style="color: var(--fg-default);">{{ t('title') }}</p>
    <p class="text-xs m-0" style="color: var(--fg-subtle);">{{ t('subtitle') }}</p>
  </div>
  <Button :label="t('cta')" icon="pi pi-plus" size="small" /> <!-- opcional -->
</div>
```

**Variantes de icono:** `pi-inbox` (vacío), `pi-search` (sin resultados), `pi-lock` (sin permisos), `pi-wifi` (error red).

---

## F6. Calendario lawyer-grade — toolbar, alertas, responsive

**Sandbox:** `/sandbox/recipes/calendar-redesign`

### Toolbar de calendario

Separar jerarquía en 2 bandas dentro del mismo panel:

1. **Primaria:** navegación temporal (`Anterior`, `Siguiente`, `Hoy`) + fecha literal (`rangeTitle`) + cambio de vista (`Hoy`, `Semana`, `Mes`, `Por expediente`).
2. **Secundaria:** alcance (`Mi agenda` / `Despacho`) + búsqueda + CTA `Agregar actividad`.

```vue
<div class="cal-redesign__toolbar">
  <div class="cal-redesign__toolbar-primary">
    <div class="cal-redesign__toolbar-track">
      <!-- nav + h2 rangeTitle -->
    </div>
    <SelectButton v-model="view" class="cal-redesign__views" aria-label="Vista del calendario" />
  </div>
  <div class="cal-redesign__toolbar-divider" aria-hidden="true" />
  <div class="cal-redesign__toolbar-actions">
    <SelectButton v-model="scope" class="cal-redesign__scope" aria-label="Ámbito" />
    <IconField class="cal-redesign__search-field">
      <InputText aria-label="Buscar en el calendario" name="cal-redesign-search" autocomplete="off" />
    </IconField>
    <Button label="Agregar actividad" icon="pi pi-plus" />
  </div>
</div>
```

### Responsive de calendario

- Usar `container-type: inline-size` en `.cal-redesign`; decidir layout por ancho real del contenedor, no solo viewport.
- En modo apilado, `.cal-redesign__sidebar { position: static; }`; `sticky` solo en dos columnas.
- Reglas estrechas deben ir **después** de reglas base para ganar cascada (`position: static`, búsqueda `width: 100%`, etc.).
- `rangeTitle`: `text-wrap: balance` + `clamp()` moderado; fecha debe leerse antes que filtros.
- En cards de evento, usar `container-type` propio y grid explícito en estrecho: barra lateral ocupa columna 1, hora/body columna 2, asignado en fila inferior. No dejar auto-placement colocar body en track de 6px.

### Alertas del día (`PulseChips`)

Los chips son para señales operativas con peso de notificación:

- Vencen hoy.
- Próximas 48h.
- Audiencias.
- SINOE sin revisar.
- Sin asignar.

**No incluir cumpleaños** en `PulseChips` ni en la leyenda de urgencias. Cumpleaños es dato social/contextual; va en otro módulo, no con igual peso visual que plazos, SINOE o audiencias.

### Resumen mensual

Para sidebar usar `activity-stat` compacto (§F4): icono + label truncado + número tabular. Evitar lista plana sin iconos si el panel convive con calendario mini.

---

## Skills relacionadas

- [alega-tokens](../alega-tokens/SKILL.md) — variables CSS usadas en todos los patrones.
- [alega-typography](../alega-typography/SKILL.md) — roles tipográficos.
- [alega-primevue-components](../alega-primevue-components/SKILL.md) — índice de componentes.
- [alega-datatable](../alega-datatable/SKILL.md) — la tabla funcional usa type-chip, avatar y counter-chip.
