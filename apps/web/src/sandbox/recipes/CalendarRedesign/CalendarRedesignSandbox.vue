<script setup lang="ts">
import { computed, ref } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import CalendarFilterTrigger from '@/views/calendar/components/CalendarFilterTrigger.vue';
import CalendarProductFrameHeading from '@/views/calendar/components/CalendarProductFrameHeading.vue';
import CalendarScopeSelect from '@/views/calendar/components/CalendarScopeSelect.vue';
import CalendarToolbarSearch from '@/views/calendar/components/CalendarToolbarSearch.vue';
import CalendarUrgencyLegend from '@/views/calendar/components/CalendarUrgencyLegend.vue';
import CalendarViewSelect from '@/views/calendar/components/CalendarViewSelect.vue';
import {
  buildActuaciones,
  buildSinoePendientes,
  EXPEDIENTES,
  findExpediente,
  type Actuacion,
  type Expediente,
} from './mocks';
import { fmtFechaLarga } from './urgency';
import HoyView from './views/HoyView.vue';
import SemanaView from './views/SemanaView.vue';
import MesView from './views/MesView.vue';
import ExpedienteView from './views/ExpedienteView.vue';
import MiniCalendar from './patterns/MiniCalendar.vue';
import ExampleFrame from '../../_shared/ExampleFrame.vue';

type ViewMode = 'hoy' | 'semana' | 'mes' | 'expediente';
type Scope = 'mine' | 'team';

const today = new Date(2026, 3, 27);
today.setHours(0, 0, 0, 0);

const navDate = ref(new Date(today));
const view = ref<ViewMode>('hoy');
const scope = ref<Scope>('team');
const search = ref('');
const activeToolbarFilters = ref<string[]>([]);
const miUsuarioId = 'u-edgar';

const allActuaciones = ref<Actuacion[]>(buildActuaciones(today));
const sinoe = ref(buildSinoePendientes(today));

