<script setup lang="ts">
import { ref } from 'vue';
import ExampleFrame from '../../_shared/ExampleFrame.vue';

type TrackableType = 'caso' | 'proceso' | 'proyecto' | 'auditoria';

const selected = ref<TrackableType | null>(null);

const types: { value: TrackableType | null; label: string }[] = [
  { value: null, label: 'Todos' },
  { value: 'caso', label: 'Caso' },
  { value: 'proceso', label: 'Proceso' },
  { value: 'proyecto', label: 'Proyecto' },
  { value: 'auditoria', label: 'Auditoría' },
];

function accentColor(value: TrackableType | null): string {
  switch (value) {
    case 'caso': return '#0F766E';
    case 'proceso': return '#7C3AED';
    case 'proyecto': return '#B45309';
    case 'auditoria': return '#0E7490';
    default: return 'var(--brand-zafiro)';
  }
}

const codeTypeChip = `<!-- type-chip pattern — filter bar en TrackablesListView -->
<div class="flex items-center gap-2 overflow-x-auto snap-x">
  <button
    v-for="opt in typeChipOptions"
    :key="String(opt.value)"
    type="button"
    class="type-chip shrink-0 snap-start"
    :class="[
      filters.type === opt.value ? 'type-chip--active' : '',
      opt.value == null ? 'type-chip--all' : \`type-chip--\${opt.value}\`,
    ]"
    :style="{ '--chip-accent': typeChipAccentColor(opt.value) }"
    :aria-pressed="filters.type === opt.value"
    @click="setTypeChip(opt.value)"
  >
    <span
      class="type-chip__dot shrink-0"
      :style="{ background: typeChipAccentColor(opt.value) }"
      aria-hidden="true"
    />
    {{ opt.label }}
  </button>
</div>

/* CSS canónico */
.type-chip {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.75rem;        /* touch-friendly */
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
.type-chip__dot {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
}`;
</script>

