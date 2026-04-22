import type { ApiCalendarEvent } from '@/composables/useCalendarAdapter';
import { classifyApiEvent } from '@/composables/calendarEventKind';

function spanMs(ev: ApiCalendarEvent): [number, number] {
  const s = new Date(ev.start).getTime();
  let e = new Date(ev.end).getTime();
  if (ev.allDay) e = s + 86400000 - 1;
  return [s, e];
}

/** Number of unordered pairs of hearings on the same calendar day that overlap in time. */
export function countHearingOverlapPairs(dayYmd: string, events: ApiCalendarEvent[]): number {
  const hearings = events.filter(
    (e) =>
      e.source === 'workflow' &&
      classifyApiEvent(e) === 'hearing' &&
      e.start.slice(0, 10) === dayYmd,
  );
  let pairs = 0;
  for (let i = 0; i < hearings.length; i++) {
    for (let j = i + 1; j < hearings.length; j++) {
      const [a0, a1] = spanMs(hearings[i]);
      const [b0, b1] = spanMs(hearings[j]);
      if (a1 > b0 && b1 > a0) pairs++;
    }
  }
  return pairs;
}

export function listHearingOverlapPairs(dayYmd: string, events: ApiCalendarEvent[]): Array<{ a: ApiCalendarEvent; b: ApiCalendarEvent }> {
  const hearings = events.filter(
    (e) =>
      e.source === 'workflow' &&
      classifyApiEvent(e) === 'hearing' &&
      e.start.slice(0, 10) === dayYmd,
  );
  const out: Array<{ a: ApiCalendarEvent; b: ApiCalendarEvent }> = [];
  for (let i = 0; i < hearings.length; i++) {
    for (let j = i + 1; j < hearings.length; j++) {
      const [a0, a1] = spanMs(hearings[i]);
      const [b0, b1] = spanMs(hearings[j]);
      if (a1 > b0 && b1 > a0) out.push({ a: hearings[i], b: hearings[j] });
    }
  }
  return out;
}
