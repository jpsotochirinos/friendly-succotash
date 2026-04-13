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
        wi.id, wi.title, wi.item_type, wi.status, wi.due_date,
        wi.depth, t.title as trackable_title, t.id as trackable_id,
        u.email as assigned_to_email, u.first_name as assigned_to_name
      FROM workflow_items wi
      JOIN trackables t ON wi.trackable_id = t.id
      LEFT JOIN users u ON wi.assigned_to_id = u.id
      WHERE wi.organization_id = ?
        AND wi.due_date IS NOT NULL
        AND wi.due_date <= CURRENT_DATE + make_interval(days => ?)
        AND wi.status NOT IN ('closed', 'skipped', 'validated')${extra}
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
        wi.id, wi.title, wi.item_type, wi.status, wi.due_date,
        t.title as trackable_title, t.id as trackable_id,
        u.email as assigned_to_email, u.first_name as assigned_to_name
      FROM workflow_items wi
      JOIN trackables t ON wi.trackable_id = t.id
      LEFT JOIN users u ON wi.assigned_to_id = u.id
      WHERE wi.organization_id = ?
        AND wi.due_date < CURRENT_DATE
        AND wi.status NOT IN ('closed', 'skipped', 'validated')${extra}
      ORDER BY wi.due_date ASC
    `, params);
  }

  async getWorkloadByUser(organizationId: string, trackableId?: string) {
    const conn = this.em.getConnection();
    const params: any[] = [organizationId];
    let extraJoin = '';
    if (trackableId) {
      extraJoin = ' AND wi.trackable_id = ?';
      params.push(trackableId);
    }
    return conn.execute(`
      SELECT
        u.id as user_id,
        u.email,
        u.first_name,
        u.last_name,
        COUNT(*) FILTER (WHERE wi.status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE wi.status = 'in_progress') as in_progress_count,
        COUNT(*) FILTER (WHERE wi.status = 'under_review') as under_review_count,
        COUNT(*) as total_assigned
      FROM users u
      LEFT JOIN workflow_items wi ON wi.assigned_to_id = u.id
        AND wi.status NOT IN ('closed', 'skipped', 'validated')${extraJoin}
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
        COUNT(*) FILTER (WHERE wi.status IN ('closed', 'validated', 'skipped')) as completed_items,
        CASE
          WHEN COUNT(wi.id) > 0
          THEN ROUND(
            COUNT(*) FILTER (WHERE wi.status IN ('closed', 'validated', 'skipped'))::numeric
            / COUNT(wi.id)::numeric * 100, 1
          )
          ELSE 0
        END as progress_pct
      FROM trackables t
      LEFT JOIN workflow_items wi ON wi.trackable_id = t.id
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

  async getGlobalActions(
    organizationId: string,
    filters?: {
      status?: string;
      assignedToId?: string;
      itemType?: string;
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
      whereClause += ' AND wi.status = ?';
      params.push(filters.status);
    }
    if (filters?.assignedToId) {
      whereClause += ' AND wi.assigned_to_id = ?';
      params.push(filters.assignedToId);
    }
    if (filters?.itemType) {
      whereClause += ' AND wi.item_type = ?';
      params.push(filters.itemType);
    }
    if (filters?.overdue) {
      whereClause += ' AND wi.due_date < CURRENT_DATE AND wi.status NOT IN (\'closed\', \'skipped\', \'validated\')';
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const offset = (page - 1) * limit;

    const countResult = await conn.execute(`
      SELECT COUNT(*) as total FROM workflow_items wi ${whereClause}
    `, params);

    const items = await conn.execute(`
      SELECT
        wi.id, wi.title, wi.item_type, wi.action_type, wi.status,
        wi.due_date, wi.start_date, wi.depth, wi.sort_order,
        t.id as trackable_id, t.title as trackable_title,
        u.id as assigned_to_id, u.email as assigned_to_email,
        u.first_name as assigned_to_name
      FROM workflow_items wi
      JOIN trackables t ON wi.trackable_id = t.id
      LEFT JOIN users u ON wi.assigned_to_id = u.id
      ${whereClause}
      ORDER BY
        CASE WHEN wi.due_date < CURRENT_DATE AND wi.status NOT IN ('closed', 'skipped', 'validated') THEN 0 ELSE 1 END,
        wi.due_date ASC NULLS LAST,
        wi.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    return {
      data: items,
      total: parseInt(countResult[0]?.total || '0', 10),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult[0]?.total || '0', 10) / limit),
    };
  }
}
