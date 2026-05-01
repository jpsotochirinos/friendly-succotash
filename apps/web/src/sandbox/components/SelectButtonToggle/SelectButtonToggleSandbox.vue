<script setup lang="ts">
import { ref } from 'vue';
import SelectButton from 'primevue/selectbutton';
import ToggleButton from 'primevue/togglebutton';
import ExampleFrame from '../../_shared/ExampleFrame.vue';
import CalendarScopeSelect from '@/views/calendar/components/CalendarScopeSelect.vue';
import CalendarViewSelect from '@/views/calendar/components/CalendarViewSelect.vue';

const density = ref<'comfortable' | 'compact'>('comfortable');
const densityOptions = [
  { label: 'Cómodo', value: 'comfortable' },
  { label: 'Compacto', value: 'compact' },
];

const createMode = ref<'template' | 'free'>('template');
const createModeOptions = [
  { label: 'Desde plantilla', value: 'template' },
  { label: 'Personalizado', value: 'free' },
];

const scope = ref('active');
const scopeOptions = [
  { label: 'Activos', value: 'active' },
  { label: 'Archivados', value: 'archived' },
  { label: 'Papelera', value: 'trash' },
];

const toolbarView = ref<'hoy' | 'semana' | 'mes' | 'expediente'>('hoy');
const toolbarViewOptions = [
  { label: 'Hoy', value: 'hoy', icon: '' },
  { label: 'Semana', value: 'semana', icon: 'pi pi-calendar' },
  { label: 'Mes', value: 'mes', icon: 'pi pi-th-large' },
  { label: 'Por expediente', value: 'expediente', icon: 'pi pi-folder' },
];
const toolbarScope = ref<'mine' | 'team'>('mine');
const toolbarScopeOptions = [
  { label: 'Mi agenda', value: 'mine' },
  { label: 'Despacho', value: 'team' },
];

const starred = ref(false);
const pinned = ref(false);
const notifEnabled = ref(true);

const codeSelectButton = `<!-- Density toggle (TrackablesCockpit) -->
<SelectButton
  v-model="density"
  :options="densityOptions"
  option-label="label"
  option-value="value"
  :allow-empty="false"
  size="small"
/>

<!-- Modo de creación (dialog wizard) -->
<SelectButton
  v-model="createMode"
  :options="createModeOptions"
  option-label="label"
  option-value="value"
  :allow-empty="false"
/>`;

const codeToggle = `<!-- ToggleButton starred -->
<ToggleButton
  v-model="starred"
  on-label="Destacado"
  off-label="Destacar"
  on-icon="pi pi-star-fill"
  off-icon="pi pi-star"
/>`;

const codeCalendarSelects = `<!-- SelectButton edge-to-edge para toolbar -->
<CalendarViewSelect
  v-model="view"
  :options="viewOptions"
  :day-of-month="29"
  a11y-label="Vista"
/>

<CalendarScopeSelect
  v-model="scope"
  :options="scopeOptions"
  a11y-label="Ámbito"
/>`;

const antiPatterns = [
  { bad: 'SelectButton con > 4 opciones', good: 'Más de 4 opciones → Tabs (p-tabview) o Dropdown.' },
  { bad: 'SelectButton sin :allow-empty="false"', good: ':allow-empty="false" para que siempre haya una opción seleccionada.' },
  { bad: 'ToggleButton con texto > 12 caracteres', good: 'Labels cortos o solo icono. Para texto largo usar Checkbox + label.' },
  { bad: 'SelectButton sin label (solo íconos)', good: 'Siempre label de texto o al menos aria-label en cada opción.' },
];
</script>

