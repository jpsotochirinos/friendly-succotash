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
          <template #lead>
            <DayHeader :scope="calStore.scope" />
          </template>
        </PageHeader>

        <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:flex-row">
          <CalendarSidebar
            v-model="navDate"
            :kpis="null"
            :month-summary-rows="monthSummaryStats"
            :events-by-day="eventsByDayMap"
            :trackable-options="trackableOptions"
            :user-options="assigneeFilterOptions"
            :show-assignee-filter="calStore.scope === 'team' && canViewTeam"
            :show-sidebar-filters="false"
            @select-date="onSidebarDate"
          />

          <div class="cal-redesign cal-redesign--product flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden">
            <div class="cal-redesign__toolbar">
              <div class="cal-redesign__toolbar-primary">
                <div
                  v-if="summaryConflicts > 0 && viewMode !== 'team'"
                  class="cal-redesign__toolbar-primary-lead"
                >
                  <div class="cal-redesign__toolbar-track">
                    <button
                      type="button"
                      class="self-start rounded border border-[var(--surface-border)] bg-[var(--surface-raised)] px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-200"
                      @click="showConflictDialog = true"
                    >
                      {{ t('globalCalendar.summaryConflicts', { n: summaryConflicts }) }}
                    </button>
                  </div>
                </div>
                <div class="cal-redesign__toolbar-primary-tail">
                  <div class="cal-redesign__toolbar-quick" role="toolbar" :aria-label="t('globalCalendar.pageTitle')">
                    <div class="cal-redesign__toolbar-quick-end">
                      <SelectButton
                        :model-value="viewMode"
                        :options="viewButtonOptions"
                        option-label="label"
                        option-value="value"
                        :allow-empty="false"
                        size="small"
                        class="cal-redesign__views text-xs sm:text-sm [&_.p-button]:py-1.5"
                        :aria-label="t('globalCalendar.pageTitle')"
                        @update:model-value="onViewModeSelect"
                      >
                        <template #option="{ option }">
                          <span class="cal-redesign__view-opt">
                            <span
                              v-if="option.value === 'hoy'"
                              class="cal-redesign__view-dayball"
                              aria-hidden="true"
                            >{{ navDayOfMonth }}</span>
                            <i v-else :class="option.icon" aria-hidden="true" />
                            <span class="inline max-w-[5.5rem] truncate text-[10px] leading-tight sm:max-w-none sm:text-xs sm:leading-normal">{{ option.label }}</span>
                          </span>
                        </template>
                      </SelectButton>
                    </div>
                    <span class="cal-redesign__toolbar-quick-sep" aria-hidden="true" />
                    <div class="cal-redesign__toolbar-quick-start">
                      <SelectButton
                        v-model="calStore.scope"
                        :options="scopeOptions"
                        option-label="label"
                        option-value="value"
                        :allow-empty="false"
                        size="small"
                        class="cal-redesign__scope text-sm"
                        :aria-label="t('globalCalendar.scopeMine')"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div class="cal-redesign__toolbar-actions">
                <IconField class="cal-redesign__search-field">
                  <InputIcon class="pi pi-search" />
                  <InputText
                    id="cal-search-input"
                    v-model="searchQ"
                    size="small"
                    class="cal-redesign__search w-full min-w-0"
                    :placeholder="t('globalCalendar.searchPlaceholder')"
                    autocomplete="off"
                  />
                </IconField>
                <div class="cal-redesign__toolbar-filters-inline">
                  <GlobalCalendarFiltersBar
                    :show-assignee-filter="calStore.scope === 'team' && canViewTeam"
                    :user-options="assigneeFilterOptions"
                  />
                </div>
                <Button
                  v-if="canCreate"
                  icon="pi pi-plus"
                  :label="t('globalCalendar.addActivity')"
                  size="small"
                  outlined
                  severity="secondary"
                  type="button"
                  class="cal-redesign__add-btn cal-redesign__toolbar-add"
                  :aria-label="t('globalCalendar.addActivity')"
                  @click="openComposer()"
                />
              </div>
            </div>

            <p v-if="loadError" class="m-0 shrink-0 text-sm text-red-600 dark:text-red-400">{{ loadError }}</p>

            <div class="relative min-h-0 flex-1 overflow-hidden">
              <div
                v-if="!calendarFirstSuccessfulLoad && viewMode !== 'team'"
                class="absolute inset-0 z-[1] flex flex-col gap-3 p-4 animate-pulse"
                aria-hidden="true"
              >
                <div class="h-8 w-1/3 rounded-md bg-[var(--surface-sunken)]" />
                <div class="min-h-[320px] flex-1 rounded-lg bg-[var(--surface-sunken)]/80" />
              </div>

              <ExampleFrame
                v-if="viewMode === 'team'"
                class="relative z-[2] h-full min-h-0"
                scrollable-content
              >
                <template #heading>
                  <CalendarProductFrameHeading
                    :primary="t('globalCalendar.teamViewTitle')"
                    :secondary="teamFrameDaySubtitle"
                    :nav-prev-label="t('globalCalendar.navPrev')"
                    :nav-next-label="t('globalCalendar.navNext')"
                    @prev="calendarPrev"
                    @next="calendarNext"
                  />
                </template>
                <TeamTimelineView
                  class="min-h-0"
                  :users="filteredTeamUsers"
                  :events="timelineDayEvents"
                  @select="onTimelineSelect"
                />
              </ExampleFrame>

              <template v-else>
                <ExampleFrame
                  v-if="viewMode === 'hoy'"
                  class="relative z-[2] h-full min-h-0"
                  scrollable-content
                >
                  <template #heading>
                    <CalendarProductFrameHeading
                      :primary="dayFrameTitle"
                      :secondary="dayFrameSubtitle"
                      :nav-prev-label="t('globalCalendar.navPrev')"
                      :nav-next-label="t('globalCalendar.navNext')"
                      @prev="calendarPrev"
                      @next="calendarNext"
                    />
                  </template>
                  <HoyView
                    hide-day-header
                    :date="navDate"
                    :scope="calStore.scope"
                    :actuaciones="actuacionesModel"
                    :sinoe="sinoeEmpty"
                    :mi-usuario-id="miUsuarioId"
                    :usuarios="usuariosModel"
                    :expedientes="expedientesModel"
                    @open="openActuacion"
                    @select-day="selectDay"
                  />
                </ExampleFrame>

                <ExampleFrame
                  v-else-if="viewMode === 'semana'"
                  class="relative z-[2] h-full min-h-0"
                  scrollable-content
                >
                  <template #heading>
                    <CalendarProductFrameHeading
                      :primary="t('globalCalendar.viewWeek')"
                      :secondary="semanaFrameWeekRange"
                      :nav-prev-label="t('globalCalendar.navPrev')"
                      :nav-next-label="t('globalCalendar.navNext')"
                      @prev="calendarPrev"
                      @next="calendarNext"
                    />
                  </template>
                  <SemanaView
                    :start-date="navDate"
                    :actuaciones="actuacionesModel"
                    :expedientes="expedientesModel"
                    :usuarios="usuariosModel"
                    @select="openActuacion"
                  />
                </ExampleFrame>

                <ExampleFrame
                  v-else-if="viewMode === 'mes'"
                  class="relative z-[2] h-full min-h-0"
                  scrollable-content
                >
                  <template #heading>
                    <CalendarProductFrameHeading
                      :primary="mesFrameMonthTitle"
                      :secondary="t('globalCalendar.pageSubtitle')"
                      :nav-prev-label="t('globalCalendar.navPrev')"
                      :nav-next-label="t('globalCalendar.navNext')"
                      @prev="calendarPrev"
                      @next="calendarNext"
                    />
                  </template>
                  <MesView :month-date="navDate" :actuaciones="actuacionesModel" @select-day="selectDay" />
                </ExampleFrame>

                <ExampleFrame
                  v-else
                  class="relative z-[2] h-full min-h-0"
                  scrollable-content
                >
                  <template #heading>
                    <CalendarProductFrameHeading
                      :primary="t('globalCalendar.viewByMatter')"
                      :secondary="displayRangeTitle"
                      :nav-prev-label="t('globalCalendar.navPrev')"
                      :nav-next-label="t('globalCalendar.navNext')"
                      @prev="calendarPrev"
                      @next="calendarNext"
                    />
                  </template>
                  <ExpedienteView
                    :actuaciones="actuacionesModel"
                    :expedientes="expedientesModel"
                    :usuarios="usuariosModel"
                    @open="openActuacion"
                    @add="openComposerForExpediente"
                  />
                </ExampleFrame>
              </template>
            </div>
          </div>
        </div>
      </div>

      <EventComposerDialog
        v-model:visible="showComposer"
        :default-day="composerDay"
        :preset-trackable-id="composerPresetTrackableId"
        :trackable-options="trackableOptions"
        :user-options="userOptions"
        @close="composerPresetTrackableId = null"
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
        v-model:visible="showConflictDialog"
        :header="t('globalCalendar.drawerConflictTitle')"
        modal
        :style="{ width: 'min(520px, 95vw)' }"
      >
        <ul v-if="conflictPairs.length" class="m-0 list-none space-y-2 p-0 text-sm">
          <li v-for="(pair, idx) in conflictPairs" :key="idx" class="rounded-lg border border-[var(--surface-border)] p-2">
            <span class="font-medium">{{ pair.a.title }}</span>
            <span class="text-[var(--fg-muted)]"> · </span>
            <span class="font-medium">{{ pair.b.title }}</span>
          </li>
        </ul>
        <p v-else class="m-0 text-sm text-[var(--fg-muted)]">{{ t('globalCalendar.summaryNoConflicts') }}</p>
      </Dialog>

      <Dialog v-model:visible="showHelp" :header="t('globalCalendar.shortcutsTitle')" modal :style="{ width: 'min(400px, 95vw)' }">
        <ul class="m-0 list-none space-y-2 p-0 text-sm text-[var(--fg-default)]">
          <li><kbd class="rounded bg-[var(--surface-sunken)] px-1">M</kbd> {{ t('globalCalendar.shortcutMonth') }}</li>
          <li><kbd class="rounded bg-[var(--surface-sunken)] px-1">W</kbd> {{ t('globalCalendar.shortcutWeek') }}</li>
          <li><kbd class="rounded bg-[var(--surface-sunken)] px-1">D</kbd> {{ t('globalCalendar.shortcutDay') }}</li>
          <li><kbd class="rounded bg-[var(--surface-sunken)] px-1">A</kbd> {{ t('globalCalendar.shortcutAgenda') }}</li>
          <li><kbd class="rounded bg-[var(--surface-sunken)] px-1">T</kbd> {{ t('globalCalendar.today') }}</li>
          <li><kbd class="rounded bg-[var(--surface-sunken)] px-1">N</kbd> {{ t('globalCalendar.shortcutNew') }}</li>
          <li>
            <kbd class="rounded bg-[var(--surface-sunken)] px-1">←</kbd>/<kbd class="rounded bg-[var(--surface-sunken)] px-1">→</kbd>
            {{ t('globalCalendar.shortcutNav') }}
          </li>
        </ul>
      </Dialog>

      <Button
        v-if="canCreate"
        class="!fixed bottom-6 right-6 z-10 shadow-lg md:!hidden"
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
import { ref, computed, watch, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import ProgressSpinner from 'primevue/progressspinner';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import SelectButton from 'primevue/selectbutton';
import InputText from 'primevue/inputtext';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import { useI18n } from 'vue-i18n';
import { apiClient } from '@/api/client';
import { usePermissions } from '@/composables/usePermissions';
import { useAuthStore } from '@/stores/auth.store';
import { useCalendarStore } from '@/stores/calendar.store';
import type { ApiCalendarEvent } from '@/composables/useCalendarAdapter';
import { useCalendarShortcuts } from '@/composables/useCalendarShortcuts';
import { matchesCalendarFilters, classifyApiEvent, type CalendarFilterKind } from '@/composables/calendarEventKind';
import { countHearingOverlapPairs, listHearingOverlapPairs } from '@/composables/calendarOverlap';
import { buildPeruHolidayEvents } from '@/composables/peruPublicHolidays';
import PageHeader from '@/components/common/PageHeader.vue';
import DayHeader from '@/sandbox/recipes/CalendarRedesign/patterns/DayHeader.vue';
import CalendarSidebar from './components/CalendarSidebar.vue';
import GlobalCalendarFiltersBar from './components/GlobalCalendarFiltersBar.vue';
import CalendarProductFrameHeading from './components/CalendarProductFrameHeading.vue';
import TeamTimelineView from './components/TeamTimelineView.vue';
import EventComposerDialog from './components/EventComposerDialog.vue';
import EventDetailsDrawer from './components/EventDetailsDrawer.vue';
import ExampleFrame from '@/sandbox/_shared/ExampleFrame.vue';
import HoyView from '@/sandbox/recipes/CalendarRedesign/views/HoyView.vue';
import SemanaView from '@/sandbox/recipes/CalendarRedesign/views/SemanaView.vue';
import MesView from '@/sandbox/recipes/CalendarRedesign/views/MesView.vue';
import ExpedienteView from '@/sandbox/recipes/CalendarRedesign/views/ExpedienteView.vue';
import { fmtFechaLarga } from '@/sandbox/recipes/CalendarRedesign/urgency';
import type { Actuacion, Expediente, SinoePendiente } from '@/sandbox/recipes/CalendarRedesign/mocks';
import {
  buildActuacionesFromApi,
  buildExpedientesFromTrackables,
  buildUsuariosFromDirectory,
} from './calendarRedesignAdapter';
import {
  setAssistantCalendarViewportRange,
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

const navDate = ref(new Date());
const searchQ = ref('');
/** Debounced value used for client-side filtering (avoids refetch on every keystroke). */
const filterSearchQ = ref('');
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const loadError = ref<string | null>(null);
const rawEvents = ref<ApiCalendarEvent[]>([]);
/** Set after first calendar range fetch completes (success or error) — hides initial skeleton. */
const calendarFirstSuccessfulLoad = ref(false);
let lastFetchKey = '';
const showComposer = ref(false);
const composerDay = ref<Date | null>(null);
const composerPresetTrackableId = ref<string | null>(null);
const showHelp = ref(false);
const drawerVisible = ref(false);
const selectedApiEvent = ref<ApiCalendarEvent | null>(null);
const showConflictDialog = ref(false);

const sinoeEmpty = [] as SinoePendiente[];

type CalViewMode = 'hoy' | 'semana' | 'mes' | 'expediente' | 'team';
const viewMode = ref<CalViewMode>('hoy');

const trackableOptions = ref<Array<{ label: string; value: string }>>([]);
const usersList = ref<Array<{ id: string; email: string; firstName?: string }>>([]);
const userOptions = computed(() =>
  usersList.value.map((u) => ({
    label: u.firstName ? `${u.firstName} (${u.email})` : u.email,
    value: u.id,
  })),
);

/** Opciones del filtro asignado: incluye «Sin asignar» (`__unassigned`). */
const assigneeFilterOptions = computed(() => [
  { label: t('globalCalendar.unassigned'), value: '__unassigned' },
  ...userOptions.value,
]);

const expedientesModel = computed(() => buildExpedientesFromTrackables(trackableOptions.value));
const usuariosModel = computed(() => buildUsuariosFromDirectory(usersList.value));

const miUsuarioId = computed(() => String(user.value?.id ?? ''));

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function monthGridRange(monthAnchor: Date): { from: Date; toExclusive: Date } {
  const first = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
  const dow = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(start.getDate() - dow);
  start.setHours(0, 0, 0, 0);
  const endExclusive = new Date(start);
  endExclusive.setDate(endExclusive.getDate() + 42);
  return { from: start, toExclusive: endExclusive };
}

function weekRange(anchor: Date): { from: Date; toExclusive: Date } {
  const d = startOfLocalDay(anchor);
  const dow = (d.getDay() + 6) % 7;
  const monday = new Date(d);
  monday.setDate(monday.getDate() - dow);
  const endExclusive = new Date(monday);
  endExclusive.setDate(endExclusive.getDate() + 7);
  return { from: monday, toExclusive: endExclusive };
}

function dayRange(anchor: Date): { from: Date; toExclusive: Date } {
  const start = startOfLocalDay(anchor);
  const endExclusive = new Date(start);
  endExclusive.setDate(endExclusive.getDate() + 1);
  return { from: start, toExclusive: endExclusive };
}

function unionRanges(
  a: { from: Date; toExclusive: Date },
  b: { from: Date; toExclusive: Date },
): { from: Date; toExclusive: Date } {
  const from = a.from < b.from ? new Date(a.from) : new Date(b.from);
  const toExclusive = a.toExclusive > b.toExclusive ? new Date(a.toExclusive) : new Date(b.toExclusive);
  return { from, toExclusive };
}

/** Rango API: unión de la vista activa + grilla del mes de `nav` (sidebar / mini). */
function effectiveFetchRange(view: CalViewMode, nav: Date): { from: Date; toExclusive: Date } {
  if (view === 'team') return unionRanges(dayRange(nav), monthGridRange(nav));
  const monthR = monthGridRange(nav);
  if (view === 'hoy') return unionRanges(dayRange(nav), monthR);
  if (view === 'semana') return unionRanges(weekRange(nav), monthR);
  if (view === 'mes' || view === 'expediente') return monthR;
  return monthR;
}

const dayYmd = computed(() => ymd(navDate.value));

/** Día del mes (1–31) para el icono “Hoy” del selector de vistas. */
const navDayOfMonth = computed(() => navDate.value.getDate());

const calendarAggregates = computed(() => {
  const eventsByDayMap: Record<string, CalendarFilterKind[]> = {};

  for (const e of rawEvents.value) {
    const startDay = e.start.slice(0, 10);
    const kind = classifyApiEvent(e);
    if (!eventsByDayMap[startDay]) eventsByDayMap[startDay] = [];
    eventsByDayMap[startDay].push(kind);
  }

  return { eventsByDayMap };
});

const eventsByDayMap = computed(() => calendarAggregates.value.eventsByDayMap);

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

/** Columnas del timeline según filtro de asignados (vacío = todos). */
const filteredTeamUsers = computed(() => {
  const all = teamUsers.value;
  const sel = calFilters.value.assignees;
  if (sel.length === 0) return all;
  return all.filter((u) => sel.includes(u.id));
});

const timelineDayEvents = computed((): ApiCalendarEvent[] => {
  const day = dayYmd.value;
  return rawEvents.value.filter((e) => {
    if (e.source !== 'workflow') return false;
    if (e.start.slice(0, 10) !== day) return false;
    return matchesCalendarFilters(e, calFilters.value) && filterBySearch(e);
  });
});

function eventSearchHaystack(e: ApiCalendarEvent): string {
  const xp = e.extendedProps ?? {};
  const tid = String(xp.trackableId ?? '').trim();
  const fromOptions = tid
    ? (trackableOptions.value.find((o) => o.value === tid)?.label ?? '')
    : '';
  const parts: unknown[] = [
    e.title,
    xp.trackableTitle,
    tid,
    fromOptions,
    xp.assignedToName,
    xp.assignedToEmail,
    xp.location,
    xp.kind,
    xp.description,
    xp.body,
    xp.externalId,
    xp.provider,
  ];
  if (xp.metadata != null && typeof xp.metadata === 'object') {
    try {
      parts.push(JSON.stringify(xp.metadata));
    } catch {
      /* ignore */
    }
  }
  return parts
    .filter((v) => v != null && String(v).trim() !== '')
    .map((v) => String(v))
    .join(' ')
    .toLowerCase();
}

function filterBySearch(e: ApiCalendarEvent): boolean {
  const q = filterSearchQ.value.trim().toLowerCase();
  if (!q) return true;
  return eventSearchHaystack(e).includes(q);
}

function filterEvents(list: ApiCalendarEvent[]): ApiCalendarEvent[] {
  return list.filter((e) => matchesCalendarFilters(e, calFilters.value) && filterBySearch(e));
}

const filteredApiEvents = computed(() => filterEvents(rawEvents.value));

const actuacionesModel = computed(() => buildActuacionesFromApi(filteredApiEvents.value));

const monthSummaryStats = computed(() => {
  const y = navDate.value.getFullYear();
  const m = navDate.value.getMonth();
  const acts = actuacionesModel.value.filter((a) => {
    const d = new Date(a.fechaIso);
    return d.getFullYear() === y && d.getMonth() === m;
  });
  return [
    {
      key: 'aud',
      label: t('globalCalendar.redesignMonthSummaryAud'),
      icon: 'pi pi-calendar',
      count: acts.filter((a) => a.tipo === 'audiencia' || a.tipo === 'diligencia').length,
      accent: '#0e7490',
    },
    {
      key: 'plz',
      label: t('globalCalendar.redesignMonthSummaryDl'),
      icon: 'pi pi-flag',
      count: acts.filter((a) => a.tipo === 'plazo').length,
      accent: '#d97706',
    },
    {
      key: 'unas',
      label: t('globalCalendar.redesignMonthSummaryUnassigned'),
      icon: 'pi pi-user-plus',
      count: acts.filter((a) => !a.asignadoId).length,
      accent: 'var(--fg-muted)',
    },
  ];
});

/** Calendar days from `a` to `b` (start of local day, b − a). */
function diffCalendarDaysFromTo(a: Date, b: Date): number {
  return Math.round((startOfLocalDay(a).getTime() - startOfLocalDay(b).getTime()) / 86400000);
}

function weekRangeLabelForDate(d: Date, loc: string): string {
  const dow = (d.getDay() + 6) % 7;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  return `${monday.toLocaleDateString(loc, { day: 'numeric', month: 'short' })} – ${sunday.toLocaleDateString(loc, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })}`;
}

function monthYearTitleForDate(d: Date, loc: string): string {
  return d.toLocaleDateString(loc, { month: 'long', year: 'numeric' }).replace(/^\w/, (c) => c.toUpperCase());
}

const localeTag = computed(() => (i18nLocale.value.startsWith('es') ? 'es-PE' : 'en-US'));

const dayFrameTitle = computed(() => {
  const nav = navDate.value;
  const today = startOfLocalDay(new Date());
  const diff = diffCalendarDaysFromTo(nav, today);
  if (diff === 0) return t('globalCalendar.today');
  if (diff === -1) return t('globalCalendar.relativeYesterday');
  if (diff === 1) return t('globalCalendar.relativeTomorrow');
  const loc = localeTag.value;
  return fmtFechaLarga(nav, loc).replace(/^\w/, (c) => c.toUpperCase());
});

const dayFrameSubtitle = computed(() => {
  const nav = navDate.value;
  const today = startOfLocalDay(new Date());
  const diff = diffCalendarDaysFromTo(nav, today);
  if (diff < -1 || diff > 1) return '';
  const loc = localeTag.value;
  return nav
    .toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .replace(/^\w/, (c) => c.toUpperCase());
});

const semanaFrameWeekRange = computed(() => weekRangeLabelForDate(navDate.value, localeTag.value));

const mesFrameMonthTitle = computed(() => monthYearTitleForDate(navDate.value, localeTag.value));

const teamFrameDaySubtitle = computed(() =>
  navDate.value
    .toLocaleDateString(localeTag.value, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .replace(/^\w/, (c) => c.toUpperCase()),
);

const displayRangeTitle = computed(() => {
  if (viewMode.value === 'team') {
    return navDate.value.toLocaleDateString(i18nLocale.value, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
  const loc = i18nLocale.value.startsWith('es') ? 'es-PE' : 'en-US';
  if (viewMode.value === 'mes') {
    return monthYearTitleForDate(navDate.value, loc);
  }
  if (viewMode.value === 'semana') {
    return weekRangeLabelForDate(navDate.value, loc);
  }
  if (viewMode.value === 'expediente') {
    return t('globalCalendar.viewByMatterRangeTitle', { n: trackableOptions.value.length });
  }
  return fmtFechaLarga(navDate.value, loc).replace(/^\w/, (c) => c.toUpperCase());
});

const scopeOptions = computed((): Array<{ label: string; value: 'mine' | 'team' }> => {
  const opts: Array<{ label: string; value: 'mine' | 'team' }> = [{ label: t('globalCalendar.scopeMine'), value: 'mine' }];
  if (canViewTeam.value) opts.push({ label: t('globalCalendar.scopeFirm'), value: 'team' });
  return opts;
});

const viewButtonOptions = computed((): Array<{ label: string; value: CalViewMode; icon: string }> => {
  const base: Array<{ label: string; value: CalViewMode; icon: string }> = [
    { label: t('globalCalendar.viewHoy'), value: 'hoy', icon: '' },
    { label: t('globalCalendar.viewWeek'), value: 'semana', icon: 'pi pi-calendar' },
    { label: t('globalCalendar.viewMonth'), value: 'mes', icon: 'pi pi-th-large' },
    { label: t('globalCalendar.viewByMatter'), value: 'expediente', icon: 'pi pi-folder' },
  ];
  if (canViewTeam.value && calStore.scope === 'team') {
    base.push({ label: t('globalCalendar.viewTimeline'), value: 'team', icon: 'pi pi-users' });
  }
  return base;
});

function invalidateFetch() {
  lastFetchKey = '';
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
  const { from, toExclusive } = unionRanges({ from: start, toExclusive: endEx }, monthGridRange(d));
  await fetchEventsRange(from, toExclusive);
}

async function ensureEventsLoaded(force: boolean) {
  if (viewMode.value === 'team') return;
  const { from, toExclusive } = effectiveFetchRange(viewMode.value, navDate.value);
  const key = `${from.getTime()}__${toExclusive.getTime()}__${calStore.scope}`;
  if (!force && key === lastFetchKey) return;
  lastFetchKey = key;
  await fetchEventsRange(from, toExclusive);
}

function setViewMode(v: CalViewMode) {
  if (v === 'team' && (!canViewTeam.value || calStore.scope !== 'team')) return;
  invalidateFetch();
  viewMode.value = v;
}

watch(
  [authReady, canReadCalendar, viewMode, navDate, () => calStore.scope],
  async () => {
    if (!authReady.value || !canReadCalendar.value) return;
    if (calStore.scope === 'team' && !canViewTeam.value) {
      calStore.setScope('mine');
      return;
    }
    if (viewMode.value === 'team') await loadTeamDay();
    else await ensureEventsLoaded(false);
  },
  { immediate: true },
);

watch(
  [navDate, viewMode, displayRangeTitle],
  () => {
    if (viewMode.value === 'team') {
      setAssistantCalendarViewportSingleDay(navDate.value, {
        view: 'team',
        title: displayRangeTitle.value,
      });
      return;
    }
    const { from, toExclusive } = effectiveFetchRange(viewMode.value, navDate.value);
    const endInc = new Date(toExclusive.getTime() - 86400000);
    setAssistantCalendarViewportRange(from, endInc, {
      view: viewMode.value,
      title: displayRangeTitle.value,
    });
  },
  { immediate: true },
);

watch(searchQ, (q) => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    filterSearchQ.value = q;
    searchDebounceTimer = null;
  }, 150);
});

watch(
  () => calStore.scope,
  (s) => {
    if (s === 'mine' && viewMode.value === 'team') setViewMode('mes');
  },
);

function selectDay(d: Date) {
  navDate.value = d;
  if (viewMode.value !== 'team') viewMode.value = 'hoy';
}

function openActuacion(a: Actuacion) {
  const raw = rawEvents.value.find((r) => r.id === a.id);
  if (raw) {
    selectedApiEvent.value = raw;
    drawerVisible.value = true;
  }
}

function openComposerForExpediente(exp: Expediente) {
  composerPresetTrackableId.value = exp.id;
  composerDay.value = navDate.value;
  showComposer.value = true;
}

function onViewModeSelect(v: CalViewMode) {
  setViewMode(v);
}

function calendarPrev() {
  const d = new Date(navDate.value);
  if (viewMode.value === 'team') d.setDate(d.getDate() - 1);
  else if (viewMode.value === 'mes' || viewMode.value === 'expediente') d.setMonth(d.getMonth() - 1);
  else if (viewMode.value === 'semana') d.setDate(d.getDate() - 7);
  else d.setDate(d.getDate() - 1);
  navDate.value = d;
}

function calendarNext() {
  const d = new Date(navDate.value);
  if (viewMode.value === 'team') d.setDate(d.getDate() + 1);
  else if (viewMode.value === 'mes' || viewMode.value === 'expediente') d.setMonth(d.getMonth() + 1);
  else if (viewMode.value === 'semana') d.setDate(d.getDate() + 7);
  else d.setDate(d.getDate() + 1);
  navDate.value = d;
}

function calendarToday() {
  navDate.value = new Date();
}

function onSidebarDate(d: Date) {
  navDate.value = d;
}

function openComposer() {
  composerPresetTrackableId.value = null;
  composerDay.value = navDate.value;
  showComposer.value = true;
}

function onCreated() {
  invalidateFetch();
  if (viewMode.value === 'team') void loadTeamDay();
  else void ensureEventsLoaded(true);
}

function onTimelineSelect(ev: ApiCalendarEvent) {
  selectedApiEvent.value = ev;
  drawerVisible.value = true;
}

function onDrawerUpdated() {
  invalidateFetch();
  if (viewMode.value === 'team') void loadTeamDay();
  else void ensureEventsLoaded(true);
}

const shortcutHandlers = ref({
  onMonth: () => {
    setViewMode('mes');
  },
  onWeek: () => {
    setViewMode('semana');
  },
  onDay: () => {
    setViewMode('hoy');
  },
  onAgenda: () => {
    setViewMode('expediente');
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
.cal-redesign--product {
  container-type: inline-size;
  container-name: cal-redesign-product;
}

.cal-redesign__toolbar {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0;
  padding: 0;
  border-radius: 10px;
  border: 1px solid var(--surface-border);
  background: var(--surface-raised);
  flex-shrink: 0;
  overflow: hidden;
}
/* ─── PRIMARY HEADER: banda de tabs edge-to-edge, sin padding vertical ─── */
.cal-redesign__toolbar-primary {
  display: flex;
  flex-flow: row nowrap;
  align-items: stretch;        /* hijos se estiran al 100% de alto */
  justify-content: flex-start;
  gap: 0;
  width: 100%;
  min-width: 0;
  min-height: 2.75rem;
  padding: 0;                  /* sin padding — los botones van borde a borde */
  border-bottom: 1px solid var(--surface-border);
  background: color-mix(in srgb, var(--surface-sunken) 88%, var(--surface-raised));
}
/* Lead: solo aparece con chip de conflictos; sin padding cuando está vacío */
.cal-redesign__toolbar-primary-lead {
  flex: 0 0 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  /* Sin padding: si está vacío ocupa 0px. */
}
/* El chip de conflictos lleva su propio padding */
.cal-redesign__toolbar-track {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px 10px;
  min-width: 0;
  max-width: 100%;
  padding-inline: 14px;
  padding-block: 8px;
}
/* Tail: ocupa todo el ancho restante y se estira */
.cal-redesign__toolbar-primary-tail {
  flex: 1 1 0%;
  min-width: 0;
  display: flex;
  align-items: stretch;
}

/* toolbar-quick: sin caja propia, sólo layout de tabs */
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
/* Separador vertical: de borde a borde de la banda */
.cal-redesign__toolbar-quick-sep {
  align-self: stretch;
  width: 1px;
  min-height: 0;
  margin: 0;
  flex-shrink: 0;
  background: color-mix(in srgb, var(--surface-border) 92%, transparent);
}

/* ─── TABS INTEGRADOS: SelectButton sin caja, botones al 100% de alto ─── */
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
  overflow: visible;
}
/* Vistas: ancho natural (no estiradas), alineadas al inicio */
.cal-redesign__toolbar-quick .cal-redesign__views :deep(.p-selectbutton) {
  justify-content: flex-start;
}
/* Cada tab: sin radius, sin borde, tamaño propio, llena el alto completo */
.cal-redesign__toolbar-quick :deep(.p-togglebutton),
.cal-redesign__toolbar-quick :deep(.p-togglebutton:first-child),
.cal-redesign__toolbar-quick :deep(.p-togglebutton:last-child),
.cal-redesign__toolbar-quick :deep(.p-togglebutton:first-of-type),
.cal-redesign__toolbar-quick :deep(.p-togglebutton:last-of-type) {
  align-self: stretch;
  flex: 0 0 auto;
  height: auto;
  min-height: 2.75rem;
  border-radius: 0 !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.cal-redesign__toolbar-quick :deep(.p-togglebutton-checked),
.cal-redesign__toolbar-quick :deep(.p-togglebutton-checked:first-child),
.cal-redesign__toolbar-quick :deep(.p-togglebutton-checked:last-child) {
  border-radius: 0 !important;
  /* Misma base que la fila de filtros / toolbar-actions (surface-raised). */
  background: var(--surface-raised) !important;
  color: var(--fg-default) !important;
  border: none !important;
  box-shadow: inset 0 0 0 1px var(--surface-border) !important;
}
.cal-redesign__toolbar-quick :deep(.p-togglebutton:not(.p-togglebutton-checked)) {
  border-radius: 0 !important;
  background: transparent !important;
  color: var(--p-togglebutton-color, var(--fg-default)) !important;
}
/* El span interno (Aura) no debe pintar “pastilla” redondeada encima del botón */
.cal-redesign__toolbar-quick :deep(.p-togglebutton .p-togglebutton-content),
.cal-redesign__toolbar-quick :deep(.p-togglebutton-checked .p-togglebutton-content) {
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  color: inherit !important;
}
/* El contenido ocupa el 100% del botón sin huecos */
.cal-redesign__toolbar-quick :deep(.p-togglebutton-content) {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 2.75rem;
  width: 100%;
  padding-block: 0;
  padding-inline: 0.6rem 0.7rem;
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
  overflow: visible;
}
.cal-redesign__toolbar-add {
  justify-self: end;
  width: max-content;
}
.cal-redesign__toolbar-filters-inline {
  min-width: 0;
  max-width: 100%;
  display: flex;
  align-items: center;
  overflow-x: hidden;
  overflow-y: visible;
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
  border-radius: 9999;
  font-size: 8.5px;
  font-weight: 700;
  font-feature-settings: 'tnum' 1;
  line-height: 1;
  box-sizing: border-box;
  border: 1.5px solid color-mix(in srgb, currentColor 55%, transparent);
  color: inherit;
  opacity: 0.92;
}
.cal-redesign__views :deep(.p-togglebutton-checked) .cal-redesign__view-dayball {
  background: color-mix(in srgb, var(--brand-zafiro, var(--accent)) 14%, var(--surface-raised));
  color: var(--brand-zafiro, var(--accent));
  border-color: color-mix(in srgb, var(--brand-zafiro, var(--accent)) 40%, var(--surface-border));
  opacity: 1;
}

@container cal-redesign-product (max-width: 720px) {
  .cal-redesign__toolbar-primary {
    flex-direction: column;
    min-height: 0;
  }
  .cal-redesign__toolbar-primary-lead {
    padding-block: 6px;
    width: 100%;
  }
  .cal-redesign__toolbar-primary-tail {
    width: 100%;
  }
  .cal-redesign__toolbar-track {
    flex-wrap: wrap;
    max-width: none;
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
    min-width: 0;
    margin: 0;
    align-self: stretch;
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
  .cal-redesign__scope :deep(.p-selectbutton),
  .cal-redesign__views :deep(.p-selectbutton) {
    width: 100%;
    min-height: 2.75rem;
    flex-wrap: wrap;
    justify-content: flex-start;
    row-gap: 2px;
  }
  /* toolbar-actions sigue en grid (búsqueda | filtros | agregar) para no separar
   * filtros y botón cuando el panel producto es estrecho pero el viewport no. */
}
</style>
