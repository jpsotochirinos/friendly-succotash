import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';

/** activity_instances + stage + track + state + user (t = expediente vía process_track). */
const FROM_ACTIVITY = `
  FROM activity_instances ai
  INNER JOIN stage_instances si ON si.id = ai.stage_instance_id
  INNER JOIN process_tracks pt ON pt.id = si.process_track_id
  INNER JOIN trackables t ON t.id = pt.trackable_id
  LEFT JOIN workflow_states wst ON wst.id = ai.current_state_id
  LEFT JOIN users u ON u.id = ai.assigned_to_id
`;

const ACTIVITY_OPEN = `
  (ai.workflow_state_category IS NULL OR ai.workflow_state_category NOT IN ('done', 'cancelled'))
  AND (wst.id IS NULL OR wst.key NOT IN ('closed', 'skipped', 'validated'))
`;

@Injectable()
export class DashboardService {
  constructor(private readonly em: EntityManager) {}

  async getTrackablesByStatus(organizationId: string, trackableId?: string) {
    const conn = this.em.getConnection();
    const params: any[] = [organizationId];
    let extra = '';
    if (trackableId) {
      extra = ' AND id = ?';
      params.push(trackableId);
    }
    const result = await conn.execute(`
      SELECT status, COUNT(*) as count
      FROM trackables
      WHERE organization_id = ?${extra}
      GROUP BY status
      ORDER BY
        CASE status
          WHEN 'created' THEN 1
          WHEN 'active' THEN 2
          WHEN 'under_review' THEN 3
          WHEN 'completed' THEN 4
          WHEN 'archived' THEN 5
        END
    `, params);
    return result;
  }

  /** Counts activities by workflow state for one expediente (aligns con Kanban / motor v2). */
  async getWorkflowItemsByStatus(organizationId: string, trackableId: string) {
    const conn = this.em.getConnection();
    return conn.execute(
      `
      SELECT s.status, s.count
      FROM (
        SELECT COALESCE(wst.key, 'pending') AS status, COUNT(*)::int AS count
        ${FROM_ACTIVITY}
        WHERE ai.organization_id = ?
          AND t.id = ?
        GROUP BY COALESCE(wst.key, 'pending')
      ) s
      ORDER BY
        CASE s.status
          WHEN 'pending' THEN 1
          WHEN 'active' THEN 2
          WHEN 'in_progress' THEN 3
          WHEN 'under_review' THEN 4
          WHEN 'rejected' THEN 5
          WHEN 'validated' THEN 6
          WHEN 'closed' THEN 7
          WHEN 'skipped' THEN 8
          ELSE 99
        END
    `,
      [organizationId, trackableId],
    );
  }

  async getUpcomingDeadlines(organizationId: string, days = 14, trackableId?: string) {
    const conn = this.em.getConnection();
    const safeDays = Math.max(1, Math.min(365, Math.floor(Number(days) || 14)));
    const params: any[] = [organizationId, safeDays];
    let extra = '';
    if (trackableId) {
      extra = ' AND t.id = ?';
      params.push(trackableId);
    }
    return conn.execute(
      `
      SELECT
        ai.id, ai.title, ai.kind, wst.key AS status, ai.due_date,
        NULL::int AS depth, t.title as trackable_title, t.id as trackable_id,
        u.email as assigned_to_email, u.first_name as assigned_to_name
      ${FROM_ACTIVITY}
      WHERE ai.organization_id = ?
        AND ai.due_date IS NOT NULL
        AND ai.due_date <= CURRENT_DATE + make_interval(days => ?)
        AND ${ACTIVITY_OPEN}${extra}
      ORDER BY ai.due_date ASC
      LIMIT 50
    `,
      params,
    );
  }

  async getOverdueItems(organizationId: string, trackableId?: string) {
    const conn = this.em.getConnection();
    const params: any[] = [organizationId];
    let extra = '';
    if (trackableId) {
      extra = ' AND t.id = ?';
      params.push(trackableId);
    }
    return conn.execute(
      `
      SELECT
        ai.id, ai.title, ai.kind, wst.key AS status, ai.due_date,
        t.title as trackable_title, t.id as trackable_id,
        u.email as assigned_to_email, u.first_name as assigned_to_name
      ${FROM_ACTIVITY}
      WHERE ai.organization_id = ?
        AND ai.due_date < CURRENT_DATE
        AND ${ACTIVITY_OPEN}${extra}
      ORDER BY ai.due_date ASC
    `,
      params,
    );
  }

