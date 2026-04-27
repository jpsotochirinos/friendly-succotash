<template>
  <div class="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden pb-20 md:pb-0">
    <div v-if="!authReady" class="flex justify-center py-20">
      <ProgressSpinner />
    </div>
    <template v-else-if="!canReadCalendar">
      <div class="flex flex-col items-center justify-center gap-3 py-16 text-center text-[var(--fg-muted)]">
        <i class="pi pi-lock text-4xl opacity-60" />
        <p class="m-0">{{ t('globalCalendar.noPermission') }}</p>
      </div>
    </template>
    <template v-else>
      <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden pb-4 md:pb-0">
      <PageHeader :title="t('globalCalendar.pageTitle')" :subtitle="t('globalCalendar.pageSubtitle')">
        <template #actions>
          <SelectButton
            v-model="calStore.scope"
            :options="scopeOptions"
            option-label="label"
            option-value="value"
            :allow-empty="false"
            class="text-sm"
          />
          <Button
            v-if="canCreate"
            :label="t('globalCalendar.addActivity')"
            icon="pi pi-plus"
            size="small"
            type="button"
            @click="openComposer()"
          />
        </template>
      </PageHeader>

      <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden xl:flex-row">
        <CalendarSidebar
          v-model="navDate"
          :kpis="kpiCards"
          :events-by-day="eventsByDayMap"
          :trackable-options="trackableOptions"
          :user-options="userOptions"
          :show-assignee-filter="calStore.scope === 'team' && canViewTeam"
          @select-date="onSidebarDate"
        />

        <div class="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden">
          <div class="flex shrink-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div class="flex flex-wrap items-center gap-2 min-w-0">
              <ButtonGroup class="[&_.p-button]:py-1.5">
                <Button
                  v-tooltip.bottom="t('globalCalendar.navPrev')"
                  icon="pi pi-chevron-left"
                  outlined
                  size="small"
                  type="button"
                  @click="calendarPrev"
                />
                <Button
                  v-tooltip.bottom="t('globalCalendar.navNext')"
                  icon="pi pi-chevron-right"
                  outlined
                  size="small"
                  type="button"
                  @click="calendarNext"
                />
                <Button :label="t('globalCalendar.today')" outlined size="small" type="button" @click="calendarToday" />
              </ButtonGroup>
              <h2 class="text-xl md:text-2xl font-semibold m-0 text-[var(--fg-default)] truncate">{{ displayRangeTitle }}</h2>
            </div>
            <div class="flex flex-wrap gap-2 items-center justify-end">
              <IconField class="w-full sm:w-auto">
                <InputIcon class="pi pi-search" />
                <InputText
                  id="cal-search-input"
                  v-model="searchQ"
                  class="w-full sm:w-64"
                  :placeholder="t('globalCalendar.searchPlaceholder')"
                />
              </IconField>
              <SelectButton
                :model-value="viewMode"
                :options="viewButtonOptions"
                option-label="label"
                option-value="value"
                :allow-empty="false"
                class="text-xs sm:text-sm cal-view-select [&_.p-button]:py-1.5"
                @update:model-value="onViewModeSelect"
              >
                <template #option="{ option }">
                  <span class="inline-flex items-center gap-1.5">
                    <i :class="option.icon" aria-hidden="true" />
                    <span class="hidden sm:inline">{{ option.label }}</span>
                  </span>
                </template>
              </SelectButton>
            </div>
          </div>

          <DaySummaryBar
            class="shrink-0"
            :conflicts="summaryConflicts"
            :due-today="summaryDueToday"
            :unassigned="summaryUnassigned"
            :birthdays="summaryBirthdays"
            @open-conflicts="showConflictDialog = true"
          />

          <p v-if="loadError" class="m-0 shrink-0 text-sm text-red-600 dark:text-red-400">{{ loadError }}</p>

          <div
            v-if="viewMode !== 'team'"
            class="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-0.5 sm:p-1"
          >
            <div
              v-if="fcReady && !calendarFirstSuccessfulLoad"
              class="absolute inset-0 z-[1] flex flex-col gap-3 p-4 animate-pulse"
              aria-hidden="true"
            >
              <div class="h-8 w-1/3 rounded-md bg-[var(--surface-sunken)]" />
              <div class="min-h-[320px] flex-1 rounded-lg bg-[var(--surface-sunken)]/80" />
            </div>
            <FullCalendar
              v-if="fcReady"
              ref="fcRef"
              class="global-calendar-fc relative z-[2] h-full min-h-0"
              :options="fcOptions"
            />
          </div>

          <TeamTimelineView
            v-else
            class="min-h-0 flex-1 overflow-auto"
            :title="t('globalCalendar.teamViewTitle')"
            :day="navDate"
            :users="teamUsers"
            :events="timelineDayEvents"
            @select="onTimelineSelect"
          />
        </div>
      </div>
      </div>

      <EventComposerDialog
        v-model:visible="showComposer"
        :default-day="composerDay"
        :trackable-options="trackableOptions"
        :user-options="userOptions"
        @created="onCreated"
      />

      <EventDetailsDrawer
        v-model:visible="drawerVisible"
        :event="selectedApiEvent"
        :can-open-flow="canOpenFlow"
        :can-update="canUpdate"
        :user-options="userOptions"
        @updated="onDrawerUpdated"
      />

      <Dialog
        v-model:visible="showDayOverflowDialog"
        :header="dayOverflowDialogTitle"
        modal
        :style="{ width: 'min(520px, 95vw)' }"
        @hide="clearDayOverflowDialog"
      >
        <ul v-if="dayOverflowRows.length" class="m-0 max-h-[min(60vh,28rem)] list-none space-y-2 overflow-y-auto p-0 text-sm">
          <li v-for="row in dayOverflowRows" :key="row.id">
            <button
              type="button"
              class="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-raised)] px-3 py-2 text-left transition hover:bg-[var(--surface-sunken)]"
              @click="onDayOverflowRowClick(row)"
            >
              <span class="font-medium text-[var(--fg-default)]">{{ row.title }}</span>
            </button>
          </li>
        </ul>
        <p v-else class="m-0 text-sm text-[var(--fg-muted)]">{{ t('globalCalendar.noEventsThisDay') }}</p>
      </Dialog>

      <Dialog
        v-model:visible="showConflictDialog"
        :header="t('globalCalendar.drawerConflictTitle')"
        modal
        :style="{ width: 'min(520px, 95vw)' }"
      >
        <ul v-if="conflictPairs.length" class="m-0 p-0 list-none space-y-2 text-sm">
          <li v-for="(pair, idx) in conflictPairs" :key="idx" class="rounded-lg border border-[var(--surface-border)] p-2">
            <span class="font-medium">{{ pair.a.title }}</span>
            <span class="text-[var(--fg-muted)]"> · </span>
            <span class="font-medium">{{ pair.b.title }}</span>
          </li>
        </ul>
        <p v-else class="text-sm text-[var(--fg-muted)] m-0">{{ t('globalCalendar.summaryNoConflicts') }}</p>
      </Dialog>

      <Dialog v-model:visible="showHelp" :header="t('globalCalendar.shortcutsTitle')" modal :style="{ width: 'min(400px, 95vw)' }">
        <ul class="text-sm space-y-2 m-0 p-0 list-none text-[var(--fg-default)]">
          <li><kbd class="px-1 rounded bg-[var(--surface-sunken)]">M</kbd> {{ t('globalCalendar.shortcutMonth') }}</li>
          <li><kbd class="px-1 rounded bg-[var(--surface-sunken)]">W</kbd> {{ t('globalCalendar.shortcutWeek') }}</li>
          <li><kbd class="px-1 rounded bg-[var(--surface-sunken)]">D</kbd> {{ t('globalCalendar.shortcutDay') }}</li>
          <li><kbd class="px-1 rounded bg-[var(--surface-sunken)]">A</kbd> {{ t('globalCalendar.shortcutAgenda') }}</li>
          <li><kbd class="px-1 rounded bg-[var(--surface-sunken)]">T</kbd> {{ t('globalCalendar.today') }}</li>
          <li><kbd class="px-1 rounded bg-[var(--surface-sunken)]">N</kbd> {{ t('globalCalendar.shortcutNew') }}</li>
          <li><kbd class="px-1 rounded bg-[var(--surface-sunken)]">←</kbd>/<kbd class="px-1 rounded bg-[var(--surface-sunken)]">→</kbd> {{ t('globalCalendar.shortcutNav') }}</li>
        </ul>
      </Dialog>

      <Button
        v-if="canCreate"
        class="md:!hidden !fixed bottom-6 right-6 z-10 shadow-lg"
        rounded
        icon="pi pi-plus"
        type="button"
        :aria-label="t('globalCalendar.addActivity')"
        @click="openComposer()"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, watch, onMounted, nextTick } from 'vue';
