<script setup lang="ts">
import { ref } from 'vue';
import Skeleton from 'primevue/skeleton';
import ProgressSpinner from 'primevue/progressspinner';
import ProgressBar from 'primevue/progressbar';
import Button from 'primevue/button';
import ExampleFrame from '../../_shared/ExampleFrame.vue';

const progress = ref(45);
const spinning = ref(false);

function simulateSpin() {
  spinning.value = true;
  setTimeout(() => { spinning.value = false; }, 2000);
}

const codeSkeletonRow = `<!-- Patrón de fila en TrackablesCockpitSandbox -->
<div v-for="row in 4" :key="row" class="flex items-center gap-3 px-2 py-3">
  <Skeleton width="6px" height="3.5rem" />
  <div class="flex-1 flex flex-col gap-2">
    <Skeleton height="0.95rem" width="55%" />
    <Skeleton height="0.7rem" width="35%" />
  </div>
  <Skeleton width="6rem" height="1.5rem" border-radius="999px" />
  <Skeleton shape="circle" size="2.25rem" />
</div>`;

const codeSkeletonTable = `<!-- Patrón de tabla en TrackablesListView -->
<div class="flex gap-3 px-4 py-2">
  <Skeleton v-for="col in 5" :key="col" height="0.75rem" />
</div>`;

const codeSpinner = `<!-- ProgressSpinner inline (carga de API, template selector) -->
<ProgressSpinner style="width: 22px; height: 22px" stroke-width="4" />

<!-- ProgressSpinner centrado (auth loading) -->
<div class="flex justify-center py-20">
  <ProgressSpinner />
</div>`;

const antiPatterns = [
  { bad: 'Skeleton genérico (un bloque rectangular) que no coincide con el layout final', good: 'El skeleton debe replicar la estructura real: filas, columnas, avatares, pills' },
  { bad: 'ProgressSpinner para carga < 200ms', good: 'Solo spinner si la espera es perceptible. Para < 200ms, silencio o ningún indicador.' },
  { bad: 'Skeleton en operaciones < 600ms', good: 'Skeleton solo para carga > 600ms. Para menos, usar spinner o deshabilitar el botón.' },
  { bad: 'ProgressBar indeterminate sin contexto', good: 'Acompañar con texto explicativo o usar spinner.' },
];
</script>

