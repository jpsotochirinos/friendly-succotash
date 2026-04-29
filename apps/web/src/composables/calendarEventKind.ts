import type { ApiCalendarEvent } from '@/composables/useCalendarAdapter';

/** Discriminator for sidebar filters (client-side). */
export type CalendarFilterKind =
  | 'hearing'
  | 'deadline'
  | 'meeting'
  | 'call'
  | 'task'
  | 'filing'
  | 'other'
  | 'birthday'
  | 'external'
  | 'peruHoliday';

export type CalendarPriorityFilter = 'low' | 'normal' | 'high' | 'urgent';

export type CalendarFiltersState = {
  kinds: CalendarFilterKind[];
  priorities: CalendarPriorityFilter[];
  assignees: string[];
  trackables: string[];
};

export function defaultCalendarFilters(): CalendarFiltersState {
  return { kinds: [], priorities: [], assignees: [], trackables: [] };
}

/** Classify an API event for filtering and legend dots. */
export function classifyApiEvent(e: ApiCalendarEvent): CalendarFilterKind {
  if (e.source === 'birthday') return 'birthday';
  if (e.source === 'public_holiday_pe') return 'peruHoliday';
  if (e.source === 'external') return 'external';
  if (e.source !== 'workflow') return 'other';

  const xp = e.extendedProps || {};
  if (xp.isLegalDeadline === true) return 'deadline';

  const k = String(xp.kind || '').toLowerCase();
  if (k.includes('audi')) return 'hearing';
  if (k.includes('reunion') || k.includes('reunión') || k === 'meeting') return 'meeting';
  if (k.includes('llamada') || k === 'call') return 'call';
  if (k.includes('tarea') || k === 'task') return 'task';
  if (k.includes('present') || k.includes('filing') || k.includes('escrito')) return 'filing';
  return 'other';
}

export function eventPriority(e: ApiCalendarEvent): CalendarPriorityFilter {
  const p = e.extendedProps?.priority;
  if (p === 'low' || p === 'normal' || p === 'high' || p === 'urgent') return p;
  return 'normal';
}

export function matchesCalendarFilters(e: ApiCalendarEvent, f: CalendarFiltersState): boolean {
  /* Cumpleaños y feriados Perú siempre visibles: los filtros del panel solo aplican a actividades de expediente. */
  if (e.source === 'birthday' || e.source === 'public_holiday_pe') return true;

  if (f.kinds.length > 0 && !f.kinds.includes(classifyApiEvent(e))) return false;

  if (f.priorities.length > 0) {
    if (e.source !== 'workflow') {
      /* non-workflow events have no priority — hide if any priority filter active */
      return false;
    }
    if (!f.priorities.includes(eventPriority(e))) return false;
  }

  if (f.assignees.length > 0) {
    if (e.source !== 'workflow') return false;
    const aid = String((e.extendedProps?.assignedToId as string) || '').trim();
    const isUn = !aid;
    const sel = new Set(f.assignees);
    const wantsUn = sel.has('__unassigned');
    const idOnly = [...sel].filter((id) => id !== '__unassigned');
    const matchUn = isUn && wantsUn;
    const matchId = !isUn && idOnly.length > 0 && idOnly.includes(aid);
    if (wantsUn && idOnly.length > 0) {
      if (!matchUn && !matchId) return false;
    } else if (wantsUn && idOnly.length === 0) {
      if (!isUn) return false;
    } else {
      if (!aid || !idOnly.includes(aid)) return false;
    }
  }

  if (f.trackables.length > 0) {
    if (e.source !== 'workflow') return false;
    const tid = String(e.extendedProps?.trackableId || '');
    if (!tid || !f.trackables.includes(tid)) return false;
  }

  return true;
}

/** Dot colors for mini calendar (Tailwind bg-* class suffix or hex via inline). */
export function kindDotClass(kind: CalendarFilterKind): string {
  switch (kind) {
    case 'hearing':
      return 'bg-sky-500';
    case 'deadline':
      return 'bg-amber-600';
    case 'meeting':
      return 'bg-violet-500';
    case 'call':
      return 'bg-cyan-500';
    case 'task':
      return 'bg-slate-500';
    case 'filing':
      return 'bg-emerald-600';
    case 'birthday':
      return 'bg-pink-400';
    case 'external':
      return 'bg-indigo-400';
    case 'peruHoliday':
      return 'bg-teal-500';
    default:
      return 'bg-blue-500';
  }
}
