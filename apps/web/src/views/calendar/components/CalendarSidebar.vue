<template>
  <div class="flex min-h-0 max-h-full w-full shrink-0 flex-col self-stretch lg:w-[300px] xl:w-[320px]">
    <Button
      v-show="!isLgUp"
      type="button"
      class="w-full justify-between mb-2"
      outlined
      :aria-expanded="sidebarPanelVisible"
      :aria-controls="resolvedPanelId"
      @click="toggleMobilePanel"
    >
      <span class="font-medium">{{ t('globalCalendar.calendarSidebarMobileTitle') }}</span>
      <i :class="mobileOpen ? 'pi pi-chevron-up' : 'pi pi-chevron-down'" />
    </Button>

    <aside
      v-show="sidebarPanelVisible"
      :id="resolvedPanelId"
      class="min-h-0 max-h-full flex-1 overflow-y-auto overscroll-contain rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-4 shadow-sm space-y-4"
    >
      <div>
        <div class="flex items-center justify-between gap-2 mb-2">
          <p class="text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)] m-0">{{ t('globalCalendar.sidebarMiniTitle') }}</p>
          <Button :label="t('globalCalendar.today')" size="small" text type="button" class="!py-0 !px-2" @click="goToday" />
        </div>
        <MiniCalendar
          :model-value="modelValue"
          :kinds-by-day="eventsByDay"
          @update:model-value="onMiniCalendarPick"
        />
      </div>

      <!-- Calendario global: resumen mensual (sandbox). Expediente: rejilla KPI “hoy”. -->
      <div v-if="monthSummaryRows?.length" class="cal-sidebar__month-wrap">
        <h3 class="cal-sidebar__month-title">{{ t('globalCalendar.sidebarMonthSummaryTitle') }}</h3>
        <ul class="cal-sidebar__month-stats">
          <li v-for="row in monthSummaryRows" :key="row.key" class="cal-sidebar__month-stat">
            <i
              class="cal-sidebar__month-stat-icon text-sm shrink-0"
              :class="row.icon"
              :style="{ color: row.accent }"
              aria-hidden="true"
            />
            <span class="cal-sidebar__month-stat-label">{{ row.label }}</span>
            <span
              class="cal-sidebar__month-stat-count"
              :style="{ color: row.count > 0 ? row.accent : 'var(--fg-subtle)' }"
            >{{ row.count }}</span>
          </li>
        </ul>
      </div>
      <div v-else-if="kpis" class="grid grid-cols-3 gap-2">
        <div class="min-w-0 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-sunken)]/40 p-2">
          <div class="flex items-center gap-1.5 text-[var(--fg-muted)]">
            <i class="pi pi-briefcase shrink-0 text-sky-600 text-[0.7rem] leading-none" />
            <span class="line-clamp-2 text-[10px] font-semibold uppercase leading-tight tracking-wide">{{ t('globalCalendar.kindHearing') }}</span>
          </div>
          <p class="mt-0.5 m-0 text-lg font-semibold tabular-nums text-[var(--fg-default)]">{{ kpis.hearings }}</p>
        </div>
        <div class="min-w-0 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-sunken)]/40 p-2">
          <div class="flex items-center gap-1.5 text-[var(--fg-muted)]">
            <i class="pi pi-flag shrink-0 text-amber-600 text-[0.7rem] leading-none" />
            <span class="line-clamp-2 text-[10px] font-semibold uppercase leading-tight tracking-wide">{{ t('globalCalendar.kpiDeadlines') }}</span>
          </div>
          <p class="mt-0.5 m-0 text-lg font-semibold tabular-nums text-[var(--fg-default)]">{{ kpis.deadlinesToday }}</p>
        </div>
        <div class="min-w-0 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-sunken)]/40 p-2">
          <div class="flex items-center gap-1.5 text-[var(--fg-muted)]">
            <i class="pi pi-calendar-plus shrink-0 text-amber-700 text-[0.7rem] leading-none" />
            <span class="line-clamp-2 text-[10px] font-semibold uppercase leading-tight tracking-wide">{{ t('globalCalendar.kpiDeadlinesNextDays') }}</span>
          </div>
          <p class="mt-0.5 m-0 text-lg font-semibold tabular-nums text-[var(--fg-default)]">{{ kpis.deadlinesNext3 }}</p>
        </div>
      </div>

      <div
        v-if="sidebarFiltersVisible"
        class="cal-sidebar-filters border-t border-[var(--surface-border)] pt-2"
      >
        <p class="cal-sidebar-filters__title">{{ t('globalCalendar.filtersTitle') }}</p>
        <div class="cal-sidebar-filters__stack">
          <MultiSelect
            :model-value="calStore.filters.kinds"
            :options="kindOptions"
            option-label="label"
            option-value="value"
            :placeholder="t('globalCalendar.filterKinds')"
            display="chip"
            class="cal-sidebar-ms w-full"
            filter
            append-to="body"
            @update:model-value="calStore.setFilters({ kinds: $event })"
          />
          <MultiSelect
            :model-value="calStore.filters.priorities"
            :options="priorityOptions"
            option-label="label"
            option-value="value"
            :placeholder="t('globalCalendar.filterPriority')"
            display="chip"
            class="cal-sidebar-ms w-full"
            append-to="body"
            @update:model-value="calStore.setFilters({ priorities: $event })"
          />
          <MultiSelect
            v-if="showAssigneeFilter"
            :model-value="calStore.filters.assignees"
            :options="userOptions"
            option-label="label"
            option-value="value"
            :placeholder="t('globalCalendar.filterAssignee')"
            display="chip"
            class="cal-sidebar-ms w-full"
            filter
            append-to="body"
            @update:model-value="calStore.setFilters({ assignees: $event })"
          />
          <MultiSelect
            v-if="trackableOptions.length > 0"
            :model-value="calStore.filters.trackables"
            :options="trackableOptions"
            option-label="label"
            option-value="value"
            :placeholder="t('globalCalendar.filterMatter')"
            display="chip"
            class="cal-sidebar-ms w-full"
            filter
            append-to="body"
            @update:model-value="calStore.setFilters({ trackables: $event })"
          />
          <Button
            :label="t('globalCalendar.filterReset')"
            icon="pi pi-filter-slash"
            size="small"
            text
            type="button"
            class="cal-sidebar-filters__reset"
            @click="calStore.resetFilters()"
          />
        </div>
      </div>

      <div class="cal-sidebar-legend-wrap">
        <p class="text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)] m-0 mb-2">{{ t('globalCalendar.legendTitle') }}</p>
        <CalendarUrgencyLegend compact class="cal-sidebar-legend-urgency" />
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import MultiSelect from 'primevue/multiselect';
import { useCalendarStore } from '@/stores/calendar.store';
import type { CalendarFilterKind } from '@/composables/calendarEventKind';
import { useCalendarFilterMultiselectOptions } from '@/composables/useCalendarFilterMultiselectOptions';
import MiniCalendar from '@/sandbox/recipes/CalendarRedesign/patterns/MiniCalendar.vue';
import CalendarUrgencyLegend from './CalendarUrgencyLegend.vue';