import { storeToRefs } from 'pinia';
import ProgressSpinner from 'primevue/progressspinner';
import Button from 'primevue/button';
import ButtonGroup from 'primevue/buttongroup';
import Dialog from 'primevue/dialog';
import SelectButton from 'primevue/selectbutton';
import InputText from 'primevue/inputtext';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import FullCalendar from '@fullcalendar/vue3';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import type { CalendarOptions, DatesSetArg, EventClickArg, EventDropArg, EventApi } from '@fullcalendar/core';
import { useI18n } from 'vue-i18n';
import { apiClient } from '@/api/client';
import { usePermissions } from '@/composables/usePermissions';
import { useAuthStore } from '@/stores/auth.store';
import { useCalendarStore } from '@/stores/calendar.store';
import {
  apiEventToFullCalendar,
  parseActivityIdFromEventId,
  parseWorkflowItemIdFromEventId,
  type ApiCalendarEvent,
} from '@/composables/useCalendarAdapter';
import { useCalendarShortcuts } from '@/composables/useCalendarShortcuts';
import { matchesCalendarFilters, classifyApiEvent, type CalendarFilterKind } from '@/composables/calendarEventKind';
import { countHearingOverlapPairs, listHearingOverlapPairs } from '@/composables/calendarOverlap';
import { buildPeruHolidayEvents } from '@/composables/peruPublicHolidays';
import PageHeader from '@/components/common/PageHeader.vue';
import CalendarSidebar from './components/CalendarSidebar.vue';
import TeamTimelineView from './components/TeamTimelineView.vue';
import EventComposerDialog from './components/EventComposerDialog.vue';
import EventDetailsDrawer from './components/EventDetailsDrawer.vue';
import DaySummaryBar from './components/DaySummaryBar.vue';
import {
  setAssistantCalendarViewportFromFc,
  setAssistantCalendarViewportSingleDay,
} from '@/utils/assistant-calendar-context';

