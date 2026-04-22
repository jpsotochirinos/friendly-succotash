import { computed, type Ref } from 'vue';
import { apiClient } from '@/api/client';
import { getHolidayLabel, toLocalDateStr } from '@/utils/holidays';

export type GlobalCalendarItem = {
  id: string;
  title: string;
  status: string;
  kind: string | null;
  startDate: string | null;
  dueDate: string | null;
  trackableId: string;
  trackableTitle: string;
};

export type GlobalCalendarCell = {
  dateStr: string;
  day: number;
  currentMonth: boolean;
  isToday: boolean;
  holidayLabel: string | null;
  events: GlobalCalendarItem[];
  /** Unique trackables with activity this day (for compact cell). */
  trackableSummaries: { trackableId: string; trackableTitle: string }[];
};

export type CalendarViewMode = 'month' | 'week' | 'day';

export const WEEK_DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function toLocalDayString(iso: string | null | undefined): string | null {
  if (iso == null || iso === '') return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return toLocalDateStr(d);
}

/** Same day-inclusion rule as ExpedienteView calendar, using local calendar dates. */
export function workflowItemOnLocalDay(dateStr: string, item: Pick<GlobalCalendarItem, 'startDate' | 'dueDate'>): boolean {
  const itemStart = item.startDate ? toLocalDayString(item.startDate) : null;
  const itemEnd = item.dueDate ? toLocalDayString(item.dueDate) : null;
  if (!itemStart && !itemEnd) return false;
  if (itemStart && itemEnd) return dateStr >= itemStart && dateStr <= itemEnd;
  if (itemStart) return dateStr === itemStart;
  if (itemEnd) return dateStr === itemEnd;
  return false;
}

export function normalizeCalendarRow(row: Record<string, unknown>): GlobalCalendarItem {
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    status: String(row.status ?? ''),
    kind: row.kind != null ? String(row.kind) : null,
    startDate: row.start_date != null ? String(row.start_date) : null,
    dueDate: row.due_date != null ? String(row.due_date) : null,
    trackableId: String(row.trackable_id),
    trackableTitle: String(row.trackable_title ?? ''),
  };
}

export function getCalendarGridMeta(calendarDate: Date) {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  let startDay = firstDay.getDay() - 1;
  if (startDay < 0) startDay = 6;

  const totalCells = Math.ceil((startDay + lastDay.getDate()) / 7) * 7;

  const gridStart = new Date(firstDay);
  gridStart.setDate(gridStart.getDate() - startDay);

  const gridEnd = new Date(gridStart);
  gridEnd.setDate(gridStart.getDate() + totalCells - 1);

  return {
    year,
    month,
    startDay,
    totalCells,
    gridStart,
    gridEnd,
    from: toLocalDateStr(gridStart),
    to: toLocalDateStr(gridEnd),
  };
}

/** Lunes 00:00 local de la semana ISO que contiene `d`. */
export function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

/** Rango API visible según modo (inclusive). */
export function getVisibleDateRange(calendarDate: Date, mode: CalendarViewMode): { from: string; to: string } {
  if (mode === 'month') {
    const { from, to } = getCalendarGridMeta(calendarDate);
    return { from, to };
  }
  if (mode === 'week') {
    const mon = startOfWeekMonday(calendarDate);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { from: toLocalDateStr(mon), to: toLocalDateStr(sun) };
  }
  const ds = toLocalDateStr(calendarDate);
  return { from: ds, to: ds };
}

function uniqueTrackableSummaries(events: GlobalCalendarItem[]): { trackableId: string; trackableTitle: string }[] {
  const map = new Map<string, string>();
  for (const ev of events) {
    if (!map.has(ev.trackableId)) map.set(ev.trackableId, ev.trackableTitle || ev.trackableId);
  }
  return [...map.entries()]
    .map(([trackableId, trackableTitle]) => ({ trackableId, trackableTitle }))
    .sort((a, b) => a.trackableTitle.localeCompare(b.trackableTitle, 'es'));
}

