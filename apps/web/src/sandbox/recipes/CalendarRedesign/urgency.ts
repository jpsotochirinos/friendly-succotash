// Semáforo de urgencia + cómputo de días hábiles para calendar redesign sandbox.
// No depende del API: solo Date math + lista de feriados PE.

export type UrgencyLevel = 'overdue' | 'urgent' | 'warn' | 'normal' | 'info' | 'done';

export type ActuacionTipo = 'audiencia' | 'plazo' | 'notificacion_sinoe' | 'hito' | 'diligencia';

export interface FeriadoPE {
  date: string; // yyyy-mm-dd
  nombre: string;
  ambito: 'nacional' | 'lima' | 'regional';
  aplicaAPlazos: boolean;
}

/** Feriados Poder Judicial PE 2026 (subset razonable para sandbox). */
export const FERIADOS_PE_2026: FeriadoPE[] = [
  { date: '2026-01-01', nombre: 'Año Nuevo', ambito: 'nacional', aplicaAPlazos: true },
  { date: '2026-04-02', nombre: 'Jueves Santo', ambito: 'nacional', aplicaAPlazos: true },
  { date: '2026-04-03', nombre: 'Viernes Santo', ambito: 'nacional', aplicaAPlazos: true },
  { date: '2026-05-01', nombre: 'Día del Trabajo', ambito: 'nacional', aplicaAPlazos: true },
  { date: '2026-06-29', nombre: 'San Pedro y San Pablo', ambito: 'nacional', aplicaAPlazos: true },
  { date: '2026-07-28', nombre: 'Fiestas Patrias', ambito: 'nacional', aplicaAPlazos: true },
  { date: '2026-07-29', nombre: 'Fiestas Patrias', ambito: 'nacional', aplicaAPlazos: true },
  { date: '2026-08-30', nombre: 'Santa Rosa de Lima', ambito: 'nacional', aplicaAPlazos: true },
  { date: '2026-10-08', nombre: 'Combate de Angamos', ambito: 'nacional', aplicaAPlazos: true },
  { date: '2026-11-01', nombre: 'Todos los Santos', ambito: 'nacional', aplicaAPlazos: true },
  { date: '2026-12-08', nombre: 'Inmaculada Concepción', ambito: 'nacional', aplicaAPlazos: true },
  { date: '2026-12-25', nombre: 'Navidad', ambito: 'nacional', aplicaAPlazos: true },
];

const feriadoMap: Record<string, FeriadoPE> = Object.fromEntries(
  FERIADOS_PE_2026.map((f) => [f.date, f]),
);

export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isWeekend(d: Date): boolean {
  const dow = d.getDay();
  return dow === 0 || dow === 6;
}

export function getFeriado(d: Date): FeriadoPE | null {
  return feriadoMap[ymd(d)] ?? null;
}

export function isDiaHabil(d: Date): boolean {
  if (isWeekend(d)) return false;
  const f = getFeriado(d);
  return !(f && f.aplicaAPlazos);
}

/** Días hábiles entre `from` (excluido) y `to` (incluido). Negativo si to < from. */
export function diasHabiles(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  if (a.getTime() === b.getTime()) return 0;
  const dir = b > a ? 1 : -1;
  let count = 0;
  const cursor = new Date(a);
  while (cursor.getTime() !== b.getTime()) {
    cursor.setDate(cursor.getDate() + dir);
    if (isDiaHabil(cursor)) count += dir;
  }
  return count;
}

/** Mapea horizonte de plazo → nivel de urgencia (en horas o días hábiles). */
export function urgencyForPlazo(due: Date, now: Date = new Date()): UrgencyLevel {
  const ms = due.getTime() - now.getTime();
  const hours = ms / 36e5;
  if (hours < 0) return 'overdue';
  if (hours <= 24) return 'urgent';
  const habiles = diasHabiles(now, due);
  if (habiles <= 5) return 'warn';
  return 'normal';
}

export function urgencyForActuacion(
  tipo: ActuacionTipo,
  due: Date,
  estado?: string,
  now: Date = new Date(),
): UrgencyLevel {
  if (estado === 'presentado' || estado === 'cumplido') return 'done';
  if (tipo === 'audiencia' || tipo === 'diligencia') return 'info';
  return urgencyForPlazo(due, now);
}

export interface UrgencyTokens {
  level: UrgencyLevel;
  bg: string;
  text: string;
  border: string;
  bar: string;
  label: string;
}

export const URGENCY_TOKENS: Record<UrgencyLevel, UrgencyTokens> = {
  overdue: {
    level: 'overdue',
    bg: 'rgba(220,38,38,0.12)',
    text: '#7a1f19',
    border: 'rgba(220,38,38,0.28)',
    bar: '#dc2626',
    label: 'Vencido',
  },
  urgent: {
    level: 'urgent',
    bg: 'rgba(220,38,38,0.10)',
    text: '#7a1f19',
    border: 'rgba(220,38,38,0.20)',
    bar: '#dc2626',
    label: 'En 24h',
  },
  warn: {
    level: 'warn',
    bg: 'rgba(217,119,6,0.12)',
    text: '#6d3f06',
    border: 'rgba(217,119,6,0.22)',
    bar: '#d97706',
    label: '2–5 días',
  },
  normal: {
    level: 'normal',
    bg: 'rgba(12,166,120,0.12)',
    text: '#1c4023',
    border: 'rgba(12,166,120,0.22)',
    bar: '#0ca678',
    label: '> 5 días',
  },
  info: {
    level: 'info',
    bg: 'color-mix(in srgb, var(--brand-zafiro) 12%, var(--surface-raised))',
    text: 'var(--brand-zafiro)',
    border: 'color-mix(in srgb, var(--brand-zafiro) 28%, var(--surface-border))',
    bar: 'var(--brand-zafiro)',
    label: 'Audiencia',
  },
  done: {
    level: 'done',
    bg: 'var(--surface-sunken)',
    text: 'var(--fg-subtle)',
    border: 'var(--surface-border)',
    bar: 'var(--fg-subtle)',
    label: 'Cumplido',
  },
};

export const TIPO_LABEL: Record<ActuacionTipo, string> = {
  audiencia: 'Audiencia',
  plazo: 'Plazo',
  notificacion_sinoe: 'Notif. SINOE',
  hito: 'Hito',
  diligencia: 'Diligencia',
};

export const TIPO_ICON: Record<ActuacionTipo, string> = {
  audiencia: 'pi pi-megaphone',
  plazo: 'pi pi-clock',
  notificacion_sinoe: 'pi pi-inbox',
  hito: 'pi pi-flag',
  diligencia: 'pi pi-briefcase',
};

export function fmtFechaLarga(d: Date, locale = 'es-PE'): string {
  return d.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function fmtRelativo(d: Date, now: Date = new Date()): string {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((target.getTime() - start.getTime()) / 86_400_000);
  if (diffDays === 0) return 'hoy';
  if (diffDays === 1) return 'mañana';
  if (diffDays === -1) return 'ayer';
  if (diffDays > 0 && diffDays <= 7) return `en ${diffDays} días`;
  if (diffDays < 0 && diffDays >= -7) return `hace ${Math.abs(diffDays)} días`;
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
}

export function fmtHora(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
