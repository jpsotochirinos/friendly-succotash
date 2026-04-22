import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { createHash, randomBytes } from 'crypto';
import { User, WorkflowItem } from '@tracker/db';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { RescheduleEventDto } from './dto/reschedule-event.dto';

export type UnifiedCalendarEvent = {
  id: string;
  source: 'workflow' | 'birthday' | 'external';
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  extendedProps: Record<string, unknown>;
};

@Injectable()
export class CalendarService {
  constructor(private readonly em: EntityManager) {}

  hasCalendarRead(permissions: string[]): boolean {
    return permissions.includes('calendar:read') || permissions.includes('trackable:read');
  }

  hasViewTeam(permissions: string[]): boolean {
    return permissions.includes('calendar:view_team');
  }

  async listEvents(
    organizationId: string,
    userId: string,
    permissions: string[],
    q: CalendarQueryDto,
  ): Promise<{ events: UnifiedCalendarEvent[] }> {
    if (!this.hasCalendarRead(permissions)) {
      throw new ForbiddenException('No calendar access');
    }

    const iso = /^\d{4}-\d{2}-\d{2}$/;
    if (!iso.test(q.from) || !iso.test(q.to)) {
      throw new BadRequestException('from and to must be YYYY-MM-DD');
    }
    const fromMs = Date.parse(`${q.from}T12:00:00`);
    const toMs = Date.parse(`${q.to}T12:00:00`);
    if (Number.isNaN(fromMs) || Number.isNaN(toMs) || fromMs > toMs) {
      throw new BadRequestException('invalid from/to range');
    }

    let scope = q.scope ?? 'team';
    if (scope === 'team' && !this.hasViewTeam(permissions)) {
      scope = 'mine';
    }

    const events: UnifiedCalendarEvent[] = [];

    const wfRows = await this.fetchWorkflowRows(organizationId, userId, q, scope);
    for (const row of wfRows) {
      events.push(this.workflowRowToEvent(row));
    }

    if (q.includeBirthdays) {
      events.push(...(await this.buildBirthdayEvents(organizationId, userId, q.from, q.to, scope)));
    }

    if (q.includeExternal !== false) {
      const ext = await this.fetchImportedEvents(organizationId, q.from, q.to);
      for (const e of ext) {
        events.push({
          id: `ext:${e.id}`,
          source: 'external',
          title: e.title,
          start: e.startsAt.toISOString(),
          end: e.endsAt.toISOString(),
          allDay: e.allDay,
          extendedProps: {
            externalId: e.externalId,
            integrationId: e.integrationId,
            body: e.body,
            provider: e.provider,
          },
        });
      }
    }

    return { events };
  }

  private async fetchWorkflowRows(
    organizationId: string,
    userId: string,
    q: CalendarQueryDto,
    scope: string,
  ): Promise<Record<string, unknown>[]> {
    const conn = this.em.getConnection();
    const params: unknown[] = [organizationId, q.to, q.from, q.from, q.to, q.from, q.to];
    let extra = '';

    if (scope === 'mine') {
      extra += ' AND wi.assigned_to_id = ?';
      params.push(userId);
    }

    if (q.trackableId) {
      extra += ' AND wi.trackable_id = ?';
      params.push(q.trackableId);
    }

    if (q.kinds?.length) {
      extra += ` AND wi.kind = ANY(ARRAY[${q.kinds.map(() => '?').join(',')}]::text[])`;
      params.push(...q.kinds);
    }

    if (q.priorities?.length) {
      extra += ` AND wi.priority = ANY(ARRAY[${q.priorities.map(() => '?').join(',')}]::text[])`;
      params.push(...q.priorities);
    }

    if (q.assignees?.length) {
      extra += ` AND wi.assigned_to_id = ANY(ARRAY[${q.assignees.map(() => '?').join(',')}]::uuid[])`;
      params.push(...q.assignees);
    }

    const sql = `
      SELECT
        wi.id, wi.title, wi.kind, wst.key AS status, wi.action_type,
        wi.due_date, wi.start_date, wi.depth, wi.sort_order,
        wi.is_legal_deadline,
        wi.location, wi.priority, wi.all_day, wi.reminder_minutes_before,
        wi.calendar_color, wi.rrule, wi.metadata, wi.accent_color,
        t.id as trackable_id, t.title as trackable_title,
        u.id as assigned_to_id, u.email as assigned_to_email,
        u.first_name as assigned_to_name
      FROM workflow_items wi
      INNER JOIN workflow_states wst ON wst.id = wi.current_state_id
      JOIN trackables t ON wi.trackable_id = t.id
      LEFT JOIN users u ON wi.assigned_to_id = u.id
      WHERE wi.organization_id = ?
        AND (wi.start_date IS NOT NULL OR wi.due_date IS NOT NULL)
        AND (
          (
            wi.start_date IS NOT NULL AND wi.due_date IS NOT NULL
            AND wi.start_date::date <= ?::date AND wi.due_date::date >= ?::date
          )
          OR (
            wi.start_date IS NOT NULL AND wi.due_date IS NULL
            AND wi.start_date::date BETWEEN ?::date AND ?::date
          )
          OR (
            wi.start_date IS NULL AND wi.due_date IS NOT NULL
            AND wi.due_date::date BETWEEN ?::date AND ?::date
          )
        )
        ${extra}
      ORDER BY wi.due_date ASC NULLS LAST, wi.start_date ASC NULLS LAST, wi.created_at DESC
      LIMIT 5000
    `;
    return conn.execute(sql, params) as Promise<Record<string, unknown>[]>;
  }