type MonthSummaryRow = {
  key: string;
  label: string;
  icon: string;
  count: number;
  accent: string;
};

const props = defineProps<{
  modelValue: Date;
  /** Vista expediente / legacy: KPI del día. */
  kpis: { hearings: number; deadlinesToday: number; deadlinesNext3: number } | null;
  /** Calendario global: filas tipo sandbox (mes visible según filtros). */
  monthSummaryRows?: MonthSummaryRow[] | null;
  eventsByDay: Record<string, CalendarFilterKind[]>;
  trackableOptions: Array<{ label: string; value: string }>;
  userOptions: Array<{ label: string; value: string }>;
  showAssigneeFilter: boolean;
  /** When false, filters live elsewhere (e.g. global calendar toolbar). */
  showSidebarFilters?: boolean;
  /** Stable id for a11y when multiple sidebars exist (e.g. global vs expediente). */
  panelId?: string;
}>();

const sidebarFiltersVisible = computed(() => props.showSidebarFilters !== false);

const resolvedPanelId = computed(() => props.panelId ?? 'global-calendar-sidebar-panel');

const emit = defineEmits<{
  (e: 'update:modelValue', v: Date): void;
  (e: 'select-date', v: Date): void;
}>();

const { t } = useI18n();
const calStore = useCalendarStore();
const { kindOptions, priorityOptions } = useCalendarFilterMultiselectOptions();

