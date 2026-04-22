const TZ = 'America/Lima';

type SqlConn = { execute: (sql: string, params?: unknown[]) => Promise<unknown> };

function ymdInTz(d: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  return `${y}-${m}-${day}`;
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d) + days * 86400000);
  return dt.toISOString().slice(0, 10);
}

function longDateEs(d: Date): string {
  return d.toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: TZ,
  });
}

export async function buildGroupBriefingText(
  conn: SqlConn,
  organizationId: string,
): Promise<string> {
  const now = new Date();
  const dayLabel = longDateEs(now);
  const ymd = ymdInTz(now, TZ);
  const in48h = addDaysYmd(ymd, 2);

  const activeTrackables = (await conn.execute(
    `SELECT COUNT(*)::int AS c FROM trackables t
     WHERE t.organization_id = ?
       AND t.status NOT IN ('archived', 'completed')`,
    [organizationId],
  )) as { c: number }[];
  const activeCount = activeTrackables[0]?.c ?? 0;

  const dueSoon = (await conn.execute(
    `SELECT wi.title, t.title AS trackable_title, wi.due_date::text AS due_date
     FROM workflow_items wi
     INNER JOIN trackables t ON t.id = wi.trackable_id
     INNER JOIN workflow_states ws ON ws.id = wi.current_state_id
     WHERE wi.organization_id = ?
       AND wi.due_date IS NOT NULL
       AND wi.due_date::date <= ?::date
       AND wi.due_date::date >= ?::date
       AND ws.category NOT IN ('done', 'cancelled')
     ORDER BY wi.due_date ASC
     LIMIT 5`,
    [organizationId, in48h, ymd],
  )) as { title: string; trackable_title: string; due_date: string }[];

  const hearings = (await conn.execute(
    `SELECT cie.title, cie.starts_at::text AS starts_at
     FROM calendar_imported_events cie
     WHERE cie.organization_id = ?
       AND cie.starts_at::date = ?::date
     ORDER BY cie.starts_at ASC
     LIMIT 5`,
    [organizationId, ymd],
  )) as { title: string; starts_at: string }[];

  let dueLine = '';
  if (dueSoon.length) {
    const d0 = dueSoon[0];
    dueLine = `⚠️ Vencimientos próximos (48h): ${d0.trackable_title} → ${d0.title} → ${d0.due_date.slice(0, 10)}`;
  } else {
    dueLine = '⚠️ Sin vencimientos críticos en 48h.';
  }

  let hearLine = '';
  if (hearings.length) {
    hearLine = `🗓️ Audiencias hoy: ${hearings.map((h) => `${h.title} (${h.starts_at.slice(11, 16)})`).join('; ')}`;
  } else {
    hearLine = '🗓️ Sin audiencias importadas hoy.';
  }

  return [
    `📋 *Alega — Resumen del día — ${dayLabel}*`,
    '',
    `📁 Expedientes activos hoy: ${activeCount}`,
    dueLine,
    hearLine,
    '',
    '_Para detalles escribe @Alega + tu consulta_',
  ].join('\n');
}

export async function buildPersonalBriefingText(
  conn: SqlConn,
  organizationId: string,
  userId: string,
): Promise<string> {
  const ymd = ymdInTz(new Date(), TZ);

  const userRow = (await conn.execute(
    `SELECT first_name, email FROM users WHERE id = ? AND organization_id = ?`,
    [userId, organizationId],
  )) as { first_name: string | null; email: string }[];
  const name = userRow[0]?.first_name || userRow[0]?.email || 'colega';

  const tasks = (await conn.execute(
    `SELECT wi.title, wi.due_date::text AS due_date, t.title AS trackable_title
     FROM workflow_items wi
     INNER JOIN trackables t ON t.id = wi.trackable_id
     INNER JOIN workflow_states ws ON ws.id = wi.current_state_id
     WHERE wi.organization_id = ?
       AND wi.assigned_to_id = ?
       AND ws.category NOT IN ('done', 'cancelled')
       AND (wi.due_date IS NULL OR wi.due_date::date >= ?::date)
     ORDER BY wi.due_date NULLS LAST
     LIMIT 8`,
    [organizationId, userId, ymd],
  )) as { title: string; due_date: string | null; trackable_title: string }[];

  const hearings = (await conn.execute(
    `SELECT cie.title, cie.starts_at::text AS starts_at
     FROM calendar_imported_events cie
     WHERE cie.organization_id = ?
       AND cie.starts_at::date = ?::date
     ORDER BY cie.starts_at ASC
     LIMIT 6`,
    [organizationId, ymd],
  )) as { title: string; starts_at: string }[];

  const lines: string[] = [
    `Buenos días, ${name} 👋`,
    '',
    '*Tu agenda de hoy:*',
  ];
  if (hearings.length) {
    for (const h of hearings) {
      lines.push(`• ${h.starts_at.slice(11, 16)} — _${h.title}_`);
    }
  } else {
    lines.push('• Sin audiencias en calendario importado para hoy.');
  }
  if (tasks.length) {
    for (const t of tasks.slice(0, 5)) {
      const due = t.due_date ? ` (vence ${t.due_date.slice(0, 10)})` : '';
      lines.push(`• Tarea: ${t.title} — ${t.trackable_title}${due}`);
    }
  }
  lines.push('', '¿Quieres que te recuerde algo? Escríbeme directamente.');
  return lines.join('\n');
}

export function shouldRunBriefingForCron(briefingCron: string, now: Date): boolean {
  const parts = briefingCron.trim().split(/\s+/);
  if (parts.length < 2) return false;
  const minutePart = parts[0];
  const hourPart = parts[1];
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const p = fmt.formatToParts(now);
  const h = Number(p.find((x) => x.type === 'hour')?.value);
  const m = Number(p.find((x) => x.type === 'minute')?.value);
  if (minutePart !== '*' && Number(minutePart) !== m) return false;
  if (hourPart !== '*' && Number(hourPart) !== h) return false;
  return true;
}