  private workflowRowToEvent(row: Record<string, unknown>): UnifiedCalendarEvent {
    const id = String(row.id);
    const start = row.start_date ? new Date(row.start_date as string).toISOString() : null;
    const end = row.due_date ? new Date(row.due_date as string).toISOString() : null;
    const allDay = row.all_day === true || row.all_day === 't' || row.all_day === 1;
    let startS = start ?? end ?? new Date().toISOString();
    let endS = end ?? start ?? startS;
    if (allDay && start && !end) {
      const d = new Date(start);
      d.setUTCHours(23, 59, 59, 999);
      endS = d.toISOString();
    }
    if (!start && end) startS = endS;

    return {
      id: `wi:${id}`,
      source: 'workflow',
      title: String(row.title ?? ''),
      start: startS,
      end: endS,
      allDay,
      extendedProps: {
        workflowItemId: id,
        kind: row.kind ?? null,
        status: row.status,
        trackableId: row.trackable_id,
        trackableTitle: row.trackable_title,
        assignedToId: row.assigned_to_id ?? null,
        assignedToEmail: row.assigned_to_email ?? null,
        assignedToName: row.assigned_to_name ?? null,
        priority: row.priority ?? 'normal',
        location: row.location ?? null,
        accentColor: row.accent_color ?? null,
        calendarColor: row.calendar_color ?? null,
        rrule: row.rrule ?? null,
        metadata: row.metadata ?? null,
        isLegalDeadline: !!row.is_legal_deadline,
      },
    };
  }

  private async buildBirthdayEvents(
    organizationId: string,
    userId: string,
    fromStr: string,
    toStr: string,
    scope: string,
  ): Promise<UnifiedCalendarEvent[]> {
    const conn = this.em.getConnection();
    const rows = (await conn.execute(
      `
        SELECT id, first_name, last_name, birth_date, email
        FROM users
        WHERE organization_id = ? AND birth_date IS NOT NULL AND is_active = true
      `,
      [organizationId],
    )) as Record<string, unknown>[];

    const out: UnifiedCalendarEvent[] = [];
    const from = this.parseYmd(fromStr);
    const to = this.parseYmd(toStr);
    if (!from || !to) return out;

    for (const r of rows) {
      const uid = String(r.id);
      if (scope === 'mine' && uid !== userId) continue;

      const bd = r.birth_date as Date | string;
      const bdDate = bd instanceof Date ? bd : new Date(String(bd));
      const month = bdDate.getUTCMonth() + 1;
      const day = bdDate.getUTCDate();

      const cur = new Date(from.getFullYear(), from.getMonth(), from.getDate());
      const endLoop = new Date(to.getFullYear(), to.getMonth(), to.getDate());
      while (cur <= endLoop) {
        if (cur.getMonth() + 1 === month && cur.getDate() === day) {
          const y = cur.getFullYear();
          const start = new Date(Date.UTC(y, month - 1, day, 12, 0, 0));
          const end = new Date(start.getTime() + 3600000);
          const name = [r.first_name, r.last_name].filter(Boolean).join(' ') || String(r.email);
          out.push({
            id: `bd:${uid}:${y}`,
            source: 'birthday',
            title: `🎂 ${name}`,
            start: start.toISOString(),
            end: end.toISOString(),
            allDay: true,
            extendedProps: {
              userId: uid,
              type: 'birthday',
            },
          });
        }
        cur.setDate(cur.getDate() + 1);
      }
    }
    return out;
  }

  private parseYmd(s: string): Date | null {
    const [y, m, d] = s.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }

  private async fetchImportedEvents(
    organizationId: string,
    from: string,
    to: string,
  ): Promise<
    Array<{
      id: string;
      title: string;
      startsAt: Date;
      endsAt: Date;
      allDay: boolean;
      externalId: string;
      integrationId: string;
      body?: string | null;
      provider: string;
    }>
  > {
    const conn = this.em.getConnection();
    const rows = (await conn.execute(
      `
      SELECT cie.id, cie.title, cie.body, cie.starts_at, cie.ends_at, cie.all_day, cie.external_id,
             cie.integration_id, ci.provider
      FROM calendar_imported_events cie
      JOIN calendar_integrations ci ON ci.id = cie.integration_id
      WHERE cie.organization_id = ?
        AND cie.starts_at::date <= ?::date
        AND cie.ends_at::date >= ?::date
      ORDER BY cie.starts_at ASC
      LIMIT 2000
    `,
      [organizationId, to, from],
    )) as Record<string, unknown>[];

    return rows.map((r) => ({
      id: String(r.id),
      title: String(r.title ?? ''),
      body: r.body as string | null | undefined,
      startsAt: new Date(r.starts_at as string),
      endsAt: new Date(r.ends_at as string),
      allDay: !!r.all_day,
      externalId: String(r.external_id),
      integrationId: String(r.integration_id),
      provider: String(r.provider ?? 'google'),
    }));
  }

  async reschedule(
    organizationId: string,
    workflowItemId: string,
    dto: RescheduleEventDto,
    permissions: string[],
  ): Promise<WorkflowItem> {
    if (!permissions.includes('workflow_item:update')) {
      throw new ForbiddenException();
    }
    const item = await this.em.findOne(WorkflowItem, {
      id: workflowItemId,
      organization: organizationId,
    });
    if (!item) throw new NotFoundException('Workflow item not found');

    if (dto.startDate !== undefined) {
      item.startDate = dto.startDate ? new Date(dto.startDate) : undefined;
    }
    if (dto.dueDate !== undefined) {
      item.dueDate = dto.dueDate ? new Date(dto.dueDate) : undefined;
    }
    if (dto.allDay !== undefined) {
      item.allDay = dto.allDay;
    }
    await this.em.flush();
    return item;
  }

  async ensureIcsToken(userId: string, organizationId: string): Promise<string> {
    const user = await this.em.findOne(User, { id: userId, organization: organizationId });
    if (!user) throw new NotFoundException();
    if (!user.calendarIcsToken) {
      user.calendarIcsToken = randomBytes(32).toString('hex');
      await this.em.flush();
    }
    return user.calendarIcsToken;
  }

  async validateIcsToken(token: string): Promise<{ userId: string; organizationId: string } | null> {
    const conn = this.em.getConnection();
    const rows = (await conn.execute(
      `SELECT id, organization_id FROM users WHERE calendar_ics_token = ? LIMIT 1`,
      [token],
    )) as { id: string; organization_id: string }[];
    if (!rows.length) return null;
    return { userId: rows[0].id, organizationId: rows[0].organization_id };
  }

  buildIcsCalendar(
    events: UnifiedCalendarEvent[],
    calName: string,
  ): string {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Alega//Calendar//ES',
      `X-WR-CALNAME:${this.escapeIcsText(calName)}`,
    ];
    for (const ev of events) {
      const uid = createHash('sha256').update(ev.id).digest('hex').slice(0, 32);
      const dtStamp = this.formatIcsDate(new Date());
      const dtStart = this.formatIcsDate(new Date(ev.start));
      const dtEnd = this.formatIcsDate(new Date(ev.end));
      lines.push('BEGIN:VEVENT', `UID:${uid}@alega`, `DTSTAMP:${dtStamp}`);
      if (ev.allDay) {
        lines.push(`DTSTART;VALUE=DATE:${dtStart.slice(0, 8)}`);
        lines.push(`DTEND;VALUE=DATE:${this.formatIcsDate(new Date(new Date(ev.end).getTime() + 86400000)).slice(0, 8)}`);
      } else {
        lines.push(`DTSTART:${dtStart}`, `DTEND:${dtEnd}`);
      }
      lines.push(`SUMMARY:${this.escapeIcsText(ev.title)}`, 'END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  private formatIcsDate(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`
      + `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
    );
  }

  private escapeIcsText(s: string): string {
    return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  }

  async updateBirthDate(userId: string, organizationId: string, birthDate: string | null | undefined) {
    const user = await this.em.findOne(User, { id: userId, organization: organizationId });
    if (!user) throw new NotFoundException();
    if (birthDate === null || birthDate === undefined || birthDate === '') {
      user.birthDate = undefined;
    } else {
      user.birthDate = new Date(birthDate);
    }
    await this.em.flush();
    return { success: true };
  }
}