<template>
  <div class="flex flex-col gap-10">
    <!-- Page header -->
    <div>
      <p class="text-xs font-semibold uppercase tracking-widest mb-1" style="color: var(--fg-subtle);">
        Componentes / Loading
      </p>
      <h1 class="text-2xl font-semibold m-0" style="color: var(--fg-default);">Loading states</h1>
      <p class="text-sm mt-1 m-0" style="color: var(--fg-muted);">
        Tres primitivos para estados de carga: <strong>Skeleton</strong> (placeholder de layout), <strong>ProgressSpinner</strong> (carga de API inline o pantalla completa) y <strong>ProgressBar</strong> (progreso determinate / indeterminate).
      </p>
    </div>

    <!-- Skeleton: fila cockpit -->
    <ExampleFrame
      title="Skeleton — fila de cockpit (patrón real)"
      description="Cada skeleton replica el layout final de la fila: stripe de urgencia, texto, deadline pill y avatar."
      :code="codeSkeletonRow"
    >
      <div
        class="flex flex-col rounded-xl overflow-hidden"
        style="border: 1px solid var(--surface-border); background: var(--surface-raised);"
      >
        <div v-for="row in 4" :key="row" class="flex items-center gap-3 px-4 py-3 border-b" style="border-color: var(--surface-border);">
          <Skeleton width="6px" height="3.5rem" border-radius="4px" />
          <div class="flex-1 flex flex-col gap-2 min-w-0">
            <Skeleton height="0.95rem" :width="`${50 + row * 10}%`" />
            <Skeleton height="0.7rem" :width="`${25 + row * 7}%`" />
          </div>
          <Skeleton width="6rem" height="1.5rem" border-radius="999px" />
          <Skeleton shape="circle" size="2.25rem" />
        </div>
      </div>
    </ExampleFrame>

    <!-- Skeleton: card -->
    <ExampleFrame
      title="Skeleton — card (KPI placeholder)"
      description="Skeleton de KPI card: badge, número grande y label."
    >
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          v-for="i in 4"
          :key="i"
          class="rounded-xl p-4 flex flex-col gap-3"
          style="border: 1px solid var(--surface-border); background: var(--surface-raised);"
        >
          <Skeleton height="1.75rem" width="60%" />
          <Skeleton height="2rem" width="45%" />
          <Skeleton height="0.75rem" width="80%" />
        </div>
      </div>
    </ExampleFrame>

    <!-- Skeleton: tabla header + rows -->
    <ExampleFrame
      title="Skeleton — tabla (headers + filas)"
      description="Patrón de TrackablesListView: headers y filas replicadas."
      :code="codeSkeletonTable"
    >
      <div class="flex flex-col rounded-xl overflow-hidden" style="border: 1px solid var(--surface-border);">
        <!-- header -->
        <div class="flex gap-4 px-4 py-2 border-b" style="border-color: var(--surface-border); background: var(--surface-sunken);">
          <Skeleton v-for="col in 5" :key="`h${col}`" height="0.6rem" :width="`${10 + col * 6}%`" />
        </div>
        <!-- rows -->
        <div
          v-for="row in 5"
          :key="row"
          class="flex items-center gap-4 px-4 py-3 border-b"
          style="border-color: var(--surface-border); background: var(--surface-raised);"
        >
          <Skeleton shape="circle" size="2rem" />
          <Skeleton height="0.8rem" width="30%" />
          <Skeleton height="1.25rem" width="10%" border-radius="999px" />
          <Skeleton height="0.75rem" width="20%" />
          <Skeleton shape="circle" size="1.75rem" />
        </div>
      </div>
    </ExampleFrame>

    <!-- ProgressSpinner variantes -->
    <ExampleFrame
      title="ProgressSpinner — variantes"
      description="Inline pequeño (22px, stroke 4) para carga dentro de botón o sección. Default (40px) para pantalla completa."
      :code="codeSpinner"
    >
      <div class="flex flex-wrap items-center gap-8">
        <div class="flex flex-col items-center gap-2">
          <ProgressSpinner style="width: 22px; height: 22px;" stroke-width="4" />
          <span class="text-xs" style="color: var(--fg-subtle);">22px · stroke 4 (inline)</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <ProgressSpinner style="width: 32px; height: 32px;" stroke-width="4" />
          <span class="text-xs" style="color: var(--fg-subtle);">32px · stroke 4 (sección)</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <ProgressSpinner />
          <span class="text-xs" style="color: var(--fg-subtle);">40px default (pantalla)</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <Button label="Guardando…" :loading="spinning" size="small" @click="simulateSpin" />
          <span class="text-xs" style="color: var(--fg-subtle);">Button :loading prop</span>
        </div>
      </div>
    </ExampleFrame>

    <!-- ProgressBar -->
    <ExampleFrame
      title="ProgressBar — determinate e indeterminate"
      description="Determinate para progreso conocido (% de actuaciones completadas). Indeterminate para carga sin % estimado."
    >
      <div class="flex flex-col gap-6">
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="text-sm" style="color: var(--fg-default);">Progreso del expediente</span>
            <span class="text-sm font-semibold" style="color: var(--fg-default);">{{ progress }}%</span>
          </div>
          <ProgressBar :value="progress" style="height: 8px;" />
          <div class="flex gap-2">
            <Button label="−10" text size="small" @click="progress = Math.max(0, progress - 10)" />
            <Button label="+10" text size="small" @click="progress = Math.min(100, progress + 10)" />
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <span class="text-sm" style="color: var(--fg-default);">Cargando…</span>
          <ProgressBar mode="indeterminate" style="height: 4px;" />
        </div>

        <!-- Custom thin inline bar (cockpit-row__progress) -->
        <div class="flex flex-col gap-2">
          <span class="text-sm" style="color: var(--fg-default);">Barra inline compacta (cockpit-row)</span>
          <div
            class="flex items-center gap-3 rounded-full overflow-hidden"
            style="height: 4px; background: var(--surface-sunken);"
          >
            <div
              class="h-full rounded-full transition-all"
              style="background: var(--accent);"
              :style="{ width: `${progress}%` }"
            />
          </div>
          <span class="text-xs" style="color: var(--fg-subtle);">Custom — no usa PrimeVue ProgressBar (más control sobre height)</span>
        </div>
      </div>
    </ExampleFrame>

    <!-- Anti-patterns -->
    <div class="flex flex-col gap-3">
      <h2 class="text-base font-semibold m-0" style="color: var(--fg-default);">Anti-patrones</h2>
      <div class="rounded-xl overflow-hidden" style="border: 1px solid var(--surface-border);">
        <table class="w-full text-xs">
          <thead>
            <tr style="background: var(--surface-sunken); border-bottom: 1px solid var(--surface-border);">
              <th class="text-left px-4 py-2 font-semibold" style="color: var(--fg-muted);">Anti-patrón</th>
              <th class="text-left px-4 py-2 font-semibold" style="color: var(--fg-muted);">Corrección</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in antiPatterns" :key="i" style="border-bottom: 1px solid var(--surface-border);">
              <td class="px-4 py-2.5" style="color: #dc2626;">{{ row.bad }}</td>
              <td class="px-4 py-2.5" style="color: var(--fg-default);">{{ row.good }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Footer -->
    <div class="flex flex-wrap gap-4 text-xs" style="color: var(--fg-muted);">
      <a href="https://primevue.org/skeleton/" target="_blank" rel="noopener" class="flex items-center gap-1 no-underline hover:text-[var(--accent)] transition-colors" style="color: var(--fg-muted);">
        <i class="pi pi-external-link text-[10px]" /> Skeleton
      </a>
      <span>·</span>
      <a href="https://primevue.org/progressspinner/" target="_blank" rel="noopener" class="flex items-center gap-1 no-underline hover:text-[var(--accent)] transition-colors" style="color: var(--fg-muted);">
        <i class="pi pi-external-link text-[10px]" /> ProgressSpinner
      </a>
      <span>·</span>
      <a href="https://primevue.org/progressbar/" target="_blank" rel="noopener" class="flex items-center gap-1 no-underline hover:text-[var(--accent)] transition-colors" style="color: var(--fg-muted);">
        <i class="pi pi-external-link text-[10px]" /> ProgressBar
      </a>
    </div>
  </div>
</template>