const { t, locale: i18nLocale } = useI18n();
const { can } = usePermissions();
const authStore = useAuthStore();
const { user } = storeToRefs(authStore);
const calStore = useCalendarStore();
const { filters: calFilters } = storeToRefs(calStore);

const authReady = computed(() => user.value != null);
const canReadCalendar = computed(() => can('trackable:read') || can('calendar:read'));
const canCreate = computed(() => can('workflow_item:create'));
const canUpdate = computed(() => can('workflow_item:update'));
const canOpenFlow = computed(() => can('trackable:read'));
const canViewTeam = computed(() => can('calendar:view_team'));

const fcRef = ref<InstanceType<typeof FullCalendar> | null>(null);
const fcReady = ref(false);
const navDate = ref(new Date());
const searchQ = ref('');
/** Debounced value used for client-side filtering (avoids refetch on every keystroke). */
const filterSearchQ = ref('');
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const loadError = ref<string | null>(null);
const rawEvents = ref<ApiCalendarEvent[]>([]);
/** Set after first calendar range fetch completes (success or error) — hides initial skeleton. */
const calendarFirstSuccessfulLoad = ref(false);
let lastEventsFetchKey = '';
const rangeTitle = ref('');
const showComposer = ref(false);
const composerDay = ref<Date | null>(null);
const showHelp = ref(false);
const drawerVisible = ref(false);
const selectedApiEvent = ref<ApiCalendarEvent | null>(null);
const showConflictDialog = ref(false);
const showDayOverflowDialog = ref(false);
const dayOverflowDate = ref<Date | null>(null);
const dayOverflowRows = ref<Array<{ id: string; title: string }>>([]);

