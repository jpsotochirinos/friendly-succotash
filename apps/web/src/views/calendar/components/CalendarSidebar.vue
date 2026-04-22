<template>
  <div class="w-full xl:w-[300px] lg:w-[272px] shrink-0">
    <Button
      v-show="!isXlUp"
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
      class="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-4 space-y-4 shadow-sm"
    >
      <div>
        <div class="flex items-center justify-between gap-2 mb-2">
          <p class="text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)] m-0">{{ t('globalCalendar.sidebarMiniTitle') }}</p>
          <Button :label="t('globalCalendar.today')" size="small" text type="button" class="!py-0 !px-2" @click="goToday" />
        </div>
        <DatePicker
          :model-value="miniDate"
          inline
          class="w-full cal-mini-picker"
          :show-other-months="true"
          @update:model-value="onMiniSelect"
        >
          <template #date="{ date }">
            <div class="relative flex h-full w-full min-h-[2.25rem] flex-col items-center justify-center gap-0.5 py-0.5">
              <span class="text-sm font-medium leading-none">{{ date.day }}</span>
              <div v-if="dotsForCell(date).length" class="flex max-w-full justify-center gap-0.5 px-0.5">
                <span
                  v-for="(dot, idx) in dotsForCell(date).slice(0, 4)"
                  :key="idx"
                  class="h-1 w-1 shrink-0 rounded-full"
                  :class="dot"
                />
              </div>
            </div>
          </template>
        </DatePicker>
      </div>

      <div v-if="kpis" class="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-1">
        <div class="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-sunken)]/40 p-3">
          <div class="flex items-center gap-2 text-[var(--fg-muted)]">
            <i class="pi pi-briefcase text-sky-600" />
            <span class="text-xs font-semibold uppercase tracking-wide">{{ t('globalCalendar.kindHearing') }}</span>
          </div>
          <p class="mt-1 text-2xl font-semibold tabular-nums text-[var(--fg-default)] m-0">{{ kpis.hearings }}</p>
        </div>
        <div class="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-sunken)]/40 p-3">
          <div class="flex items-center gap-2 text-[var(--fg-muted)]">
            <i class="pi pi-flag text-amber-600" />
            <span class="text-xs font-semibold uppercase tracking-wide">{{ t('globalCalendar.kpiDeadlines') }}</span>
          </div>
          <p class="mt-1 text-2xl font-semibold tabular-nums text-[var(--fg-default)] m-0">{{ kpis.deadlinesToday }}</p>
        </div>
        <div class="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-sunken)]/40 p-3">
          <div class="flex items-center gap-2 text-[var(--fg-muted)]">
            <i class="pi pi-calendar-plus text-amber-700" />
            <span class="text-xs font-semibold uppercase tracking-wide">{{ t('globalCalendar.kpiDeadlinesNextDays') }}</span>
          </div>
          <p class="mt-1 text-2xl font-semibold tabular-nums text-[var(--fg-default)] m-0">{{ kpis.deadlinesNext3 }}</p>
        </div>
      </div>

      <div class="space-y-2 border-t border-[var(--surface-border)] pt-3">
        <p class="text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)] m-0">{{ t('globalCalendar.filtersTitle') }}</p>
        <div class="flex flex-col gap-2">
          <MultiSelect
            :model-value="calStore.filters.kinds"
            :options="kindOptions"
            option-label="label"
            option-value="value"
            :placeholder="t('globalCalendar.filterKinds')"
            display="chip"
            class="w-full text-sm"
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
            class="w-full text-sm"
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
            class="w-full text-sm"
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
            class="w-full text-sm"
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
            class="self-start"
            @click="calStore.resetFilters()"
          />
        </div>
      </div>

      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)] m-0 mb-2">{{ t('globalCalendar.legendTitle') }}</p>
        <div class="flex flex-wrap gap-1.5">
          <span
            class="inline-flex items-center gap-1 rounded-md border border-[var(--surface-border)] bg-[var(--surface-sunken)]/30 px-2 py-0.5 text-[11px] text-[var(--fg-muted)]"
          >
            <span class="inline-block h-3 w-1 rounded-sm bg-blue-500" /> {{ t('globalCalendar.priorityNormal') }}
          </span>
          <span
            class="inline-flex items-center gap-1 rounded-md border border-[var(--surface-border)] bg-[var(--surface-sunken)]/30 px-2 py-0.5 text-[11px] text-[var(--fg-muted)]"
          >
            <span class="inline-block h-3 w-1 rounded-sm bg-orange-500" /> {{ t('globalCalendar.priorityHigh') }}
          </span>
          <span
            class="inline-flex items-center gap-1 rounded-md border border-[var(--surface-border)] bg-[var(--surface-sunken)]/30 px-2 py-0.5 text-[11px] text-[var(--fg-muted)]"
          >
            <span class="inline-block h-3 w-1 rounded-sm bg-red-500" /> {{ t('globalCalendar.priorityUrgent') }}
          </span>
          <span
            class="inline-flex items-center gap-1 rounded-md border border-[var(--surface-border)] bg-[var(--surface-sunken)]/30 px-2 py-0.5 text-[11px] text-[var(--fg-muted)]"
          >
            <span class="inline-block h-3 w-1 rounded-sm bg-pink-400" /> {{ t('globalCalendar.legendBirthday') }}
          </span>
          <span
            class="inline-flex items-center gap-1 rounded-md border border-[var(--surface-border)] bg-[var(--surface-sunken)]/30 px-2 py-0.5 text-[11px] text-[var(--fg-muted)]"
          >
            <span class="inline-block h-3 w-1 rounded-sm bg-teal-500" /> {{ t('globalCalendar.filterKindPeruHoliday') }}
          </span>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import DatePicker from 'primevue/datepicker';