<template>
  <div class="flex flex-col gap-10">
    <div>
      <p class="text-xs font-semibold uppercase tracking-widest mb-1" style="color: var(--fg-subtle);">Componentes / SelectButton · ToggleButton</p>
      <h1 class="text-2xl font-semibold m-0" style="color: var(--fg-default);">SelectButton & ToggleButton</h1>
      <p class="text-sm mt-1 m-0" style="color: var(--fg-muted);">SelectButton para 2-4 opciones excluyentes (densidad, scope, modo). ToggleButton para estados binarios visuales (destacar, fijar).</p>
    </div>

    <!-- Density toggle (uso real) -->
    <ExampleFrame title="SelectButton — density toggle (TrackablesCockpit)" description="small + :allow-empty=false. Sin label superpuesto." :code="codeSelectButton">
      <div class="flex items-center gap-4">
        <SelectButton v-model="density" :options="densityOptions" option-label="label" option-value="value" :allow-empty="false" size="small" />
        <span class="text-sm" style="color: var(--fg-muted);">Vista actual: <strong style="color: var(--fg-default);">{{ density === 'comfortable' ? 'Cómoda' : 'Compacta' }}</strong></span>
      </div>
    </ExampleFrame>

    <!-- Modo de creación -->
    <ExampleFrame title="SelectButton — modo de creación (dialog wizard)" description="Patrón en paso 3 del wizard de nuevo expediente: Desde plantilla / Personalizado.">
      <div class="flex flex-col gap-3">
        <SelectButton v-model="createMode" :options="createModeOptions" option-label="label" option-value="value" :allow-empty="false" />
        <div v-if="createMode === 'template'" class="rounded-lg p-3 text-sm" style="border: 1px solid var(--surface-border); background: var(--surface-sunken); color: var(--fg-muted);">
          Muestra un selector de plantillas del sistema.
        </div>
        <div v-else class="rounded-lg p-3 text-sm" style="border: 1px solid var(--surface-border); background: var(--surface-sunken); color: var(--fg-muted);">
          Crea el expediente sin estructura predefinida.
        </div>
      </div>
    </ExampleFrame>

    <!-- Scope tabs -->
    <ExampleFrame title="SelectButton — scope tabs (Activos · Archivados · Papelera)" description="3 opciones. Mismo patrón de tabs en TrackablesListView y Cockpit.">
      <SelectButton v-model="scope" :options="scopeOptions" option-label="label" option-value="value" :allow-empty="false" />
    </ExampleFrame>

    <!-- Toolbar selects -->
    <ExampleFrame
      title="SelectButton pattern — toolbar edge-to-edge"
      description="Componentes reutilizables para barras de herramientas: vista con dayball y scope segmentado. No son exclusivos del calendario."
      :code="codeCalendarSelects"
    >
      <div class="overflow-hidden rounded-xl border border-[var(--surface-border)]">
        <div class="flex min-h-11 items-stretch bg-[color-mix(in_srgb,var(--surface-sunken)_88%,var(--surface-raised))]">
          <div class="min-w-0 flex-1">
            <CalendarViewSelect
              v-model="toolbarView"
              :options="toolbarViewOptions"
              :day-of-month="29"
              a11y-label="Vista"
            />
          </div>
          <span class="w-px bg-[var(--surface-border)]" aria-hidden="true" />
          <CalendarScopeSelect
            v-model="toolbarScope"
            :options="toolbarScopeOptions"
            a11y-label="Ámbito"
          />
        </div>
      </div>
    </ExampleFrame>

    <!-- ToggleButton -->
    <ExampleFrame title="ToggleButton — acciones binarias" description="Estado visual on/off con cambio de icono y label. Para destacar, fijar, activar notificaciones." :code="codeToggle">
      <div class="flex flex-wrap gap-3 items-center">
        <ToggleButton v-model="starred" on-label="Destacado" off-label="Destacar" on-icon="pi pi-star-fill" off-icon="pi pi-star" />
        <ToggleButton v-model="pinned" on-label="Fijado" off-label="Fijar" on-icon="pi pi-thumbtack" off-icon="pi pi-thumbtack" />
        <ToggleButton v-model="notifEnabled" on-label="Notificaciones activas" off-label="Notificaciones apagadas" on-icon="pi pi-bell" off-icon="pi pi-bell-slash" />
      </div>
    </ExampleFrame>

    <!-- Anti-patterns -->
    <div class="flex flex-col gap-3">
      <h2 class="text-base font-semibold m-0" style="color: var(--fg-default);">Anti-patrones</h2>
      <div class="rounded-xl overflow-hidden" style="border: 1px solid var(--surface-border);">
        <table class="w-full text-xs">
          <thead><tr style="background: var(--surface-sunken); border-bottom: 1px solid var(--surface-border);"><th class="text-left px-4 py-2 font-semibold" style="color: var(--fg-muted);">Anti-patrón</th><th class="text-left px-4 py-2 font-semibold" style="color: var(--fg-muted);">Corrección</th></tr></thead>
          <tbody>
            <tr v-for="(row, i) in antiPatterns" :key="i" style="border-bottom: 1px solid var(--surface-border);">
              <td class="px-4 py-2.5" style="color: #dc2626;">{{ row.bad }}</td>
              <td class="px-4 py-2.5" style="color: var(--fg-default);">{{ row.good }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="flex flex-wrap gap-4 text-xs" style="color: var(--fg-muted);">
      <a href="https://primevue.org/selectbutton/" target="_blank" rel="noopener" class="flex items-center gap-1 no-underline hover:text-[var(--accent)] transition-colors" style="color: var(--fg-muted);"><i class="pi pi-external-link text-[10px]" /> SelectButton</a>
      <span>·</span>
      <a href="https://primevue.org/togglebutton/" target="_blank" rel="noopener" class="flex items-center gap-1 no-underline hover:text-[var(--accent)] transition-colors" style="color: var(--fg-muted);"><i class="pi pi-external-link text-[10px]" /> ToggleButton</a>
    </div>
  </div>
</template>