const dayOverflowDialogTitle = computed(() => {
  const d = dayOverflowDate.value;
  if (!d) return t('globalCalendar.dayActivitiesModalTitle');
  return d.toLocaleDateString(i18nLocale.value, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
});

const trackableOptions = ref<Array<{ label: string; value: string }>>([]);
const usersList = ref<Array<{ id: string; email: string; firstName?: string }>>([]);
const userOptions = computed(() =>
  usersList.value.map((u) => ({
    label: u.firstName ? `${u.firstName} (${u.email})` : u.email,
    value: u.id,
  })),
);

type GridViewMode = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek' | 'team';

const viewMode = ref<GridViewMode>('dayGridMonth');

const displayRangeTitle = computed(() => {
  if (viewMode.value === 'team') {
    return navDate.value.toLocaleDateString(i18nLocale.value, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
  return rangeTitle.value;
});

const scopeOptions = computed((): Array<{ label: string; value: 'mine' | 'team' }> => {
  const opts: Array<{ label: string; value: 'mine' | 'team' }> = [{ label: t('globalCalendar.scopeMine'), value: 'mine' }];
  if (canViewTeam.value) opts.push({ label: t('globalCalendar.scopeFirm'), value: 'team' });
  return opts;
});

const viewButtonOptions = computed((): Array<{ label: string; value: GridViewMode; icon: string }> => {
  const base: Array<{ label: string; value: GridViewMode; icon: string }> = [
    { label: t('globalCalendar.viewMonth'), value: 'dayGridMonth', icon: 'pi pi-th-large' },
    { label: t('globalCalendar.viewWeek'), value: 'timeGridWeek', icon: 'pi pi-calendar' },
    { label: t('globalCalendar.viewDay'), value: 'timeGridDay', icon: 'pi pi-circle' },
    { label: t('globalCalendar.viewAgenda'), value: 'listWeek', icon: 'pi pi-list' },
  ];
  if (canViewTeam.value && calStore.scope === 'team') {
    base.push({ label: t('globalCalendar.viewTimeline'), value: 'team', icon: 'pi pi-users' });
  }
  return base;
});

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

const dayYmd = computed(() => ymd(navDate.value));

/** Single pass over `rawEvents` for sidebar map + KPIs + day summary chips. */
const calendarAggregates = computed(() => {
  const todayStr = ymd(new Date());
  const tmr = ymd(addDays(new Date(), 1));
  const limit = ymd(addDays(new Date(), 3));
  const selectedDay = dayYmd.value;

  const eventsByDayMap: Record<string, CalendarFilterKind[]> = {};
  let hearings = 0;
  let deadlinesToday = 0;
  let deadlinesNext3 = 0;
  let summaryDueToday = 0;
  let summaryUnassigned = 0;
  let summaryBirthdays = 0;

  for (const e of rawEvents.value) {
    const startDay = e.start.slice(0, 10);
    const kind = classifyApiEvent(e);
    if (!eventsByDayMap[startDay]) eventsByDayMap[startDay] = [];
    eventsByDayMap[startDay].push(kind);

    if (e.source === 'birthday' && startDay === selectedDay) summaryBirthdays += 1;

    if (e.source !== 'workflow') continue;

    if (kind === 'hearing' && startDay === todayStr) hearings += 1;

    if (e.extendedProps?.isLegalDeadline) {
      const due = e.end?.slice(0, 10) || startDay;
      if (due === todayStr) deadlinesToday += 1;
      if (due >= tmr && due <= limit) deadlinesNext3 += 1;
      if (due === selectedDay) summaryDueToday += 1;
    }

    if (startDay === selectedDay) {
      const aid = e.extendedProps?.assignedToId as string | undefined;
      if (!aid) summaryUnassigned += 1;
    }
  }

  return {
    eventsByDayMap,
    kpiCards: { hearings, deadlinesToday, deadlinesNext3 },
    summaryDueToday,
    summaryUnassigned,
    summaryBirthdays,
  };
});

const eventsByDayMap = computed(() => calendarAggregates.value.eventsByDayMap);
const kpiCards = computed(() => calendarAggregates.value.kpiCards);
const summaryDueToday = computed(() => calendarAggregates.value.summaryDueToday);
const summaryUnassigned = computed(() => calendarAggregates.value.summaryUnassigned);
const summaryBirthdays = computed(() => calendarAggregates.value.summaryBirthdays);

const summaryConflicts = computed(() => countHearingOverlapPairs(dayYmd.value, rawEvents.value));

const conflictPairs = computed(() => listHearingOverlapPairs(dayYmd.value, rawEvents.value));

const teamUsers = computed(() => {
  const rows = [{ id: '__unassigned', label: t('globalCalendar.unassigned') }];
  for (const u of usersList.value) {
    rows.push({
      id: u.id,
      label: u.firstName ? `${u.firstName}` : u.email.split('@')[0] ?? u.email,
    });
  }
  return rows;
});

const timelineDayEvents = computed((): ApiCalendarEvent[] => {
  const day = dayYmd.value;
  return rawEvents.value.filter((e) => {
    if (e.source !== 'workflow') return false;
    if (e.start.slice(0, 10) !== day) return false;
    return matchesCalendarFilters(e, calFilters.value) && filterBySearch(e);
  });
});

function filterBySearch(e: ApiCalendarEvent): boolean {
  const q = filterSearchQ.value.trim().toLowerCase();
  if (!q) return true;
  return e.title.toLowerCase().includes(q);
}

function filterEvents(list: ApiCalendarEvent[]): ApiCalendarEvent[] {
  return list.filter((e) => matchesCalendarFilters(e, calFilters.value) && filterBySearch(e));
}

function invalidateCalendarEventsCache() {
  lastEventsFetchKey = '';
}

async function fetchEventsRange(from: Date, toExclusive: Date) {
  loadError.value = null;
  const to = new Date(toExclusive.getTime() - 86400000);
  try {
    const { data } = await apiClient.get<{ events: ApiCalendarEvent[] }>('/calendar/events', {
      params: {
        from: ymd(from),
        to: ymd(to),
        scope: calStore.scope === 'team' ? 'team' : 'mine',
        includeBirthdays: true,
        includeExternal: true,
      },
    });
    const base = Array.isArray(data?.events) ? data.events : [];
    const pe = buildPeruHolidayEvents(from, toExclusive);
    rawEvents.value = [...base, ...pe];
    calendarFirstSuccessfulLoad.value = true;
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : String(e);
    rawEvents.value = [];
    calendarFirstSuccessfulLoad.value = true;
  }
}

async function loadTeamDay() {
  const d = navDate.value;
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const endEx = new Date(start.getTime() + 86400000);
  await fetchEventsRange(start, endEx);
}

async function setViewMode(v: GridViewMode) {
  if (v === 'team' && (!canViewTeam.value || calStore.scope !== 'team')) return;
  const prev = viewMode.value;
  viewMode.value = v;
  if (v === 'team') {
    invalidateCalendarEventsCache();
    await loadTeamDay();
    return;
  }
  if (prev === 'team') invalidateCalendarEventsCache();
  await nextTick();
  requestAnimationFrame(() => {
    const api = fcRef.value?.getApi();
    if (!api) return;
    if (prev === 'team') api.updateSize();
    api.changeView(v);
    api.gotoDate(navDate.value);
    requestAnimationFrame(() => api.updateSize());
  });
}

watch(
  () => calStore.scope,
  async (s) => {
    invalidateCalendarEventsCache();
    if (s === 'team' && !canViewTeam.value) calStore.setScope('mine');
    if (s === 'mine' && viewMode.value === 'team') await setViewMode('timeGridWeek');
    fcRef.value?.getApi()?.refetchEvents();
  },
  { immediate: true },
);

watch([navDate, () => calStore.scope], () => {
  if (viewMode.value === 'team') void loadTeamDay();
});

watch(
  [navDate, viewMode, displayRangeTitle],
  () => {
    if (viewMode.value === 'team') {
      setAssistantCalendarViewportSingleDay(navDate.value, {
        view: 'team',
        title: displayRangeTitle.value,
      });
    }
  },
  { immediate: true },
);

watch(searchQ, (q) => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    filterSearchQ.value = q;
    fcRef.value?.getApi()?.refetchEvents();
    searchDebounceTimer = null;
  }, 150);
});