/** Panel colapsado por debajo de `lg` (1024px) hasta que el usuario despliega. */
const mobileOpen = ref(false);

const isLgUp = ref(globalThis.window === undefined ? false : globalThis.window.matchMedia('(min-width: 1024px)').matches);

const sidebarPanelVisible = computed(() => isLgUp.value || mobileOpen.value);

function toggleMobilePanel() {
  mobileOpen.value = !mobileOpen.value;
}

let removeMqListener: (() => void) | undefined;

onMounted(() => {
  const mq = globalThis.matchMedia('(min-width: 1024px)');
  isLgUp.value = mq.matches;
  const onChange = () => {
    isLgUp.value = mq.matches;
  };
  mq.addEventListener('change', onChange);
  removeMqListener = () => mq.removeEventListener('change', onChange);
});

onUnmounted(() => {
  removeMqListener?.();
});

function onMiniCalendarPick(d: Date) {
  emit('update:modelValue', d);
  emit('select-date', d);
}

function goToday() {
  const d = new Date();
  onMiniCalendarPick(d);
}
</script>

<style scoped>
/* Leyenda: filas (sandbox) + chips en columna estrecha. */
.cal-sidebar-legend-wrap {
  min-width: 0;
}
/* Resumen mensual (alineado a CalendarRedesignSandbox — activity-stat compacto). */
.cal-sidebar__month-wrap {
  border: 1px solid var(--surface-border);
  background: var(--surface-raised);
  border-radius: 8px;
  padding: 12px 12px 10px;
}
.cal-sidebar__month-title {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--fg-subtle);
}
.cal-sidebar__month-stats {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cal-sidebar__month-stat {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.cal-sidebar__month-stat-label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  line-height: 1.35;
  color: var(--fg-muted);
}
.cal-sidebar__month-stat-count {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

/* Filtros: stack denso + MultiSelect más bajo (sidebar estrecha). */
.cal-sidebar-filters__title {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--fg-subtle);
}
.cal-sidebar-filters__stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cal-sidebar-filters__reset.cal-sidebar-filters__reset {
  align-self: flex-start;
  margin-top: 1px;
  min-height: 1.75rem;
  padding-block: 0.1rem;
  padding-inline: 0.35rem;
  font-size: 11px;
  gap: 0.35rem;
}
.cal-sidebar-filters__reset :deep(.p-button-icon) {
  font-size: 0.65rem;
}

.cal-sidebar-ms :deep(.p-multiselect) {
  min-height: 2rem;
}
.cal-sidebar-ms :deep(.p-multiselect-label-container) {
  padding-block: 0.12rem;
  padding-inline: 0.3rem 0.15rem;
}
.cal-sidebar-ms :deep(.p-multiselect-label) {
  padding: 0;
  gap: 0.2rem;
  font-size: 0.7rem;
  line-height: 1.25;
}
.cal-sidebar-ms :deep(.p-multiselect-token),
.cal-sidebar-ms :deep(.p-chip) {
  padding-block: 0.05rem;
  padding-inline: 0.28rem;
  font-size: 0.65rem;
  border-radius: 3px;
}
.cal-sidebar-ms :deep(.p-chip-label) {
  line-height: 1.2;
}
.cal-sidebar-ms :deep(.p-multiselect-dropdown) {
  width: 1.85rem;
}
.cal-sidebar-ms :deep(.p-multiselect-dropdown .p-icon) {
  width: 0.75rem;
  height: 0.75rem;
}
</style>
