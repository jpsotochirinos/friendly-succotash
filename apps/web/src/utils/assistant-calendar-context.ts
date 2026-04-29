import type { DatesSetArg } from '@fullcalendar/core';

function dateToYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** FullCalendar `end` is exclusive; `get_calendar_range` uses inclusive YYYY-MM-DD for `to`. */
export function setAssistantCalendarViewportFromFc(arg: DatesSetArg): void {
  try {
    const lastVisible = new Date(arg.end.getTime() - 1);
    const payload = {
      calendarView: {
        from: dateToYmdLocal(arg.start),
        to: dateToYmdLocal(lastVisible),
        view: arg.view.type,
        title: arg.view.title,
      },
    };
    sessionStorage.setItem('alega.assistant.calendar', JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

/** Single calendar day (e.g. team timeline) — same local midnight → inclusive `to`. */
export function setAssistantCalendarViewportSingleDay(
  day: Date,
  meta?: { view?: string; title?: string },
): void {
  try {
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const endExclusive = new Date(start.getTime() + 86400000);
    const lastVisible = new Date(endExclusive.getTime() - 1);
    const payload = {
      calendarView: {
        from: dateToYmdLocal(start),
        to: dateToYmdLocal(lastVisible),
        view: meta?.view,
        title: meta?.title,
      },
    };
    sessionStorage.setItem('alega.assistant.calendar', JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

/** Rango local inclusivo (`start` y `endInclusive` por fecha de calendario). */
export function setAssistantCalendarViewportRange(
  start: Date,
  endInclusive: Date,
  meta?: { view?: string; title?: string },
): void {
  try {
    const payload = {
      calendarView: {
        from: dateToYmdLocal(start),
        to: dateToYmdLocal(endInclusive),
        view: meta?.view,
        title: meta?.title,
      },
    };
    sessionStorage.setItem('alega.assistant.calendar', JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}