watch(
  calFilters,
  () => {
    fcRef.value?.getApi()?.refetchEvents();
  },
  { deep: true },
);

function clearDayOverflowDialog() {
  dayOverflowRows.value = [];
  dayOverflowDate.value = null;
}

function handleMoreLinkClick(info: { date: Date; allSegs: Array<{ event: EventApi }>; jsEvent: UIEvent }) {
  info.jsEvent.preventDefault();
  dayOverflowDate.value = info.date;
  const seen = new Set<string>();
  const rows: { id: string; title: string }[] = [];
  for (const seg of info.allSegs) {
    const ev = seg.event;
    const id = String(ev.id);
    if (seen.has(id)) continue;
    seen.add(id);
    rows.push({ id, title: (ev.title || '').trim() || t('globalCalendar.untitledActivity') });
  }
  dayOverflowRows.value = rows;
  showDayOverflowDialog.value = true;
}

function onDayOverflowRowClick(row: { id: string; title: string }) {
  const raw = rawEvents.value.find((r) => r.id === row.id);
  if (raw) {
    selectedApiEvent.value = raw;
    drawerVisible.value = true;
    showDayOverflowDialog.value = false;
    clearDayOverflowDialog();
    return;
  }
  const api = fcRef.value?.getApi();
  const fe = api?.getEventById(row.id);
  if (fe) {
    const xp = fe.extendedProps as Record<string, unknown>;
    selectedApiEvent.value = {
      id: String(fe.id),
      source: String(xp.source || 'workflow'),
      title: fe.title || '',
      start: fe.start?.toISOString() || '',
      end: fe.end?.toISOString() || '',
      allDay: !!fe.allDay,
      extendedProps: { ...xp },
    };
    drawerVisible.value = true;
    showDayOverflowDialog.value = false;
    clearDayOverflowDialog();
  }
}