const filteredActuaciones = computed(() => {
  let list = allActuaciones.value;
  if (scope.value === 'mine') {
    list = list.filter((a) => a.asignadoId === miUsuarioId);
  }
  const q = search.value.trim().toLowerCase();
  if (q) {
    list = list.filter((a) => {
      const exp = findExpediente(a.expedienteId);
      const haystack = [
        a.titulo,
        exp?.numero,
        exp?.caratula,
        exp?.cliente,
        exp?.organo,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }
  return list;
});

const scopeOptions = [
  { label: 'Mi agenda', value: 'mine' as Scope },
  { label: 'Despacho', value: 'team' as Scope },
];

const viewOptions = [
  { label: 'Hoy', value: 'hoy' as ViewMode, icon: '' },
  { label: 'Semana', value: 'semana' as ViewMode, icon: 'pi pi-calendar' },
  { label: 'Mes', value: 'mes' as ViewMode, icon: 'pi pi-th-large' },
  { label: 'Por expediente', value: 'expediente' as ViewMode, icon: 'pi pi-folder' },
];

const toolbarFilters = [
  { key: 'kinds', label: 'Tipos', icon: 'pi pi-th-large' },
  { key: 'priority', label: 'Prioridad', icon: 'pi pi-flag' },
  { key: 'assignee', label: 'Asignado', icon: 'pi pi-user-plus' },
];

function navPrev() {
  const d = new Date(navDate.value);
  if (view.value === 'mes') d.setMonth(d.getMonth() - 1);
  else if (view.value === 'semana') d.setDate(d.getDate() - 7);
  else d.setDate(d.getDate() - 1);
  navDate.value = d;
}
function navNext() {
  const d = new Date(navDate.value);
  if (view.value === 'mes') d.setMonth(d.getMonth() + 1);
  else if (view.value === 'semana') d.setDate(d.getDate() + 7);
  else d.setDate(d.getDate() + 1);
  navDate.value = d;
}
function navToday() {
  navDate.value = new Date(today);
}

/** Activity-stat compact (alega-bespoke-patterns F4): icon · label · tabular count */
const monthSummaryStats = computed(() => {
  const acts = filteredActuaciones.value;
  return [
    {
      key: 'audiencias',
      label: 'Audiencias',
      icon: 'pi pi-calendar',
      count: acts.filter((a) => a.tipo === 'audiencia' || a.tipo === 'diligencia').length,
      accent: '#0e7490',
    },
    {
      key: 'plazos',
      label: 'Plazos',
      icon: 'pi pi-flag',
      count: acts.filter((a) => a.tipo === 'plazo').length,
      accent: '#d97706',
    },
    {
      key: 'sinoe',
      label: 'SINOE sin revisar',
      icon: 'pi pi-inbox',
      count: sinoe.value.length,
      accent: '#dc2626',
    },
    {
      key: 'sin-asignar',
      label: 'Sin asignar',
      icon: 'pi pi-user-plus',
      count: acts.filter((a) => !a.asignadoId).length,
      accent: 'var(--fg-muted)',
    },
  ];
});

const rangeTitle = computed(() => {
  if (view.value === 'mes') {
    return navDate.value
      .toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
      .replace(/^\w/, (c) => c.toUpperCase());
  }
  if (view.value === 'semana') {
    const d = new Date(navDate.value);
    const dow = (d.getDay() + 6) % 7;
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    return `${monday.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })} – ${sunday.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }
  if (view.value === 'expediente') {
    return `${EXPEDIENTES.length} expedientes activos`;
  }
  return fmtFechaLarga(navDate.value).replace(/^\w/, (c) => c.toUpperCase());
});

const navDayOfMonth = computed(() => navDate.value.getDate());

const frameTitle = computed(() => {
  if (view.value === 'hoy') return rangeTitle.value;
  if (view.value === 'semana') return 'Semana';
  if (view.value === 'mes') return rangeTitle.value;
  return 'Por expediente';
});

const frameSubtitle = computed(() => {
  if (view.value === 'hoy') return scope.value === 'mine' ? 'Mi agenda del día' : 'Agenda del despacho';
  if (view.value === 'semana') return rangeTitle.value;
  if (view.value === 'mes') return 'Resumen mensual con plazos, audiencias y feriados';
  return rangeTitle.value;
});

function toggleToolbarFilter(key: string) {
  const next = new Set(activeToolbarFilters.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  activeToolbarFilters.value = Array.from(next);
}

// Selection events
const drawerOpen = ref(false);
const selected = ref<Actuacion | null>(null);
function openActuacion(a: Actuacion) {
  selected.value = a;
  drawerOpen.value = true;
}

const composerOpen = ref(false);
const composerExp = ref<Expediente | null>(null);
function openComposer(exp?: Expediente) {
  composerExp.value = exp ?? null;
  composerOpen.value = true;
}

function selectDay(d: Date) {
  navDate.value = d;
  view.value = 'hoy';
}
</script>

<template>
  <div class="cal-redesign">
    <header class="cal-redesign__intro">
      <p class="cal-redesign__eyebrow">Recetas / Calendario</p>
      <h1 class="cal-redesign__title">Calendario rediseñado — sandbox</h1>
      <p class="cal-redesign__lead">
        Composición completa de la propuesta: <strong>Hoy</strong> (briefing apilado),
        <strong>Semana</strong>, <strong>Mes</strong> y <strong>Por expediente</strong>.
        Todos los elementos consumen <code>alega-tokens</code> + tipografía Inter, mapean
        feriados PE 2026 y respetan homonimia (<code>Alejandra V.</code> /
        <code>Alejandra R.</code>).
      </p>
    </header>

    <div class="cal-redesign__shell">
      <aside class="cal-redesign__sidebar">
        <MiniCalendar v-model="navDate" :actuaciones="filteredActuaciones" />
        <div class="cal-redesign__sb-section">
          <h3 class="cal-redesign__sb-title">Resumen del mes</h3>
          <ul class="cal-redesign__sb-stats">
            <li
              v-for="row in monthSummaryStats"
              :key="row.key"
              class="cal-redesign__sb-stat"
            >
              <i
                class="cal-redesign__sb-stat-icon text-sm shrink-0"
                :class="row.icon"
                :style="{ color: row.accent }"
                aria-hidden="true"
              />
              <span class="cal-redesign__sb-stat-label">{{ row.label }}</span>
              <span
                class="cal-redesign__sb-stat-count"
                :style="{
                  color: row.count > 0 ? row.accent : 'var(--fg-subtle)',
                  fontFeatureSettings: '\'tnum\' 1',
                }"
              >{{ row.count }}</span>
            </li>
          </ul>
        </div>
        <div class="cal-redesign__sb-section">
          <h3 class="cal-redesign__sb-title">Leyenda</h3>
          <CalendarUrgencyLegend />
        </div>
      </aside>

      <main class="cal-redesign__main">
        <div class="cal-redesign__toolbar">
          <div class="cal-redesign__toolbar-primary">
            <div class="cal-redesign__toolbar-primary-tail">
              <div class="cal-redesign__toolbar-quick" role="toolbar" aria-label="Selector de calendario">
                <div class="cal-redesign__toolbar-quick-end">
                  <CalendarViewSelect
                    :model-value="view"
                    :options="viewOptions"
                    :day-of-month="navDayOfMonth"
                    class="cal-redesign__views"
                    a11y-label="Vista del calendario"
                    @update:model-value="(v) => (view = v as ViewMode)"
                  />
                </div>
                <span class="cal-redesign__toolbar-quick-sep" aria-hidden="true" />
                <div class="cal-redesign__toolbar-quick-start">
                  <CalendarScopeSelect
                    :model-value="scope"
                    :options="scopeOptions"
                    class="cal-redesign__scope"
                    a11y-label="Ámbito"
                    @update:model-value="(v) => (scope = v as Scope)"
                  />
                </div>
              </div>
            </div>
          </div>
          <div class="cal-redesign__toolbar-actions">
            <CalendarToolbarSearch
              v-model="search"
              class="cal-redesign__search-field"
              placeholder="Buscar plazo, expediente, cliente…"
              a11y-label="Buscar en el calendario"
              name="cal-redesign-search"
            />
            <div class="cal-redesign__toolbar-filters-inline">
              <div class="cal-toolbar-filters" aria-label="Filtros compactos">
                <CalendarFilterTrigger
                  v-for="filter in toolbarFilters"
                  :key="filter.key"
                  :a11y-label="filter.label"
                  :label="filter.label"
                  :icon="filter.icon"
                  :active="activeToolbarFilters.includes(filter.key)"
                  @toggle="toggleToolbarFilter(filter.key)"
                />
                <button
                  v-if="activeToolbarFilters.length"
                  type="button"
                  class="cal-toolbar-filters__reset"
                  @click="activeToolbarFilters = []"
                >
                  <i class="pi pi-filter-slash" aria-hidden="true" />
                  Limpiar
                </button>
              </div>
            </div>
            <Button
              icon="pi pi-plus"
              label="Agregar actividad"
              size="small"
              outlined
              severity="secondary"
              class="cal-redesign__add-btn cal-redesign__toolbar-add"
              aria-label="Agregar actividad"
              @click="openComposer()"
            />
          </div>
        </div>

        <ExampleFrame v-if="view === 'hoy'">
          <template #heading>
            <CalendarProductFrameHeading
              :primary="frameTitle"
              :secondary="frameSubtitle"
              nav-prev-label="Anterior"
              nav-next-label="Siguiente"
              @prev="navPrev"
              @next="navNext"
            />
          </template>
          <HoyView
            :date="navDate"
            :scope="scope"
            :actuaciones="allActuaciones"
            :sinoe="sinoe"
            :mi-usuario-id="miUsuarioId"
            @open="openActuacion"
            @select-day="selectDay"
          />
        </ExampleFrame>

        <ExampleFrame v-else-if="view === 'semana'">
          <template #heading>
            <CalendarProductFrameHeading
              :primary="frameTitle"
              :secondary="frameSubtitle"
              nav-prev-label="Anterior"
              nav-next-label="Siguiente"
              @prev="navPrev"
              @next="navNext"
            />
          </template>
          <SemanaView :start-date="navDate" :actuaciones="filteredActuaciones" @select="openActuacion" />
        </ExampleFrame>

        <ExampleFrame v-else-if="view === 'mes'">
          <template #heading>
            <CalendarProductFrameHeading
              :primary="frameTitle"
              :secondary="frameSubtitle"
              nav-prev-label="Anterior"
              nav-next-label="Siguiente"
              @prev="navPrev"
              @next="navNext"
            />
          </template>
          <MesView :month-date="navDate" :actuaciones="filteredActuaciones" @select-day="selectDay" />
        </ExampleFrame>

        <ExampleFrame v-else>
          <template #heading>
            <CalendarProductFrameHeading
              :primary="frameTitle"
              :secondary="frameSubtitle"
              nav-prev-label="Anterior"
              nav-next-label="Siguiente"
              @prev="navPrev"
              @next="navNext"
            />
          </template>
          <ExpedienteView :actuaciones="filteredActuaciones" @open="openActuacion" @add="openComposer" />
        </ExampleFrame>
      </main>
    </div>

    <Dialog
      v-model:visible="drawerOpen"
      modal
      :header="selected?.titulo ?? 'Actuación'"
      :style="{ width: 'min(540px, 95vw)' }"
    >
      <div v-if="selected" class="cal-redesign__detail">
        <p class="cal-redesign__detail-row">
          <strong>Expediente:</strong>
          {{ findExpediente(selected.expedienteId)?.numero }} · {{ findExpediente(selected.expedienteId)?.caratula }}
        </p>
        <p class="cal-redesign__detail-row">
          <strong>Tipo:</strong> {{ selected.tipo }}
        </p>
        <p class="cal-redesign__detail-row">
          <strong>Fecha:</strong> {{ new Date(selected.fechaIso).toLocaleString('es-PE') }}
        </p>
        <p class="cal-redesign__detail-row">
          <strong>Estado:</strong> {{ selected.estado }} · prioridad {{ selected.prioridad }}
        </p>
        <p class="cal-redesign__detail-row">
          <strong>Origen:</strong> {{ selected.origen }}
        </p>
        <p class="cal-redesign__detail-foot">
          Mock visual · sandbox sin API. En producción este detalle abre <code>EventDetailsDrawer</code>.
        </p>
      </div>
    </Dialog>

    <Dialog
      v-model:visible="composerOpen"
      modal
      header="Agregar actividad (placeholder)"
      :style="{ width: 'min(520px, 95vw)' }"
    >
      <p class="cal-redesign__detail-row">
        Este modal se conectará al patrón <code>alega-form-dialog</code> en la integración real
        (cómputo automático de plazos desde notificación SINOE, validación de feriados,
        etc.).
      </p>
      <p v-if="composerExp" class="cal-redesign__detail-row">
        Expediente preseleccionado: <strong>{{ composerExp.numero }}</strong> ·
        {{ composerExp.caratula }}
      </p>
    </Dialog>
  </div>
</template>

<style scoped>
.cal-redesign {
  display: flex;
  flex-direction: column;
  gap: 18px;
  container-type: inline-size;
  container-name: cal-redesign;
}
.cal-redesign__eyebrow {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--fg-subtle);
}
.cal-redesign__title {
  margin: 4px 0 0;
  font-size: 22px;
  font-weight: 600;
  color: var(--fg-default);
  letter-spacing: -0.01em;
}
.cal-redesign__lead {
  margin: 6px 0 0;
  font-size: 14px;
  color: var(--fg-muted);
}

.cal-redesign__shell {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.cal-redesign__sidebar {
  display: flex;
  flex-direction: column;
  gap: 14px;
  position: sticky;
  top: 12px;
}
.cal-redesign__sb-section {
  border: 1px solid var(--surface-border);
  background: var(--surface-raised);
  border-radius: 8px;
  padding: 12px 12px 10px;
}
.cal-redesign__sb-title {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--fg-subtle);
}
/* Compact activity-stat rows (sandbox ActivityStat variant “sin fondo de row”). */
.cal-redesign__sb-stats {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cal-redesign__sb-stat {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.cal-redesign__sb-stat-label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  line-height: 1.35;
  color: var(--fg-muted);
}
.cal-redesign__sb-stat-count {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.cal-redesign__main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
/* Product command bar: vistas y alcance arriba; búsqueda/filtros/CTA abajo. */
.cal-redesign__toolbar {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0;
  padding: 0;
  border-radius: 10px;
  border: 1px solid var(--surface-border);
  background: var(--surface-raised);
  overflow: hidden;
}
.cal-redesign__toolbar-primary {
  display: flex;
  flex-flow: row nowrap;
  align-items: stretch;
  justify-content: flex-start;
  gap: 0;
  width: 100%;
  min-width: 0;
  min-height: 2.75rem;
  border-bottom: 1px solid var(--surface-border);
  background: color-mix(in srgb, var(--surface-sunken) 88%, var(--surface-raised));
}
.cal-redesign__toolbar-primary-tail {
  flex: 1 1 0%;
  min-width: 0;
  display: flex;
  align-items: stretch;
}
.cal-redesign__toolbar-quick {
  display: flex;
  flex-flow: row nowrap;
  align-items: stretch;
  justify-content: flex-start;
  gap: 0;
  width: 100%;
  min-width: 0;
  min-height: 2.75rem;
}
.cal-redesign__toolbar-quick-end {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 2.75rem;
  display: flex;
  align-items: stretch;
}
.cal-redesign__toolbar-quick-start {
  flex: 0 0 auto;
  min-height: 2.75rem;
  display: flex;
  align-items: stretch;
}
.cal-redesign__toolbar-quick-sep {
  align-self: stretch;
  width: 1px;
  flex-shrink: 0;
  background: color-mix(in srgb, var(--surface-border) 92%, transparent);
}
.cal-redesign__views,
.cal-redesign__scope {
  align-self: stretch;
  display: flex;
  align-items: stretch;
}
.cal-redesign__toolbar-quick .cal-redesign__scope :deep(.p-selectbutton),
.cal-redesign__toolbar-quick .cal-redesign__views :deep(.p-selectbutton) {
  display: flex;
  align-items: stretch;
  min-height: 2.75rem;
  border: none;
  box-shadow: none;
  background: transparent;
  border-radius: 0 !important;
  flex-wrap: nowrap;
  gap: 0;
}
.cal-redesign__toolbar-quick :deep(.p-togglebutton),
.cal-redesign__toolbar-quick :deep(.p-togglebutton:first-child),
.cal-redesign__toolbar-quick :deep(.p-togglebutton:last-child) {
  align-self: stretch;
  flex: 0 0 auto;
  height: auto;
  min-height: 2.75rem;
  border-radius: 0 !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0;
}
.cal-redesign__toolbar-quick :deep(.p-togglebutton-checked) {
  background: var(--surface-raised) !important;
  color: var(--fg-default) !important;
  box-shadow: inset 0 0 0 1px var(--surface-border) !important;
}
.cal-redesign__toolbar-quick :deep(.p-togglebutton:not(.p-togglebutton-checked)) {
  background: transparent !important;
  color: var(--fg-muted) !important;
}
.cal-redesign__toolbar-quick :deep(.p-togglebutton .p-togglebutton-content),
.cal-redesign__toolbar-quick :deep(.p-togglebutton-checked .p-togglebutton-content) {
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  color: inherit !important;
}
.cal-redesign__toolbar-quick :deep(.p-togglebutton-content) {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 2.75rem;
  width: 100%;
  padding-block: 0;
  padding-inline: 0.6rem 0.7rem;
}
.cal-redesign__toolbar-actions {
  display: grid;
  grid-template-columns: minmax(140px, min(22rem, 360px)) minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 12px;
  row-gap: 10px;
  width: 100%;
  min-width: 0;
  min-height: 2.75rem;
  padding: 6px 12px 8px;
  background: var(--surface-raised);
}
.cal-redesign__search-field {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  display: flex;
  align-items: center;
}
.cal-redesign__search-field :deep(.p-inputtext) {
  line-height: 1.25;
}
.cal-redesign__search {
  width: 100%;
  min-width: 0;
}
.cal-redesign__views {
  flex: 0 0 auto;
  min-width: 0;
}
.cal-redesign__view-opt {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
}
.cal-redesign__view-dayball {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  min-width: 1.25rem;
  border-radius: 9999px;
  font-size: 8.5px;
  font-weight: 700;
  font-feature-settings: 'tnum' 1;
  line-height: 1;
  border: 1.5px solid color-mix(in srgb, currentColor 55%, transparent);
  color: inherit;
}
.cal-redesign__views :deep(.p-togglebutton-checked) .cal-redesign__view-dayball {
  background: color-mix(in srgb, var(--brand-zafiro, var(--accent)) 14%, var(--surface-raised));
  color: var(--brand-zafiro, var(--accent));
  border-color: color-mix(in srgb, var(--brand-zafiro, var(--accent)) 40%, var(--surface-border));
}
.cal-redesign__toolbar-filters-inline {
  min-width: 0;
  max-width: 100%;
  display: flex;
  align-items: center;
  overflow-x: hidden;
  overflow-y: visible;
}
.cal-toolbar-filters {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
}
.cal-toolbar-filters__reset {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  height: 2rem;
  padding-inline: 0.55rem;
  border-radius: 9999px;
  border: 1px solid color-mix(in srgb, var(--brand-zafiro, var(--accent)) 42%, var(--surface-border));
  background: color-mix(in srgb, var(--brand-zafiro, var(--accent)) 12%, var(--surface-raised));
  color: var(--brand-zafiro, var(--accent));
  font: inherit;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
}
.cal-redesign__add-btn.cal-redesign__add-btn {
  gap: 0.3rem;
  padding-block: 0.2rem;
  padding-inline: 0.4rem 0.5rem;
  font-size: 11px;
  min-height: 28px;
}
.cal-redesign__add-btn :deep(.p-button-icon) {
  font-size: 0.75rem;
}
.cal-redesign__add-btn :deep(.p-button-label) {
  font-weight: 600;
}
.cal-redesign__toolbar-add {
  justify-self: end;
  width: max-content;
}

.cal-redesign__detail-row {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--fg-default);
}
.cal-redesign__detail-row strong { color: var(--fg-muted); margin-right: 6px; font-weight: 600; }
.cal-redesign__detail-foot {
  margin: 14px 0 0;
  font-size: 11px;
  color: var(--fg-subtle);
  font-style: italic;
}

/* After base rules so narrow overrides win (sticky + fixed search width). */
@container cal-redesign (max-width: 720px) {
  .cal-redesign__shell {
    grid-template-columns: 1fr;
  }
  .cal-redesign__sidebar {
    position: static;
  }
  .cal-redesign__toolbar-primary {
    flex-direction: column;
    min-height: 0;
  }
  .cal-redesign__toolbar-primary-tail {
    width: 100%;
  }
  .cal-redesign__toolbar-quick {
    flex-wrap: wrap;
    align-items: stretch;
    min-height: 0;
  }
  .cal-redesign__toolbar-quick-end {
    flex: 1 1 100%;
    width: 100%;
    min-width: 0;
    min-height: 2.75rem;
  }
  .cal-redesign__toolbar-quick-sep {
    flex-basis: 100%;
    width: 100%;
    height: 1px;
    min-height: 1px;
  }
  .cal-redesign__toolbar-quick-start {
    flex: 1 1 100%;
    width: 100%;
    min-height: 2.75rem;
    justify-content: flex-start;
  }
  .cal-redesign__toolbar-quick :deep(.p-togglebutton),
  .cal-redesign__toolbar-quick-start :deep(.p-togglebutton) {
    flex: 1 1 auto;
    min-width: 0;
    min-height: 2.5rem;
  }
  .cal-redesign__views {
    width: 100%;
    flex: 1 1 auto;
  }
  .cal-redesign__views :deep(.p-selectbutton) {
    width: 100%;
    flex-wrap: wrap;
    justify-content: stretch;
  }
  .cal-redesign__scope :deep(.p-selectbutton) {
    width: 100%;
  }
  .cal-redesign__toolbar-actions {
    grid-template-columns: 1fr;
  }
  .cal-redesign__search-field {
    max-width: none;
    min-width: 0;
  }
  .cal-redesign__toolbar-add {
    justify-self: stretch;
    width: 100%;
  }
}

@media (max-width: 1100px) {
  .cal-redesign__shell {
    grid-template-columns: 1fr;
  }
  .cal-redesign__sidebar {
    position: static;
  }
  .cal-redesign__toolbar-primary {
    flex-direction: column;
    min-height: 0;
  }
  .cal-redesign__toolbar-primary-tail {
    width: 100%;
  }
  .cal-redesign__toolbar-quick {
    flex-wrap: wrap;
    align-items: stretch;
    min-height: 0;
  }
  .cal-redesign__toolbar-quick-end {
    flex: 1 1 100%;
    width: 100%;
    min-width: 0;
    min-height: 2.75rem;
  }
  .cal-redesign__toolbar-quick-sep {
    flex-basis: 100%;
    width: 100%;
    height: 1px;
    min-height: 1px;
  }
  .cal-redesign__toolbar-quick-start {
    flex: 1 1 100%;
    width: 100%;
    min-height: 2.75rem;
    justify-content: flex-start;
  }
  .cal-redesign__toolbar-quick :deep(.p-togglebutton),
  .cal-redesign__toolbar-quick-start :deep(.p-togglebutton) {
    flex: 1 1 auto;
    min-width: 0;
    min-height: 2.5rem;
  }
  .cal-redesign__views {
    width: 100%;
    flex: 1 1 auto;
  }
  .cal-redesign__views :deep(.p-selectbutton) {
    width: 100%;
    flex-wrap: wrap;
    justify-content: stretch;
  }
  .cal-redesign__scope :deep(.p-selectbutton) {
    width: 100%;
  }
  .cal-redesign__toolbar-actions {
    grid-template-columns: 1fr;
  }
  .cal-redesign__search-field {
    max-width: none;
    min-width: 0;
  }
  .cal-redesign__toolbar-add {
    justify-self: stretch;
    width: 100%;
  }
}
</style>
