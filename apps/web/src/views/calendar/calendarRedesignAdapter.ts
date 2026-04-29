import type { ApiCalendarEvent } from '@/composables/useCalendarAdapter';
import { classifyApiEvent } from '@/composables/calendarEventKind';
import type { ActuacionTipo } from '@/sandbox/recipes/CalendarRedesign/urgency';
import type {
  Actuacion,
  EstadoActuacion,
  Expediente,
  Materia,
  Origen,
  Usuario,
} from '@/sandbox/recipes/CalendarRedesign/mocks';

const DEFAULT_MATERIA: Materia = 'civil';

function mapPrioridad(
  p: unknown,
): Actuacion['prioridad'] {
  if (p === 'urgent') return 'urgente';
  if (p === 'high') return 'alta';
  return 'normal';
}

function mapEstado(st: unknown): EstadoActuacion {
  const s = String(st || '').toLowerCase();
  if (s === 'closed' || s === 'skipped' || s === 'done') return 'cumplido';
  if (s === 'presented' || s === 'filed' || s === 'submitted') return 'presentado';
  if (s === 'overdue') return 'vencido';
  if (s === 'in_review' || s === 'review') return 'en_revision';
  if (s === 'ready_to_file' || s === 'ready') return 'listo_para_presentar';
  return 'pendiente';
}

function mapTipo(e: ApiCalendarEvent): ActuacionTipo {
  if (e.source === 'external') return 'hito';
  const kind = classifyApiEvent(e);
  if (kind === 'deadline') return 'plazo';
  if (kind === 'hearing') return 'audiencia';
  if (kind === 'filing') return 'hito';
  if (kind === 'meeting' || kind === 'call' || kind === 'task') return 'diligencia';
  return 'hito';
}

function mapOrigen(e: ApiCalendarEvent): Origen {
  if (e.source === 'external') return 'sinoe';
  return 'manual';
}

/** ISO string suitable for `fechaIso` (day slice + ordering). */
function eventAnchorIso(e: ApiCalendarEvent): string {
  const start = e.start;
  if (!start) return new Date().toISOString();
  if (e.allDay && e.end) {
    const xp = e.extendedProps as { isLegalDeadline?: boolean } | undefined;
    const due = xp?.isLegalDeadline === true ? e.end : e.start;
    const d = new Date(due);
    d.setUTCHours(23, 59, 0, 0);
    return d.toISOString();
  }
  return new Date(start).toISOString();
}

function horaSignificativaFor(e: ApiCalendarEvent): boolean {
  if (e.allDay) return false;
  const d = new Date(e.start);
  return !Number.isNaN(d.getTime()) && (d.getUTCHours() !== 0 || d.getUTCMinutes() !== 0);
}

/**
 * Convierte eventos de API del calendario global a `Actuacion` del rediseño.
 * Omite cumpleaños y feriados (solo actividades / externos).
 */
export function apiEventToActuacion(e: ApiCalendarEvent): Actuacion | null {
  if (e.source === 'birthday' || e.source === 'public_holiday_pe') return null;
  const tid = String(e.extendedProps?.trackableId || '').trim();
  const expedienteId = tid || `orphan:${e.id}`;
  const aid = (e.extendedProps?.assignedToId as string | undefined) ?? null;

  return {
    id: e.id,
    tipo: mapTipo(e),
    expedienteId,
    asignadoId: aid,
    fechaIso: eventAnchorIso(e),
    horaSignificativa: horaSignificativaFor(e),
    prioridad: mapPrioridad(e.extendedProps?.priority),
    estado: mapEstado(e.extendedProps?.status),
    origen: mapOrigen(e),
    titulo: e.title?.trim() || 'Actividad',
    notas: undefined,
  };
}

export function buildActuacionesFromApi(events: ApiCalendarEvent[]): Actuacion[] {
  const out: Actuacion[] = [];
  for (const e of events) {
    const a = apiEventToActuacion(e);
    if (a) out.push(a);
  }
  return out;
}

export function buildExpedientesFromTrackables(
  trackables: Array<{ label: string; value: string }>,
): Expediente[] {
  return trackables.map((t) => ({
    id: t.value,
    numero: t.value.slice(0, 8).toUpperCase(),
    caratula: t.label,
    materia: DEFAULT_MATERIA,
    organo: '',
    cliente: '',
    responsableId: '',
    estado: 'tramite',
  }));
}

export function buildUsuariosFromDirectory(
  users: Array<{ id: string; email: string; firstName?: string }>,
): Usuario[] {
  return users.map((u) => {
    const first = (u.firstName || '').trim() || u.email.split('@')[0] || 'Usuario';
    const rest = u.email.split('@')[0] || 'X';
    return {
      id: u.id,
      nombre: first,
      apellido: rest.length > 1 ? rest.slice(1) : '—',
      email: u.email,
    };
  });
}

export function findExpedienteInList(list: Expediente[], id: string): Expediente | undefined {
  return list.find((x) => x.id === id);
}