async function handleReschedule(arg: EventDropArg | { event: EventApi; revert: () => void }) {
  const raw = String(arg.event.id);
  if (!parseActivityIdFromEventId(raw) && !parseWorkflowItemIdFromEventId(raw) && !/^[0-9a-f-]{36}$/i.test(raw)) {
    arg.revert();
    return;
  }
  try {
    await apiClient.patch(`/calendar/events/${encodeURIComponent(raw)}/reschedule`, {
      startDate: arg.event.start?.toISOString(),
      dueDate: arg.event.end?.toISOString(),
      allDay: arg.event.allDay,
    });
    invalidateCalendarEventsCache();
    await fcRef.value?.getApi()?.refetchEvents();
  } catch {
    arg.revert();
  }
}

function buildFcOptions(): CalendarOptions {
  const initial =
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches ? 'listWeek' : 'dayGridMonth';
  return {
    plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
    initialView: initial,
    headerToolbar: false,
    locale: i18nLocale.value.startsWith('es') ? esLocale : 'en',
    height: '100%',
    fixedWeekCount: true,
    expandRows: true,
    dayMaxEvents: 3,
    moreLinkClick: handleMoreLinkClick,
    editable: canUpdate.value,
    eventStartEditable: canUpdate.value,
    eventDurationEditable: canUpdate.value,
    selectable: canCreate.value,
    selectMirror: true,
    events: (info, successCallback, failureCallback) => {
      void (async () => {
        try {
          const rangeKey = `${info.start.toISOString()}__${info.end.toISOString()}`;
          if (rangeKey !== lastEventsFetchKey) {
            await fetchEventsRange(info.start, info.end);
            lastEventsFetchKey = rangeKey;
          }
          successCallback(filterEvents(rawEvents.value).map(apiEventToFullCalendar));
        } catch (e: unknown) {
          failureCallback(e instanceof Error ? e : new Error(String(e)));
        }
      })();
    },
    datesSet: (arg: DatesSetArg) => {
      rangeTitle.value = arg.view.title;
      navDate.value = arg.view.calendar.getDate();
      if (viewMode.value !== 'team') {
        setAssistantCalendarViewportFromFc(arg);
      }
    },
    dateClick: (info) => {
      composerDay.value = info.date;
      showComposer.value = true;
    },
    eventClick: (info: EventClickArg) => {
      const raw = rawEvents.value.find((r) => r.id === info.event.id);
      if (raw) {
        selectedApiEvent.value = raw;
        drawerVisible.value = true;
        return;
      }
      const xp = info.event.extendedProps as Record<string, unknown>;
      selectedApiEvent.value = {
        id: String(info.event.id),
        source: String(xp.source || 'workflow'),
        title: info.event.title || '',
        start: info.event.start?.toISOString() || '',
        end: info.event.end?.toISOString() || '',
        allDay: !!info.event.allDay,
        extendedProps: { ...xp },
      };
      drawerVisible.value = true;
    },
    select: (arg) => {
      composerDay.value = arg.start;
      showComposer.value = true;
      arg.view.calendar.unselect();
    },
    eventDrop: async (arg: EventDropArg) => {
      await handleReschedule(arg);
    },
    eventResize: async (arg) => {
      await handleReschedule(arg as unknown as EventDropArg);
    },
  };
}