  async getWorkloadByUser(organizationId: string, trackableId?: string) {
    const conn = this.em.getConnection();
    const extraT = trackableId ? ' AND t.id = ?' : '';
    const params: any[] = [organizationId];
    if (trackableId) params.push(trackableId);
    params.push(organizationId);
    return conn.execute(
      `
      SELECT
        u.id as user_id,
        u.email,
        u.first_name,
        u.last_name,
        COUNT(p.id) FILTER (WHERE wst.key = 'pending') as pending_count,
        COUNT(p.id) FILTER (WHERE wst.key = 'in_progress') as in_progress_count,
        COUNT(p.id) FILTER (WHERE wst.key = 'under_review') as under_review_count,
        COUNT(p.id) as total_assigned
      FROM users u
      LEFT JOIN (
        SELECT ai.id, ai.assigned_to_id, ai.current_state_id
        FROM activity_instances ai
        INNER JOIN stage_instances si ON si.id = ai.stage_instance_id
        INNER JOIN process_tracks pt ON pt.id = si.process_track_id
        INNER JOIN trackables t ON t.id = pt.trackable_id
        LEFT JOIN workflow_states wst0 ON wst0.id = ai.current_state_id
        WHERE ai.organization_id = ?
          ${extraT}
          AND (ai.workflow_state_category IS NULL OR ai.workflow_state_category NOT IN ('done', 'cancelled'))
          AND (wst0.id IS NULL OR wst0.key NOT IN ('closed', 'skipped', 'validated'))
      ) p ON p.assigned_to_id = u.id
      LEFT JOIN workflow_states wst ON wst.id = p.current_state_id
      WHERE u.organization_id = ?
      GROUP BY u.id, u.email, u.first_name, u.last_name
      ORDER BY total_assigned DESC
    `,
      params,
    );
  }

  async getProgressByTrackable(organizationId: string, trackableId?: string) {
    const conn = this.em.getConnection();
    const params: any[] = [organizationId];
    let extra = '';
    if (trackableId) {
      extra = ' AND t.id = ?';
      params.push(trackableId);
    }
    return conn.execute(
      `
      SELECT
        t.id, t.title, t.status, t.due_date,
        COUNT(a.id) as total_items,
        COUNT(*) FILTER (WHERE
          (ws.key IN ('closed', 'validated', 'skipped'))
          OR (a.workflow_state_category = 'done')
        ) as completed_items,
        CASE
          WHEN COUNT(a.id) > 0
          THEN ROUND(
            COUNT(*) FILTER (WHERE
              (ws.key IN ('closed', 'validated', 'skipped'))
              OR (a.workflow_state_category = 'done')
            )::numeric
            / COUNT(a.id)::numeric * 100, 1
          )
          ELSE 0
        END as progress_pct
      FROM trackables t
      LEFT JOIN (
        SELECT
          ai.id, ai.current_state_id, ai.workflow_state_category,
          pt.trackable_id AS exp_id
        FROM activity_instances ai
        INNER JOIN stage_instances si ON si.id = ai.stage_instance_id
        INNER JOIN process_tracks pt ON pt.id = si.process_track_id
      ) a ON a.exp_id = t.id
      LEFT JOIN workflow_states ws ON ws.id = a.current_state_id
      WHERE t.organization_id = ?
        AND t.status != 'archived'${extra}
      GROUP BY t.id, t.title, t.status, t.due_date
      ORDER BY t.created_at DESC
    `,
      params,
    );
  }

  async getRecentActivity(organizationId: string, limit = 20) {
    return this.em.find('ActivityLog', { organization: organizationId } as any, {
      orderBy: { createdAt: 'DESC' } as any,
      limit,
      populate: ['user'] as any,
      filters: false,
    });
  }

