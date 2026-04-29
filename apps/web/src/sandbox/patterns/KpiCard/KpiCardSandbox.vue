<script setup lang="ts">
import ExampleFrame from '../../_shared/ExampleFrame.vue';

const kpiCards = [
  {
    key: 'overdue',
    label: 'Vencidos',
    count: 3,
    icon: 'pi pi-exclamation-circle',
    accent: '#dc2626',
    pulse: true,
    numberClass: 'text-red-600 dark:text-red-400',
    description: 'Plazo cumplido',
  },
  {
    key: 'thisWeek',
    label: 'Esta semana',
    count: 7,
    icon: 'pi pi-clock',
    accent: '#d97706',
    pulse: false,
    numberClass: 'text-amber-600 dark:text-amber-400',
    description: 'Vencen en 7 días',
  },
  {
    key: 'thisMonth',
    label: 'Próximos 30 días',
    count: 14,
    icon: 'pi pi-calendar',
    accent: '#2d3fbf',
    pulse: false,
    numberClass: 'text-[var(--accent)]',
    description: 'Vencen en 30 días',
  },
  {
    key: 'total',
    label: 'Total activos',
    count: 47,
    icon: 'pi pi-briefcase',
    accent: '#0ca678',
    pulse: false,
    numberClass: 'text-emerald-600 dark:text-emerald-400',
    description: 'Expedientes activos',
  },
];

const codeKpiCard = `<!-- KPI card con --kpi-accent + pulse dot + animación entrada -->
<button
  v-for="card in kpiCards"
  :key="card.key"
  type="button"
  class="exp-kpi-card relative overflow-hidden rounded-2xl border p-5 text-left transition-all"
  :style="{ '--kpi-accent': card.accent }"
  @click="filterByKpi(card.key)"
>
  <!-- Pulse dot (solo cuando hay urgentes) -->
  <span
    v-if="card.pulse"
    class="pointer-events-none absolute right-3 top-3 h-2 w-2 rounded-full bg-amber-500"
    aria-hidden="true"
  />
  <!-- Número + icono -->
  <div class="flex items-start justify-between gap-4">
    <div class="min-w-0 flex-1 overflow-hidden">
      <p class="m-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--fg-muted)] truncate">
        {{ card.label }}
      </p>
      <p class="m-0 mt-2 text-3xl font-semibold tabular-nums" :class="card.numberClass">
        {{ card.count }}
      </p>
      <p class="m-0 mt-1 text-xs text-[var(--fg-subtle)] truncate">{{ card.description }}</p>
    </div>
    <span class="exp-kpi-icon-wrap inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
      <i :class="[card.icon, 'text-sm']" />
    </span>
  </div>
</button>

/* CSS canónico */
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
.exp-kpi-icon-wrap {
  background: color-mix(in srgb, var(--kpi-accent, var(--accent)) 14%, var(--surface-sunken));
  color: var(--kpi-accent, var(--accent));
}
@keyframes expKpiFadeSlideUp {
  from { opacity: 0; transform: translateY(14px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}`;
</script>