const fcOptions = shallowRef<CalendarOptions>(buildFcOptions());

watch([canUpdate, canCreate, i18nLocale], () => {
  fcOptions.value = buildFcOptions();
  void nextTick(() => {
    fcRef.value?.getApi()?.updateSize();
  });
});

function onViewModeSelect(v: GridViewMode) {
  void setViewMode(v);
}

function calendarPrev() {
  if (viewMode.value === 'team') {
    const d = new Date(navDate.value);
    d.setDate(d.getDate() - 1);
    navDate.value = d;
    void loadTeamDay();
    return;
  }
  fcRef.value?.getApi()?.prev();
}

function calendarNext() {
  if (viewMode.value === 'team') {
    const d = new Date(navDate.value);
    d.setDate(d.getDate() + 1);
    navDate.value = d;
    void loadTeamDay();
    return;
  }
  fcRef.value?.getApi()?.next();
}

function calendarToday() {
  navDate.value = new Date();
  if (viewMode.value === 'team') {
    void loadTeamDay();
    return;
  }
  fcRef.value?.getApi()?.today();
}

function onSidebarDate(d: Date) {
  navDate.value = d;
  if (viewMode.value === 'team') {
    void loadTeamDay();
    return;
  }
  fcRef.value?.getApi()?.gotoDate(d);
}

function openComposer() {
  composerDay.value = navDate.value;
  showComposer.value = true;
}

function onCreated() {
  invalidateCalendarEventsCache();
  void fcRef.value?.getApi()?.refetchEvents();
  if (viewMode.value === 'team') void loadTeamDay();
}

function onTimelineSelect(ev: ApiCalendarEvent) {
  selectedApiEvent.value = ev;
  drawerVisible.value = true;
}

function onDrawerUpdated() {
  invalidateCalendarEventsCache();
  void fcRef.value?.getApi()?.refetchEvents();
  if (viewMode.value === 'team') void loadTeamDay();
}

const shortcutHandlers = ref({
  onMonth: () => {
    void setViewMode('dayGridMonth');
  },
  onWeek: () => {
    void setViewMode('timeGridWeek');
  },
  onDay: () => {
    void setViewMode('timeGridDay');
  },
  onAgenda: () => {
    void setViewMode('listWeek');
  },
  onToday: () => calendarToday(),
  onNew: () => {
    if (canCreate.value) openComposer();
  },
  onSearchFocus: () => {
    document.getElementById('cal-search-input')?.focus();
  },
  onToggleFilters: () => {},
  onHelp: () => {
    showHelp.value = !showHelp.value;
  },
  onPrev: () => calendarPrev(),
  onNext: () => calendarNext(),
});