  /**
   * Resumen para la vista Inicio: contadores org-wide, listas de tareas asignadas al usuario,
   * actividad reciente en la organización.
   */
  async getHomeDashboard(organizationId: string, userId: string) {
    const conn = this.em.getConnection();
    const openAct = `(
      (ai.workflow_state_category IS NULL OR ai.workflow_state_category NOT IN ('done', 'cancelled'))
      AND (wst.id IS NULL OR wst.key NOT IN ('closed', 'skipped', 'validated'))
    )`;

    const [
      activeRes,
      urgentRes,
      todayRes,
      overdueRes,
      priorityRows,
      recentRows,
    ] = await Promise.all([
      conn.execute(
        `
        SELECT COUNT(*)::int AS c FROM trackables
        WHERE organization_id = ? AND status IN ('active', 'under_review')
      `,
        [organizationId],
      ),
      conn.execute(
        `
        SELECT COUNT(*)::int AS c
        ${FROM_ACTIVITY}
        WHERE ai.organization_id = ?
          AND ${openAct}
          AND ai.is_legal_deadline = true
      `,
        [organizationId],
      ),
      conn.execute(
        `
        SELECT COUNT(*)::int AS c
        ${FROM_ACTIVITY}
        WHERE ai.organization_id = ?
          AND ${openAct}
          AND ai.due_date IS NOT NULL
          AND ai.due_date::date = CURRENT_DATE
      `,
        [organizationId],
      ),
      conn.execute(
        `
        SELECT COUNT(*)::int AS c
        ${FROM_ACTIVITY}
        WHERE ai.organization_id = ?
          AND ${openAct}
          AND ai.due_date IS NOT NULL
          AND ai.due_date::date < CURRENT_DATE
      `,
        [organizationId],
      ),
      conn.execute(
        `
        SELECT
          ai.id, ai.title, ai.kind, wstp.key AS status, ai.due_date,
          t.id as trackable_id, t.title as trackable_title
        ${FROM_ACTIVITY.replaceAll('wst', 'wstp')}
        WHERE ai.organization_id = ?
          AND ai.assigned_to_id = ?
          AND ( (ai.workflow_state_category IS NULL OR ai.workflow_state_category NOT IN ('done', 'cancelled'))
            AND (wstp.id IS NULL OR wstp.key NOT IN ('closed', 'skipped', 'validated')) )
        ORDER BY
          CASE WHEN ai.due_date IS NOT NULL AND ai.due_date::date < CURRENT_DATE THEN 0 ELSE 1 END,
          ai.due_date ASC NULLS LAST,
          ai.created_at DESC
        LIMIT 5
      `,
        [organizationId, userId],
      ),
      conn.execute(
        `
        SELECT
          ai.id, ai.title, ai.kind, wst2.key AS status, ai.due_date,
          t.id as trackable_id, t.title as trackable_title
        ${FROM_ACTIVITY.replaceAll('wst', 'wst2')}
        WHERE ai.organization_id = ?
          AND ai.assigned_to_id = ?
          AND ( (ai.workflow_state_category IS NULL OR ai.workflow_state_category NOT IN ('done', 'cancelled'))
            AND (wst2.id IS NULL OR wst2.key NOT IN ('closed', 'skipped', 'validated')) )
        ORDER BY ai.updated_at DESC
        LIMIT 5
      `,
        [organizationId, userId],
      ),
    ]);

    const recentActivity = await this.getRecentActivityForHome(organizationId);

    const num = (row: { c?: number | string } | undefined) =>
      Number(row?.c ?? 0);

    return {
      activeTrackables: num(activeRes[0] as { c?: number | string }),
      urgentTasks: num(urgentRes[0] as { c?: number | string }),
      dueTodayTasks: num(todayRes[0] as { c?: number | string }),
      overdueTasks: num(overdueRes[0] as { c?: number | string }),
      priorityTasks: priorityRows,
      recentTasks: recentRows,
      recentActivity,
    };
  }

