<script setup lang="ts">
import ExampleFrame from '../../_shared/ExampleFrame.vue';

const stats = [
  { icon: 'pi pi-check-square', label: 'Actuaciones completadas', count: 12, accent: '#10b981' },
  { icon: 'pi pi-clock', label: 'Próximos vencimientos', count: 3, accent: '#d97706' },
  { icon: 'pi pi-exclamation-triangle', label: 'Actuaciones vencidas', count: 1, accent: '#dc2626' },
  { icon: 'pi pi-file', label: 'Documentos adjuntos', count: 38, accent: 'var(--fg-subtle)' },
];

const codeActivityStat = `<!-- Activity stat mini-row (sidebar de detalle de expediente) -->
<div class="flex flex-col gap-1">
  <div
    v-for="stat in stats"
    :key="stat.label"
    class="flex items-center gap-3 rounded-lg px-3 py-2"
    style="background: var(--surface-sunken);"
  >
    <i :class="stat.icon" class="text-sm shrink-0" :style="{ color: stat.accent }" aria-hidden="true" />
    <span class="text-sm flex-1 min-w-0 truncate" style="color: var(--fg-muted);">{{ stat.label }}</span>
    <span
      class="text-sm font-semibold tabular-nums shrink-0"
      :style="{ color: stat.count > 0 ? stat.accent : 'var(--fg-subtle)', fontFeatureSettings: '\'tnum\' 1' }"
    >{{ stat.count }}</span>
  </div>
</div>`;
</script>

<template>
  <div class="flex flex-col gap-10">
    <div>
      <p class="text-xs font-semibold uppercase tracking-widest mb-1" style="color: var(--fg-subtle);">Patrones / Activity Stat</p>
      <h1 class="text-2xl font-semibold m-0" style="color: var(--fg-default);">Activity-stat (mini-row de estadística)</h1>
      <p class="text-sm mt-1 m-0" style="color: var(--fg-muted);">Stack vertical de filas compactas: icono + label + número. Para sidebarsl de detalle de expediente, resumen de actividad y panels de estado.</p>
    </div>

    <!-- Demo interactivo -->
    <ExampleFrame title="Activity-stat rows — sidebar de expediente" description="Icono coloreado por estado · label truncado · número tabular alineado a la derecha." :code="codeActivityStat">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="flex flex-col gap-1">
          <span class="text-xs font-semibold mb-1" style="color: var(--fg-subtle);">Sobre fondo raised</span>
          <div
            class="rounded-xl p-4 flex flex-col gap-1"
            style="border: 1px solid var(--surface-border); background: var(--surface-raised);"
          >
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
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <span class="text-xs font-semibold mb-1" style="color: var(--fg-subtle);">Variante compacta (sin fondo de row)</span>
          <div
            class="rounded-xl p-4 flex flex-col gap-2"
            style="border: 1px solid var(--surface-border); background: var(--surface-raised);"
          >
            <div v-for="stat in stats" :key="stat.label + 'compact'" class="flex items-center gap-3">
              <i :class="stat.icon" class="text-sm shrink-0" :style="{ color: stat.accent }" aria-hidden="true" />
              <span class="text-xs flex-1 min-w-0 truncate" style="color: var(--fg-muted);">{{ stat.label }}</span>
              <span
                class="text-xs font-semibold shrink-0"
                :style="{ color: stat.count > 0 ? stat.accent : 'var(--fg-subtle)', fontFeatureSettings: '\'tnum\' 1' }"
              >{{ stat.count }}</span>
            </div>
          </div>
        </div>
      </div>
    </ExampleFrame>

    <!-- Reglas -->
    <div class="flex flex-col gap-3">
      <h2 class="text-base font-semibold m-0" style="color: var(--fg-default);">Reglas</h2>
      <div class="rounded-xl overflow-hidden" style="border: 1px solid var(--surface-border);">
        <table class="w-full text-xs">
          <thead><tr style="background: var(--surface-sunken); border-bottom: 1px solid var(--surface-border);"><th class="text-left px-4 py-2 font-semibold" style="color: var(--fg-muted);">Regla</th><th class="text-left px-4 py-2 font-semibold" style="color: var(--fg-muted);">Detalle</th></tr></thead>
          <tbody>
            <tr style="border-bottom: 1px solid var(--surface-border);"><td class="px-4 py-2.5 font-medium" style="color: var(--fg-default);">Número tabular</td><td class="px-4 py-2.5" style="color: var(--fg-muted);">font-feature-settings: 'tnum' 1 para evitar saltos visuales al actualizar.</td></tr>
            <tr style="border-bottom: 1px solid var(--surface-border);"><td class="px-4 py-2.5 font-medium" style="color: var(--fg-default);">Color condicional</td><td class="px-4 py-2.5" style="color: var(--fg-muted);">Mostrar accent solo si count > 0. Si count === 0, usar var(--fg-subtle) para no alarmar.</td></tr>
            <tr><td class="px-4 py-2.5 font-medium" style="color: var(--fg-default);">Label truncado</td><td class="px-4 py-2.5" style="color: var(--fg-muted);">min-w-0 + truncate para que el label ceda espacio al número.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="flex flex-wrap gap-4 text-xs" style="color: var(--fg-muted);">
      <span>Origen: <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">TrackablesListView.vue L593-638</code></span>
    </div>
  </div>
</template>