import MultiSelect from 'primevue/multiselect';
import { useCalendarStore } from '@/stores/calendar.store';
import {
  kindDotClass,
  type CalendarFilterKind,
} from '@/composables/calendarEventKind';

const props = defineProps<{
  modelValue: Date;
  kpis: { hearings: number; deadlinesToday: number; deadlinesNext3: number } | null;
  eventsByDay: Record<string, CalendarFilterKind[]>;
  trackableOptions: Array<{ label: string; value: string }>;
  userOptions: Array<{ label: string; value: string }>;
  showAssigneeFilter: boolean;
  /** Stable id for a11y when multiple sidebars exist (e.g. global vs expediente). */
  panelId?: string;
}>();

const resolvedPanelId = computed(() => props.panelId ?? 'global-calendar-sidebar-panel');

const emit = defineEmits<{
  (e: 'update:modelValue', v: Date): void;
  (e: 'select-date', v: Date): void;
}>();

const { t } = useI18n();
const calStore = useCalendarStore();

const miniDate = ref(new Date(props.modelValue));
/** Panel colapsado en &lt;1280px hasta que el usuario despliega. */
const mobileOpen = ref(false);

const isXlUp = ref(typeof window !== 'undefined' ? window.matchMedia('(min-width: 1280px)').matches : false);

const sidebarPanelVisible = computed(() => isXlUp.value || mobileOpen.value);

function toggleMobilePanel() {
  mobileOpen.value = !mobileOpen.value;
}

let removeMqListener: (() => void) | undefined;

onMounted(() => {
  const mq = window.matchMedia('(min-width: 1280px)');
  isXlUp.value = mq.matches;
  const onChange = () => {
    isXlUp.value = mq.matches;
  };
  mq.addEventListener('change', onChange);
  removeMqListener = () => mq.removeEventListener('change', onChange);
});

onUnmounted(() => {
  removeMqListener?.();
});

watch(
  () => props.modelValue,
  (v) => {
    miniDate.value = new Date(v);
  },
);

function cellYmd(date: { year: number; month: number; day: number }) {
  const m = date.month + 1;
  return `${date.year}-${String(m).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
}

function dotsForCell(date: { year: number; month: number; day: number }) {
  const ymd = cellYmd(date);
  const kinds = props.eventsByDay[ymd];
  if (!kinds?.length) return [];
  const seen = new Set<CalendarFilterKind>();
  const out: string[] = [];
  for (const k of kinds) {
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(kindDotClass(k));
  }
  return out;
}

function onMiniSelect(e: Date | Date[] | (Date | null)[] | null | undefined) {
  const raw = Array.isArray(e) ? e[0] : e;
  const d = raw instanceof Date ? raw : null;
  if (!d) return;
  miniDate.value = d;
  emit('update:modelValue', d);
  emit('select-date', d);
}

function goToday() {
  const d = new Date();
  miniDate.value = d;
  onMiniSelect(d);
}

const kindOptions = computed(() =>
  (
    [
      ['hearing', 'filterKindHearing'],
      ['deadline', 'filterKindDeadline'],
      ['meeting', 'filterKindMeeting'],
      ['call', 'filterKindCall'],
      ['task', 'filterKindTask'],
      ['filing', 'filterKindFiling'],
      ['other', 'filterKindOther'],
      ['birthday', 'filterKindBirthday'],
      ['external', 'filterKindExternal'],
      ['peruHoliday', 'filterKindPeruHoliday'],
    ] as const
  ).map(([value, key]) => ({
    value: value as CalendarFilterKind,
    label: t(`globalCalendar.${key}`),
  })),
);

const priorityOptions = computed(() => [
  { label: t('globalCalendar.priorityLow'), value: 'low' },
  { label: t('globalCalendar.priorityNormal'), value: 'normal' },
  { label: t('globalCalendar.priorityHigh'), value: 'high' },
  { label: t('globalCalendar.priorityUrgent'), value: 'urgent' },
]);
</script>

<style scoped>
.cal-mini-picker :deep(.p-datepicker) {
  width: 100%;
  border: none;
  padding: 0;
  background: transparent;
}
.cal-mini-picker :deep(.p-datepicker-panel) {
  border: none;
  box-shadow: none;
  width: 100%;
}
.cal-mini-picker :deep(.p-datepicker-calendar-container) {
  width: 100%;
}
.cal-mini-picker :deep(table) {
  width: 100%;
  table-layout: fixed;
}
.cal-mini-picker :deep(.p-datepicker-header) {
  padding-left: 0;
  padding-right: 0;
}
</style>
