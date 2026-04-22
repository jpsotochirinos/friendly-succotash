import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';

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

  /** Counts workflow_items by status for one expediente (aligns with Kanban). */
  async getWorkflowItemsByStatus(organizationId: string, trackableId: string) {
    const conn = this.em.getConnection();
    return conn.execute(
      `
      SELECT wst.key AS status, COUNT(*)::int AS count
      FROM workflow_items wi
      INNER JOIN workflow_states wst ON wst.id = wi.current_state_id
      WHERE wi.organization_id = ?
        AND wi.trackable_id = ?
      GROUP BY wst.key
      ORDER BY
        CASE wst.key
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
      extra = ' AND wi.trackable_id = ?';
      params.push(trackableId);
    }
    return conn.execute(`
      SELECT
        wi.id, wi.title, wi.kind, wst.key AS status, wi.due_date,
        wi.depth, t.title as trackable_title, t.id as trackable_id,
        u.email as assigned_to_email, u.first_name as assigned_to_name
      FROM workflow_items wi
      INNER JOIN workflow_states wst ON wst.id = wi.current_state_id
      JOIN trackables t ON wi.trackable_id = t.id
      LEFT JOIN users u ON wi.assigned_to_id = u.id
      WHERE wi.organization_id = ?
        AND wi.due_date IS NOT NULL
        AND wi.due_date <= CURRENT_DATE + make_interval(days => ?)
        AND wst.key NOT IN ('closed', 'skipped', 'validated')${extra}
      ORDER BY wi.due_date ASC
      LIMIT 50
    `, params);
  }

  async getOverdueItems(organizationId: string, trackableId?: string) {
    const conn = this.em.getConnection();
    const params: any[] = [organizationId];
    let extra = '';
    if (trackableId) {
      extra = ' AND wi.trackable_id = ?';
      params.push(trackableId);
    }
    return conn.execute(`
      SELECT
        wi.id, wi.title, wi.kind, wst.key AS status, wi.due_date,
        t.title as trackable_title, t.id as trackable_id,
        u.email as assigned_to_email, u.first_name as assigned_to_name
      FROM workflow_items wi
      INNER JOIN workflow_states wst ON wst.id = wi.current_state_id
      JOIN trackables t ON wi.trackable_id = t.id
      LEFT JOIN users u ON wi.assigned_to_id = u.id
      WHERE wi.organization_id = ?
        AND wi.due_date < CURRENT_DATE
        AND wst.key NOT IN ('closed', 'skipped', 'validated')${extra}
      ORDER BY wi.due_date ASC
    `, params);
  }

  async getWorkloadByUser(organizationId: string, trackableId?: string) {
    const conn = this.em.getConnection();
    const params: any[] = [];
    let extraJoin = '';
    if (trackableId) {
      extraJoin = ' AND wi.trackable_id = ?';
      params.push(trackableId);
    }
    params.push(organizationId);
    return conn.execute(`
      SELECT
        u.id as user_id,
        u.email,
        u.first_name,
        u.last_name,
        COUNT(*) FILTER (WHERE wst.key = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE wst.key = 'in_progress') as in_progress_count,
        COUNT(*) FILTER (WHERE wst.key = 'under_review') as under_review_count,
        COUNT(*) as total_assigned
      FROM users u
      LEFT JOIN workflow_items wi ON wi.assigned_to_id = u.id${extraJoin}
      LEFT JOIN workflow_states wst ON wst.id = wi.current_state_id
        AND wst.key NOT IN ('closed', 'skipped', 'validated')
      WHERE u.organization_id = ?
      GROUP BY u.id, u.email, u.first_name, u.last_name
      ORDER BY total_assigned DESC
    `, params);
  }

  async getProgressByTrackable(organizationId: string, trackableId?: string) {
    const conn = this.em.getConnection();
    const params: any[] = [organizationId];
    let extra = '';
    if (trackableId) {
      extra = ' AND t.id = ?';
      params.push(trackableId);
    }
    return conn.execute(`
      SELECT
        t.id, t.title, t.status, t.due_date,
        COUNT(wi.id) as total_items,
        COUNT(*) FILTER (WHERE ws.key IN ('closed', 'validated', 'skipped')) as completed_items,
        CASE
          WHEN COUNT(wi.id) > 0
          THEN ROUND(
            COUNT(*) FILTER (WHERE ws.key IN ('closed', 'validated', 'skipped'))::numeric
            / COUNT(wi.id)::numeric * 100, 1
          )
          ELSE 0
        END as progress_pct
      FROM trackables t
      LEFT JOIN workflow_items wi ON wi.trackable_id = t.id
      LEFT JOIN workflow_states ws ON ws.id = wi.current_state_id
      WHERE t.organization_id = ?
        AND t.status != 'archived'${extra}
      GROUP BY t.id, t.title, t.status, t.due_date
      ORDER BY t.created_at DESC
    `, params);
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
    const openWi = `EXISTS (
        SELECT 1 FROM workflow_states __ws
        WHERE __ws.id = wi.current_state_id
        AND __ws.key NOT IN ('closed', 'skipped', 'validated')
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
        SELECT COUNT(*)::int AS c FROM workflow_items wi
        WHERE wi.organization_id = ?
          AND ${openWi}
          AND wi.is_legal_deadline = true
      `,
        [organizationId],
      ),
      conn.execute(
        `
        SELECT COUNT(*)::int AS c FROM workflow_items wi
        WHERE wi.organization_id = ?
          AND ${openWi}
          AND wi.due_date IS NOT NULL
          AND wi.due_date::date = CURRENT_DATE
      `,
        [organizationId],
      ),
      conn.execute(
        `
        SELECT COUNT(*)::int AS c FROM workflow_items wi
        WHERE wi.organization_id = ?
          AND ${openWi}
          AND wi.due_date IS NOT NULL
          AND wi.due_date::date < CURRENT_DATE
      `,
        [organizationId],
      ),
      conn.execute(
        `
        SELECT
          wi.id, wi.title, wi.kind, wstp.key AS status, wi.due_date,
          t.id as trackable_id, t.title as trackable_title
        FROM workflow_items wi
        INNER JOIN workflow_states wstp ON wstp.id = wi.current_state_id
        JOIN trackables t ON wi.trackable_id = t.id
        WHERE wi.organization_id = ?
          AND wi.assigned_to_id = ?
          AND ${openWi}
        ORDER BY
          CASE WHEN wi.due_date IS NOT NULL AND wi.due_date::date < CURRENT_DATE THEN 0 ELSE 1 END,
          wi.due_date ASC NULLS LAST,
          wi.created_at DESC
        LIMIT 5
      `,
        [organizationId, userId],
      ),
      conn.execute(
        `
        SELECT
          wi.id, wi.title, wi.kind, wst2.key AS status, wi.due_date,
          t.id as trackable_id, t.title as trackable_title
        FROM workflow_items wi
        INNER JOIN workflow_states wst2 ON wst2.id = wi.current_state_id
        JOIN trackables t ON wi.trackable_id = t.id
        WHERE wi.organization_id = ?
          AND wi.assigned_to_id = ?
          AND ${openWi}
        ORDER BY wi.updated_at DESC
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
    let whereClause = 'WHERE wi.organization_id = ?';

    if (filters?.trackableId) {
      whereClause += ' AND wi.trackable_id = ?';
      params.push(filters.trackableId);
    }
    if (filters?.status) {
      whereClause += ' AND wst.key = ?';
      params.push(filters.status);
    }
    if (filters?.assignedToId) {
      whereClause += ' AND wi.assigned_to_id = ?';
      params.push(filters.assignedToId);
    }
    if (filters?.kind) {
      whereClause += ' AND wi.kind = ?';
      params.push(filters.kind);
    }
    if (filters?.overdue) {
      whereClause +=
        " AND wi.due_date < CURRENT_DATE AND wst.key NOT IN ('closed', 'skipped', 'validated')";
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const offset = (page - 1) * limit;

    const fromWi =
      'FROM workflow_items wi INNER JOIN workflow_states wst ON wst.id = wi.current_state_id JOIN trackables t ON wi.trackable_id = t.id LEFT JOIN users u ON wi.assigned_to_id = u.id';

    const countResult = await conn.execute(
      `SELECT COUNT(*) as total ${fromWi} ${whereClause}`,
      params,
    );

    const items = await conn.execute(
      `
      SELECT
        wi.id, wi.title, wi.kind, wi.action_type, wst.key AS status,
        wi.due_date, wi.start_date, wi.depth, wi.sort_order,
        t.id as trackable_id, t.title as trackable_title,
        u.id as assigned_to_id, u.email as assigned_to_email,
        u.first_name as assigned_to_name
      ${fromWi}
      ${whereClause}
      ORDER BY
        CASE WHEN wi.due_date < CURRENT_DATE AND wst.key NOT IN ('closed', 'skipped', 'validated') THEN 0 ELSE 1 END,
        wi.due_date ASC NULLS LAST,
        wi.created_at DESC
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
        wi.id, wi.title, wi.kind, wi.action_type, wstc.key AS status,
        wi.due_date, wi.start_date, wi.depth, wi.sort_order,
        t.id as trackable_id, t.title as trackable_title,
        u.id as assigned_to_id, u.email as assigned_to_email,
        u.first_name as assigned_to_name
      FROM workflow_items wi
      INNER JOIN workflow_states wstc ON wstc.id = wi.current_state_id
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
      ORDER BY wi.due_date ASC NULLS LAST, wi.start_date ASC NULLS LAST, wi.created_at DESC
      LIMIT 3000
    `,
      params,
    );
    return { data: items };
  }
}