<template>
  <div class="flex flex-col gap-10">
    <!-- Page header -->
    <div>
      <p class="text-xs font-semibold uppercase tracking-widest mb-1" style="color: var(--fg-subtle);">
        Patrones / Type-chip
      </p>
      <h1 class="text-2xl font-semibold m-0" style="color: var(--fg-default);">Type-chip (filtro de tipo)</h1>
      <p class="text-sm mt-1 m-0" style="color: var(--fg-muted);">
        Pill de tipo con dot de color, variable CSS <code class="font-mono text-xs px-1 rounded" style="background: var(--surface-sunken);">--chip-accent</code> configurable por tipo.
        Se usa como filtro rápido horizontal en la toolbar de expedientes. Estados: idle, hover, active, focus-visible.
      </p>
    </div>

    <!-- Demo interactivo -->
    <ExampleFrame
      title="Demo interactivo — filtro de tipo"
      description="Seleccionar un tipo activa el chip. El dot hereda el color de --chip-accent. min-height 2.75rem para touch-friendly."
      :code="codeTypeChip"
    >
      <div class="flex flex-col gap-4">
        <!-- Chips -->
        <div class="flex flex-wrap items-center gap-2">
          <button
            v-for="opt in types"
            :key="String(opt.value)"
            type="button"
            class="type-chip-demo"
            :class="{ 'type-chip-demo--active': selected === opt.value }"
            :style="{ '--chip-accent': accentColor(opt.value) }"
            :aria-pressed="selected === opt.value"
            @click="selected = opt.value"
          >
            <span
              class="type-chip-dot"
              :style="{ background: accentColor(opt.value) }"
              aria-hidden="true"
            />
            {{ opt.label }}
          </button>
        </div>
        <p class="text-sm m-0" style="color: var(--fg-muted);">
          Filtro activo: <strong>{{ selected === null ? 'Todos' : selected }}</strong>
        </p>
      </div>
    </ExampleFrame>

    <!-- Colores por tipo -->
    <ExampleFrame
      title="Mapa de colores por tipo"
      description="Cada tipo tiene su --chip-accent. Los colores son hex fijos (no tokens CSS) para diferenciación semántica."
    >
      <div class="flex flex-wrap gap-3">
        <div
          v-for="opt in types.filter(t => t.value !== null)"
          :key="String(opt.value)"
          class="flex items-center gap-3 rounded-xl px-4 py-3"
          style="border: 1px solid var(--surface-border); background: var(--surface-raised);"
        >
          <div
            class="w-4 h-4 rounded-full shrink-0"
            :style="{ background: accentColor(opt.value) }"
          />
          <div class="flex flex-col gap-0.5">
            <span class="text-sm font-semibold" style="color: var(--fg-default);">{{ opt.label }}</span>
            <code class="text-[10px] font-mono" style="color: var(--fg-subtle);">{{ accentColor(opt.value) }}</code>
          </div>
        </div>
      </div>
    </ExampleFrame>

    <!-- Estados -->
    <ExampleFrame
      title="Estados: idle · hover · active · focus-visible"
      description="Focus-visible: outline en --chip-accent con 45% opacity. Hover: border tinte. Active: border 1.5px + bg tinte 12%."
    >
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex flex-col items-center gap-1.5">
          <button class="type-chip-demo" style="--chip-accent: #0F766E;" disabled>
            <span class="type-chip-dot" style="background: #0F766E;" />
            Idle
          </button>
          <span class="text-[10px]" style="color: var(--fg-subtle);">idle</span>
        </div>
        <div class="flex flex-col items-center gap-1.5">
          <button class="type-chip-demo type-chip-demo--hover" style="--chip-accent: #0F766E;">
            <span class="type-chip-dot" style="background: #0F766E;" />
            Hover
          </button>
          <span class="text-[10px]" style="color: var(--fg-subtle);">hover</span>
        </div>
        <div class="flex flex-col items-center gap-1.5">
          <button class="type-chip-demo type-chip-demo--active" style="--chip-accent: #0F766E;" aria-pressed="true">
            <span class="type-chip-dot" style="background: #0F766E;" />
            Caso
          </button>
          <span class="text-[10px]" style="color: var(--fg-subtle);">active</span>
        </div>
        <div class="flex flex-col items-center gap-1.5">
          <button class="type-chip-demo type-chip-demo--focus" style="--chip-accent: #7C3AED;">
            <span class="type-chip-dot" style="background: #7C3AED;" />
            Focus
          </button>
          <span class="text-[10px]" style="color: var(--fg-subtle);">focus-visible</span>
        </div>
      </div>
    </ExampleFrame>

    <!-- Anti-patterns -->
    <div class="flex flex-col gap-3">
      <h2 class="text-base font-semibold m-0" style="color: var(--fg-default);">Reglas y anti-patrones</h2>
      <div class="rounded-xl overflow-hidden" style="border: 1px solid var(--surface-border);">
        <table class="w-full text-xs">
          <thead>
            <tr style="background: var(--surface-sunken); border-bottom: 1px solid var(--surface-border);">
              <th class="text-left px-4 py-2 font-semibold" style="color: var(--fg-muted);">Anti-patrón</th>
              <th class="text-left px-4 py-2 font-semibold" style="color: var(--fg-muted);">Corrección</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid var(--surface-border);">
              <td class="px-4 py-2.5" style="color: #dc2626;">Border color fijo sin --chip-accent</td>
              <td class="px-4 py-2.5" style="color: var(--fg-default);">Siempre usar var(--chip-accent) para que el color sea configurable por tipo.</td>
            </tr>
            <tr style="border-bottom: 1px solid var(--surface-border);">
              <td class="px-4 py-2.5" style="color: #dc2626;">min-height < 2.75rem en móvil</td>
              <td class="px-4 py-2.5" style="color: var(--fg-default);">El chip debe ser touch-friendly. min-height: 2.75rem (44px recomendado WCAG).</td>
            </tr>
            <tr style="border-bottom: 1px solid var(--surface-border);">
              <td class="px-4 py-2.5" style="color: #dc2626;">Sin aria-pressed</td>
              <td class="px-4 py-2.5" style="color: var(--fg-default);">Los chips de filtro actúan como toggle: aria-pressed="true/false" obligatorio.</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5" style="color: #dc2626;">Más de 6 type-chips en fila</td>
              <td class="px-4 py-2.5" style="color: var(--fg-default);">Con > 6 tipos, usar Dropdown de filtro. Los chips son para tipos primarios (&lt; 6).</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Footer -->
    <div class="flex flex-wrap gap-4 text-xs" style="color: var(--fg-muted);">
      <span>Origen: <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">TrackablesListView.vue L362-381</code></span>
      <span>·</span>
      <span>CSS: <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">TrackablesListView.vue L3038-3061</code></span>
    </div>
  </div>
</template>

<style scoped>
.type-chip-demo {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.75rem;
  border-radius: 9999px;
  border: 1px solid var(--surface-border);
  background: var(--surface-raised);
  padding: 0.35rem 0.95rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--fg-muted);
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
.type-chip-demo:hover,
.type-chip-demo--hover {
  border-color: color-mix(in srgb, var(--chip-accent, var(--accent)) 35%, var(--surface-border));
  color: var(--fg-default);
}
.type-chip-demo--active {
  border-width: 1.5px;
  border-color: var(--chip-accent, var(--accent));
  background: color-mix(in srgb, var(--chip-accent, var(--accent)) 12%, var(--surface-raised));
  color: var(--chip-accent, var(--accent));
}
:global(.dark) .type-chip-demo--active {
  background: color-mix(in srgb, var(--chip-accent, var(--accent)) 22%, var(--surface-raised));
}
.type-chip-demo--focus {
  outline: 2px solid color-mix(in srgb, var(--chip-accent, var(--accent)) 45%, var(--surface-border));
  outline-offset: 2px;
}
.type-chip-demo:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--chip-accent, var(--accent)) 45%, var(--surface-border));
  outline-offset: 2px;
}
.type-chip-dot {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 9999px;
}
</style>
