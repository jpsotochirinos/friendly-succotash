import type { EventInput } from '@fullcalendar/core';

export type ApiCalendarEvent = {
  id: string;
  source: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  extendedProps: Record<string, unknown>;
};

function sourceClass(source: string): string {
  return `fc-source-${source.replace(/[^a-z0-9]+/gi, '-')}`;
}

export function apiEventToFullCalendar(ev: ApiCalendarEvent): EventInput {
  const wi = ev.extendedProps?.workflowItemId as string | undefined;
  const ai = ev.extendedProps?.activityInstanceId as string | undefined;
  const editable = ev.source === 'workflow' && (!!wi || !!ai);

  const classNames: string[] = [sourceClass(ev.source)];

  if (ev.source === 'workflow') {
    const pr = (ev.extendedProps?.priority as string) || 'normal';
    classNames.push(`fc-priority-${pr}`);
    classNames.push(`fc-pri-tint-${pr}`);
    const st = ev.extendedProps?.status as string;
    if (st === 'closed' || st === 'skipped') classNames.push('fc-done');
    const kind = (ev.extendedProps?.kind as string) || '';
    if (kind) classNames.push(`fc-kind-${slugKind(kind)}`);
  } else if (ev.source === 'public_holiday_pe') {
    classNames.push('fc-peru-holiday');
  } else {
    classNames.push('fc-event-non-workflow');
  }

  return {
    id: ev.id,
    title: ev.title,
    start: ev.start,
    end: ev.end,
    allDay: ev.allDay,
    editable,
    durationEditable: editable,
    startEditable: editable,
    extendedProps: {
      ...ev.extendedProps,
      source: ev.source,
      rawId: ev.id,
    },
    classNames,
  };
}

function slugKind(k: string): string {
  return k
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 32);
}

/**
 * Calendario: ids `ai:uuid` (motor v2) o `wi:uuid` (legacy). El PATCH /calendar/events/... acepta el id con prefijo.
 */
export function parseActivityIdFromEventId(id: string): { kind: 'ai' | 'wi'; id: string } | null {
  if (id.startsWith('ai:')) return { kind: 'ai', id: id.slice(3) };
  if (id.startsWith('wi:')) return { kind: 'wi', id: id.slice(3) };
  return null;
}

/** @deprecated Usar parseActivityIdFromEventId; se mantiene el uuid sin prefijo para código que busca en listas. */
export function parseWorkflowItemIdFromEventId(id: string): string | null {
  const p = parseActivityIdFromEventId(id);
  return p ? p.id : null;
}
