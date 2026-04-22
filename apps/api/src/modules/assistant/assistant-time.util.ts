import { ConfigService } from '@nestjs/config';

/** YYYY-MM-DD in IANA zone; falls back to UTC on invalid zone. */
export function ymdInTimeZone(date: Date, timeZone: string): string {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = dtf.formatToParts(date);
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    if (y && m && d) return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  } catch {
    /* fall through */
  }
  return date.toISOString().slice(0, 10);
}

export function getConfiguredTimeZone(config: ConfigService): string {
  return (config.get<string>('ASSISTANT_TIMEZONE') || process.env.TZ || 'UTC').trim() || 'UTC';
}

export function todayYmd(config: ConfigService): string {
  const tz = getConfiguredTimeZone(config);
  try {
    return ymdInTimeZone(new Date(), tz);
  } catch {
    return ymdInTimeZone(new Date(), 'UTC');
  }
}

export function getNowInConfiguredTimeZone(config: ConfigService): {
  ymd: string;
  tzLabel: string;
  weekday: string;
} {
  const raw = getConfiguredTimeZone(config);
  const now = new Date();
  try {
    const ymd = ymdInTimeZone(now, raw);
    const weekday = new Intl.DateTimeFormat('es', { timeZone: raw, weekday: 'long' }).format(now);
    return { ymd, tzLabel: raw, weekday };
  } catch {
    const ymd = ymdInTimeZone(now, 'UTC');
    const weekday = new Intl.DateTimeFormat('es', { timeZone: 'UTC', weekday: 'long' }).format(now);
    return { ymd, tzLabel: 'UTC (fallback)', weekday };
  }
}