  private async getRecentActivityForHome(organizationId: string, limit = 8) {
    const rows = await this.em.find('ActivityLog', { organization: organizationId } as any, {
      orderBy: { createdAt: 'DESC' } as any,
      limit,
      populate: ['user', 'trackable'] as any,
      filters: false,
    });
    return (rows as any[]).map((r) => {
      const u = r.user;
      const userLabel = u
        ? [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || null
        : null;
      return {
        id: r.id,
        action: r.action,
        entityType: r.entityType,
        createdAt: r.createdAt,
        trackableTitle: r.trackable?.title ?? null,
        userLabel,
      };
    });
  }

  async getGlobalActions(
    organizationId: string,
    filters?: {
      status?: string;
      assignedToId?: string;
      kind?: string;
      overdue?: boolean;
      page?: number;
      limit?: number;
      trackableId?: string;
    },
  ) {
    const conn = this.em.getConnection();
    const params: any[] = [organizationId];
    let whereClause = 'WHERE ai.organization_id = ?';

    if (filters?.trackableId) {
      whereClause += ' AND t.id = ?';
      params.push(filters.trackableId);
    }
    if (filters?.status) {
      whereClause += ' AND wst.key = ?';
      params.push(filters.status);
    }
    if (filters?.assignedToId) {
      whereClause += ' AND ai.assigned_to_id = ?';
      params.push(filters.assignedToId);
    }
    if (filters?.kind) {
      whereClause += ' AND ai.kind = ?';
      params.push(filters.kind);
    }
    if (filters?.overdue) {
      whereClause += ` AND ai.due_date < CURRENT_DATE AND ${ACTIVITY_OPEN}`;
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const offset = (page - 1) * limit;

    const fromGa = `FROM activity_instances ai
      INNER JOIN stage_instances si ON si.id = ai.stage_instance_id
      INNER JOIN process_tracks pt ON pt.id = si.process_track_id
      INNER JOIN trackables t ON t.id = pt.trackable_id
      LEFT JOIN workflow_states wst ON wst.id = ai.current_state_id
      LEFT JOIN users u ON ai.assigned_to_id = u.id`;

    const countResult = await conn.execute(
      `SELECT COUNT(*) as total ${fromGa} ${whereClause}`,
      params,
    );

    const items = await conn.execute(
      `
      SELECT
        ai.id, ai.title, ai.kind, ai.action_type, wst.key AS status,
        ai.due_date, ai.start_date, NULL::int as depth, NULL::int as sort_order,
        t.id as trackable_id, t.title as trackable_title,
        u.id as assigned_to_id, u.email as assigned_to_email,
        u.first_name as assigned_to_name
      ${fromGa}
      ${whereClause}
      ORDER BY
        CASE WHEN ai.due_date < CURRENT_DATE AND (wst.id IS NULL OR wst.key NOT IN ('closed', 'skipped', 'validated')) THEN 0 ELSE 1 END,
        ai.due_date ASC NULLS LAST,
        ai.created_at DESC
      LIMIT ? OFFSET ?
    `,
      [...params, limit, offset],
    );

    return {
      data: items,
      total: parseInt(countResult[0]?.total || '0', 10),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult[0]?.total || '0', 10) / limit),
    };
  }

  /**
   * Workflow items with dates overlapping a calendar grid window (inclusive).
   * Mirrors frontend day logic: range between start/due, or single day when only one is set.
   * Hard cap to limit abuse on very wide ranges.
   */
  async getCalendarWorkflowItems(organizationId: string, from: string, to: string) {
    const conn = this.em.getConnection();
    const params: unknown[] = [
      organizationId,
      to,
      from,
      from,
      to,
      from,
      to,
    ];
    const items = await conn.execute(
      `
      SELECT
        ai.id, ai.title, ai.kind, ai.action_type, wstc.key AS status,
        ai.due_date, ai.start_date, NULL::int as depth, NULL::int as sort_order,
        t.id as trackable_id, t.title as trackable_title,
        u.id as assigned_to_id, u.email as assigned_to_email,
        u.first_name as assigned_to_name
      FROM activity_instances ai
      INNER JOIN stage_instances si ON si.id = ai.stage_instance_id
      INNER JOIN process_tracks pt ON pt.id = si.process_track_id
      INNER JOIN trackables t ON t.id = pt.trackable_id
      LEFT JOIN workflow_states wstc ON wstc.id = ai.current_state_id
      LEFT JOIN users u ON ai.assigned_to_id = u.id
      WHERE ai.organization_id = ?
        AND (ai.start_date IS NOT NULL OR ai.due_date IS NOT NULL)
        AND (
          (
            ai.start_date IS NOT NULL AND ai.due_date IS NOT NULL
            AND ai.start_date::date <= ?::date AND ai.due_date::date >= ?::date
          )
          OR (
            ai.start_date IS NOT NULL AND ai.due_date IS NULL
            AND ai.start_date::date BETWEEN ?::date AND ?::date
          )
          OR (
            ai.start_date IS NULL AND ai.due_date IS NOT NULL
            AND ai.due_date::date BETWEEN ?::date AND ?::date
          )
        )
      ORDER BY ai.due_date ASC NULLS LAST, ai.start_date ASC NULLS LAST, ai.created_at DESC
      LIMIT 3000
    `,
      params,
    );
    return { data: items };
  }
}