<template>
  <div class="flex flex-col gap-10">
    <div>
      <p class="text-xs font-semibold uppercase tracking-widest mb-1" style="color: var(--fg-subtle);">Patrones / KPI Card</p>
      <h1 class="text-2xl font-semibold m-0" style="color: var(--fg-default);">KPI Card (tarjeta de métrica)</h1>
      <p class="text-sm mt-1 m-0" style="color: var(--fg-muted);">
        Tarjeta clicable con variable <code class="font-mono text-xs px-1 rounded" style="background: var(--surface-sunken);">--kpi-accent</code> por tipo,
        número grande tabular, icono con tinte, pulse dot para urgentes y animación de entrada.
        Respeta <code class="font-mono text-xs px-1 rounded" style="background: var(--surface-sunken);">prefers-reduced-motion</code>.
      </p>
    </div>

    <!-- Demo interactivo -->
    <ExampleFrame
      title="KPI Cards — demo (4 métricas)"
      description="Variables --kpi-accent por urgencia. Pulse dot ámbar en 'Vencidos'. Hover eleva la card."
      :code="codeKpiCard"
    >
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          v-for="(card, i) in kpiCards"
          :key="card.key"
          type="button"
          class="exp-kpi-card-demo relative overflow-hidden rounded-2xl border p-5 text-left transition-all"
          :style="{
            '--kpi-accent': card.accent,
            border: '1px solid var(--surface-border)',
            background: 'var(--surface-raised)',
            animationDelay: `${i * 75}ms`,
          }"
        >
          <!-- Pulse dot -->
          <span
            v-if="card.pulse"
            class="pointer-events-none absolute right-3 top-3 h-2 w-2 rounded-full bg-amber-500 animate-pulse"
            aria-hidden="true"
          />
          <!-- Content -->
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0 flex-1 overflow-hidden">
              <p
                class="m-0 text-[10px] font-semibold uppercase tracking-[0.08em] truncate"
                style="color: var(--fg-muted);"
              >{{ card.label }}</p>
              <p
                class="m-0 mt-2 text-3xl font-semibold tabular-nums tracking-tight"
                :class="card.numberClass"
                style="font-feature-settings: 'tnum' 1, 'lnum' 1;"
              >{{ card.count }}</p>
              <p class="m-0 mt-1 text-xs truncate" style="color: var(--fg-subtle);">{{ card.description }}</p>
            </div>
            <span
              class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              :style="{
                background: `color-mix(in srgb, ${card.accent} 14%, var(--surface-sunken))`,
                color: card.accent,
              }"
              aria-hidden="true"
            >
              <i :class="[card.icon, 'text-sm']" />
            </span>
          </div>
        </button>
      </div>
    </ExampleFrame>

    <!-- Tokens -->
    <ExampleFrame title="Variables CSS y mapping de colores">
      <div class="flex flex-col gap-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            v-for="card in kpiCards"
            :key="card.key"
            class="flex items-center gap-3 rounded-lg px-4 py-3"
            style="border: 1px solid var(--surface-border); background: var(--surface-raised);"
          >
            <div class="w-4 h-4 rounded-full shrink-0" :style="{ background: card.accent }" />
            <div class="flex flex-col gap-0.5">
              <span class="text-sm font-semibold" style="color: var(--fg-default);">{{ card.label }}</span>
              <code class="text-[10px] font-mono" style="color: var(--fg-subtle);">--kpi-accent: {{ card.accent }}</code>
            </div>
          </div>
        </div>
        <div
          class="rounded-lg px-3 py-2 text-xs"
          style="background: var(--surface-sunken); border: 1px solid var(--surface-border); color: var(--fg-muted);"
        >
          El icono envoltorio hereda el color con <code class="font-mono">color-mix(in srgb, var(--kpi-accent) 14%, var(--surface-sunken))</code>.
          El número usa clases Tailwind de color directas (text-red-600, text-amber-600, etc.) porque los tokens de severity no están en CSS vars.
        </div>
      </div>
    </ExampleFrame>

    <!-- Anti-patterns -->
    <div class="flex flex-col gap-3">
      <h2 class="text-base font-semibold m-0" style="color: var(--fg-default);">Reglas</h2>
      <div class="rounded-xl overflow-hidden" style="border: 1px solid var(--surface-border);">
        <table class="w-full text-xs">
          <thead><tr style="background: var(--surface-sunken); border-bottom: 1px solid var(--surface-border);"><th class="text-left px-4 py-2 font-semibold" style="color: var(--fg-muted);">Regla</th><th class="text-left px-4 py-2 font-semibold" style="color: var(--fg-muted);">Detalle</th></tr></thead>
          <tbody>
            <tr style="border-bottom: 1px solid var(--surface-border);"><td class="px-4 py-2.5 font-medium" style="color: var(--fg-default);">Números en tabular-nums</td><td class="px-4 py-2.5" style="color: var(--fg-muted);">font-feature-settings: 'tnum' 1 para que los dígitos no bailen al actualizarse.</td></tr>
            <tr style="border-bottom: 1px solid var(--surface-border);"><td class="px-4 py-2.5 font-medium" style="color: var(--fg-default);">Pulse dot solo en urgentes</td><td class="px-4 py-2.5" style="color: var(--fg-muted);">Pulse ámbar (bg-amber-500) solo cuando el conteo > 0 y requiere acción inmediata.</td></tr>
            <tr style="border-bottom: 1px solid var(--surface-border);"><td class="px-4 py-2.5 font-medium" style="color: var(--fg-default);">Animación de entrada</td><td class="px-4 py-2.5" style="color: var(--fg-muted);">expKpiFadeSlideUp con animation-delay escalonado. Desactivar si prefers-reduced-motion.</td></tr>
            <tr><td class="px-4 py-2.5 font-medium" style="color: var(--fg-default);">Card clicable</td><td class="px-4 py-2.5" style="color: var(--fg-muted);">La card filtra la lista al hacer clic. Usar <code class="font-mono" style="background: var(--surface-sunken); padding: 0 2px; border-radius: 2px;">&lt;button&gt;</code> no &lt;div&gt;.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="flex flex-wrap gap-4 text-xs" style="color: var(--fg-muted);">
      <span>Origen: <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">TrackablesListView.vue L228-250</code></span>
      <span>·</span>
      <span>CSS: <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">TrackablesListView.vue L3073-3118</code></span>
    </div>
  </div>
</template>

<style scoped>
.exp-kpi-card-demo {
  box-shadow: var(--shadow-sm);
  animation: expKpiFadeSlideUp 350ms ease both;
  cursor: pointer;
}
.exp-kpi-card-demo:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
@keyframes expKpiFadeSlideUp {
  from { opacity: 0; transform: translateY(14px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .exp-kpi-card-demo {
    animation: none !important;
  }
  .exp-kpi-card-demo:hover {
    transform: none !important;
  }
}
</style>