function buildCell(
  cellDate: Date,
  items: GlobalCalendarItem[],
  currentMonth: boolean,
): GlobalCalendarCell {
  const dateStr = toLocalDateStr(cellDate);
  const holidayLabel = getHolidayLabel(dateStr, cellDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const t0 = new Date(cellDate);
  t0.setHours(0, 0, 0, 0);

  const events = items.filter((item) => workflowItemOnLocalDay(dateStr, item));
  const trackableSummaries = uniqueTrackableSummaries(events);

  return {
    dateStr,
    day: cellDate.getDate(),
    currentMonth,
    isToday: t0.getTime() === today.getTime(),
    holidayLabel,
    events,
    trackableSummaries,
  };
}

export type GroupedDayDetail = {
  trackableId: string;
  trackableTitle: string;
  items: GlobalCalendarItem[];
};

export function groupEventsByTrackable(events: GlobalCalendarItem[]): GroupedDayDetail[] {
  const by = new Map<string, GlobalCalendarItem[]>();
  for (const ev of events) {
    const list = by.get(ev.trackableId) ?? [];
    list.push(ev);
    by.set(ev.trackableId, list);
  }
  return [...by.entries()]
    .map(([trackableId, items]) => ({
      trackableId,
      trackableTitle: items[0]?.trackableTitle ?? trackableId,
      items: items.slice().sort((a, b) => a.title.localeCompare(b.title, 'es')),
    }))
    .sort((a, b) => a.trackableTitle.localeCompare(b.trackableTitle, 'es'));
}

const TRACKABLE_CHIP_PALETTE = [
  'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200',
  'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200',
  'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200',
  'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200',
  'bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-200',
  'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200',
  'bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-200',
];

export function trackableChipClass(trackableId: string): string {
  let hash = 0;
  for (let i = 0; i < trackableId.length; i++) {
    hash = (hash + trackableId.charCodeAt(i) * (i + 1)) % 997;
  }
  return TRACKABLE_CHIP_PALETTE[Math.abs(hash) % TRACKABLE_CHIP_PALETTE.length];
}

function formatWeekRangeLabel(weekStart: Date, weekEnd: Date): string {
  if (
    weekStart.getMonth() === weekEnd.getMonth() &&
    weekStart.getFullYear() === weekEnd.getFullYear()
  ) {
    const endStr = weekEnd.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return `${weekStart.getDate()} – ${endStr}`;
  }
  const a = weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  const b = weekEnd.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${a} – ${b}`;
}

export function useGlobalWorkflowCalendar(
  items: Ref<GlobalCalendarItem[]>,
  calendarDate: Ref<Date>,
  viewMode: Ref<CalendarViewMode>,
) {
  const calendarCells = computed((): GlobalCalendarCell[] => {
    const mode = viewMode.value;
    const rawItems = items.value;

    if (mode === 'month') {
      const meta = getCalendarGridMeta(calendarDate.value);
      const { month, totalCells, gridStart } = meta;
      const cells: GlobalCalendarCell[] = [];
      for (let i = 0; i < totalCells; i++) {
        const cellDate = new Date(gridStart);
        cellDate.setDate(gridStart.getDate() + i);
        const currentMonth = cellDate.getMonth() === month;
        cells.push(buildCell(cellDate, rawItems, currentMonth));
      }
      return cells;
    }

    if (mode === 'week') {
      const mon = startOfWeekMonday(calendarDate.value);
      const cells: GlobalCalendarCell[] = [];
      for (let i = 0; i < 7; i++) {
        const cellDate = new Date(mon);
        cellDate.setDate(mon.getDate() + i);
        cells.push(buildCell(cellDate, rawItems, true));
      }
      return cells;
    }

    const d = new Date(calendarDate.value);
    d.setHours(0, 0, 0, 0);
    return [buildCell(d, rawItems, true)];
  });

  const calendarRangeLabel = computed(() => {
    const d = calendarDate.value;
    const mode = viewMode.value;
    if (mode === 'month') {
      return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    }
    if (mode === 'week') {
      const mon = startOfWeekMonday(d);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return formatWeekRangeLabel(mon, sun);
    }
    return d.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  });

  function prev() {
    const x = new Date(calendarDate.value);
    const mode = viewMode.value;
    if (mode === 'month') {
      x.setMonth(x.getMonth() - 1);
    } else if (mode === 'week') {
      x.setDate(x.getDate() - 7);
    } else {
      x.setDate(x.getDate() - 1);
    }
    calendarDate.value = x;
  }

  function next() {
    const x = new Date(calendarDate.value);
    const mode = viewMode.value;
    if (mode === 'month') {
      x.setMonth(x.getMonth() + 1);
    } else if (mode === 'week') {
      x.setDate(x.getDate() + 7);
    } else {
      x.setDate(x.getDate() + 1);
    }
    calendarDate.value = x;
  }

  function goToday() {
    calendarDate.value = new Date();
  }

  return {
    calendarCells,
    calendarRangeLabel,
    prev,
    next,
    goToday,
  };
}

export async function fetchCalendarWorkflowItemsForRange(
  from: string,
  to: string,
): Promise<GlobalCalendarItem[]> {
  const { data } = await apiClient.get('/dashboard/calendar-workflow-items', {
    params: { from, to },
  });
  const rows = (data?.data ?? data) as unknown[];
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => normalizeCalendarRow(r as Record<string, unknown>));
}

export function useCalendarDataLoader(
  items: Ref<GlobalCalendarItem[]>,
  calendarDate: Ref<Date>,
  viewMode: Ref<CalendarViewMode>,
  loading: Ref<boolean>,
  loadError: Ref<string | null>,
) {
  async function loadForVisibleGrid() {
    const { from, to } = getVisibleDateRange(calendarDate.value, viewMode.value);
    loading.value = true;
    loadError.value = null;
    try {
      items.value = await fetchCalendarWorkflowItemsForRange(from, to);
    } catch (e: unknown) {
      loadError.value = e instanceof Error ? e.message : 'Error';
      items.value = [];
    } finally {
      loading.value = false;
    }
  }

  return { loadForVisibleGrid };
}