useCalendarShortcuts(shortcutHandlers, ref(true));

onMounted(async () => {
  filterSearchQ.value = searchQ.value;
  fcReady.value = true;
  if (!canReadCalendar.value) return;
  try {
    const { data: tData } = await apiClient.get('/trackables');
    const list = Array.isArray(tData?.data) ? tData.data : tData;
    trackableOptions.value = (list as { title: string; id: string }[]).map((x) => ({ label: x.title, value: x.id }));

    if (canViewTeam.value || canCreate.value) {
      const { data: uData } = await apiClient.get('/users', { params: { limit: 200 } });
      const uList = Array.isArray(uData) ? uData : uData?.data;
      usersList.value = Array.isArray(uList) ? uList : [];
    } else {
      usersList.value = [];
    }
  } catch {
    trackableOptions.value = [];
  }
});
</script>

<style scoped>
/* Evita scroll vertical interno en vista mes: las filas se reparten con expandRows. */
.global-calendar-fc :deep(.fc) {
  height: 100% !important;
  /* Escala ligeramente el contenido del calendario según ancho/alto de ventana. */
  font-size: clamp(0.7rem, 0.2vw + 0.65rem, 0.875rem);
}
.global-calendar-fc :deep(.fc-scroller) {
  overflow: hidden !important;
}
.global-calendar-fc :deep(.fc-daygrid-body) {
  width: 100% !important;
}

/* Cabecera de días (vista mes) */
.global-calendar-fc :deep(.fc-col-header-cell) {
  padding: 0.35rem 0.15rem;
  font-weight: 600;
  line-height: 1.2;
}
.global-calendar-fc :deep(.fc-col-header-cell-cushion) {
  padding: 0.1rem 0.15rem;
}

/* Celdas y números de día */
.global-calendar-fc :deep(.fc-daygrid-day-frame) {
  min-height: 0;
}
.global-calendar-fc :deep(.fc-daygrid-day-number) {
  padding: 0.1rem 0.25rem 0.15rem;
  font-size: 0.95em;
}

/* Eventos en rejilla (mes) */
.global-calendar-fc :deep(.fc-h-event) {
  line-height: 1.15;
  font-size: 0.88em;
  margin-top: 1px;
  border-radius: 0.2rem;
}
.global-calendar-fc :deep(.fc-h-event .fc-event-main) {
  padding: 0 0.1rem 0.05rem;
}
.global-calendar-fc :deep(.fc-daygrid-more-link) {
  font-size: 0.85em;
  padding: 0 0.1rem;
}

/* Semana / día: reloj y slots un poco más compactos */
.global-calendar-fc :deep(.fc-timegrid-axis-cushion) {
  font-size: 0.8em;
}
.global-calendar-fc :deep(.fc-timegrid-slot-label) {
  font-size: 0.78em;
  vertical-align: top;
}
.global-calendar-fc :deep(.fc-timegrid-col-events) {
  font-size: 0.9em;
}

/* Vista agenda (lista) */
.global-calendar-fc :deep(.fc-list-day-cushion),
.global-calendar-fc :deep(.fc-list-event-time) {
  font-size: 0.95em;
}
.global-calendar-fc :deep(.fc-list-event-title) {
  line-height: 1.3;
  font-size: 0.95em;
}

/* Pantallas estrejas o poco altas: un escalón más compacto */
@media (max-width: 1400px) {
  .global-calendar-fc :deep(.fc) {
    font-size: clamp(0.65rem, 0.18vw + 0.58rem, 0.8rem);
  }
}
@media (max-height: 850px) {
  .global-calendar-fc :deep(.fc) {
    font-size: clamp(0.65rem, 0.1vw + 0.6rem, 0.8rem);
  }
  .global-calendar-fc :deep(.fc-col-header-cell) {
    padding: 0.3rem 0.1rem;
  }
}
</style>
