import type { ApiCalendarEvent } from '@/composables/useCalendarAdapter';

/** Gregorian Easter Sunday (local midnight UTC-friendly). */
function easterSunday(y: number): Date {
  const a = y % 19;
  const b = Math.floor(y / 100);
  const c = y % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day);
}

function ymdParts(d: Date): { y: number; m: number; day: number } {
  return { y: d.getFullYear(), m: d.getMonth() + 1, day: d.getDate() };
}

function atLocalMidday(y: number, m: number, day: number): Date {
  return new Date(y, m - 1, day, 12, 0, 0, 0);
}

function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export type PeruHolidayRow = { ymd: string; titleEs: string };

/** Feriados nacionales Perú (fechas civiles + Semana Santa). Leyes de “puente” no aplicadas — calendario base. */
function holidaysForYear(y: number): PeruHolidayRow[] {
  const e = easterSunday(y);
  const ms = e.getTime();
  const dayMs = 86400000;
  const holyThu = new Date(ms - 3 * dayMs);
  const goodFri = new Date(ms - 2 * dayMs);

  const fixed = (
    [
      [1, 1, 'Año Nuevo'],
      [5, 1, 'Día del Trabajo'],
      [6, 29, 'San Pedro y San Pablo'],
      [7, 28, 'Fiestas Patrias'],
      [7, 29, 'Fiestas Patrias'],
      [8, 6, 'Batalla de Junín'],
      [10, 8, 'Combate de Angamos'],
      [11, 1, 'Todos los Santos'],
      [12, 8, 'Inmaculada Concepción'],
      [12, 25, 'Navidad'],
    ] as const
  ).map(([m, d, title]) => ({
    ymd: isoDay(atLocalMidday(y, m, d)),
    titleEs: title,
  }));

  const movable: PeruHolidayRow[] = [
    { ymd: isoDay(holyThu), titleEs: 'Jueves Santo' },
    { ymd: isoDay(goodFri), titleEs: 'Viernes Santo' },
  ];

  return [...fixed, ...movable].sort((a, b) => a.ymd.localeCompare(b.ymd));
}

/** Eventos sintéticos para el calendario (no vienen del API). */
export function buildPeruHolidayEvents(rangeStart: Date, rangeEndExclusive: Date): ApiCalendarEvent[] {
  const out: ApiCalendarEvent[] = [];
  const y0 = rangeStart.getFullYear();
  const y1 = rangeEndExclusive.getFullYear();
  for (let y = y0; y <= y1; y++) {
    for (const h of holidaysForYear(y)) {
      const [yy, mm, dd] = h.ymd.split('-').map(Number);
      const start = atLocalMidday(yy, mm, dd);
      if (start.getTime() >= rangeEndExclusive.getTime()) continue;
      if (start.getTime() < rangeStart.getTime()) continue;
      const end = new Date(start.getTime() + 3600000);
      out.push({
        id: `pe-holiday:${h.ymd}`,
        source: 'public_holiday_pe',
        title: `🇵🇪 ${h.titleEs}`,
        start: start.toISOString(),
        end: end.toISOString(),
        allDay: true,
        extendedProps: {
          type: 'publicHoliday',
          country: 'PE',
          holidayName: h.titleEs,
        },
      });
    }
  }
  return out;
}
