/**
 * Feriados solo informativos para marcación en calendario (no son actividades del flujo).
 * Incluye fechas fijas habituales (Perú + fechas internacionales comunes).
 * Amplía `EXTRA_HOLIDAYS_BY_ISO` para años concretos o añade reglas en `RECURRING_HOLIDAYS`.
 */

/** Fecha local YYYY-MM-DD (evita desfases vs UTC de `toISOString`). */
export function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Mes 0-11, día 1-31 */
const RECURRING_HOLIDAYS: ReadonlyArray<{ month0: number; day: number; label: string }> = [
  { month0: 0, day: 1, label: 'Año Nuevo' },
  { month0: 4, day: 1, label: 'Día del Trabajo' },
  { month0: 5, day: 29, label: 'San Pedro y San Pablo' },
  { month0: 6, day: 28, label: 'Fiestas Patrias' },
  { month0: 6, day: 29, label: 'Fiestas Patrias' },
  { month0: 7, day: 30, label: 'Santa Rosa de Lima' },
  { month0: 9, day: 8, label: 'Combate de Angamos' },
  { month0: 10, day: 1, label: 'Día de Todos los Santos' },
  { month0: 11, day: 8, label: 'Inmaculada Concepción' },
  { month0: 11, day: 25, label: 'Navidad' },
];

/** Feriados con fecha exacta por año (p. ej. puentes oficiales). */
const EXTRA_HOLIDAYS_BY_ISO: ReadonlyArray<{ iso: string; label: string }> = [
  { iso: '2026-01-02', label: 'Puente Año Nuevo (PE)' },
  { iso: '2026-04-02', label: 'Jueves Santo' },
  { iso: '2026-04-03', label: 'Viernes Santo' },
  { iso: '2026-06-07', label: 'Día de la Bandera (PE)' },
  { iso: '2026-10-09', label: 'Combate de Angamos (observado)' },
  { iso: '2026-12-24', label: 'Nochebuena (no laborable habitual)' },
];

/**
 * Etiqueta de feriado para una fecha local, o null si no aplica.
 */
export function getHolidayLabel(dateStr: string, localDate: Date): string | null {
  for (const { iso, label } of EXTRA_HOLIDAYS_BY_ISO) {
    if (iso === dateStr) return label;
  }
  const m = localDate.getMonth();
  const day = localDate.getDate();
  for (const h of RECURRING_HOLIDAYS) {
    if (h.month0 === m && h.day === day) return h.label;
  }
  return null;
}
