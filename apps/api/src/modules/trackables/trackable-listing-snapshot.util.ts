import type { EntityManager } from '@mikro-orm/postgresql';

/**
 * Recomputes denormalized listing_* columns for one trackable from activity_instances.
 * Keep SQL aligned with Migration_45 backfill logic.
 */
export async function refreshTrackableListingSnapshot(
  em: EntityManager,
  organizationId: string,
  trackableId: string,
): Promise<void> {
  const params = [trackableId, organizationId];
  await em.getConnection().execute(
    `
      WITH tid AS (SELECT ?::uuid AS id, ?::uuid AS org),
      base AS (
        SELECT
          (SELECT COUNT(*)::int FROM activity_instances x, tid
            WHERE x.trackable_id = tid.id
              AND COALESCE(x.is_reverted, false) = false
              AND (x.workflow_state_category IS NULL OR x.workflow_state_category <> 'cancelled')
          ) AS act_total,
          (SELECT COUNT(*)::int FROM activity_instances x, tid
            WHERE x.trackable_id = tid.id
              AND COALESCE(x.is_reverted, false) = false
              AND (x.workflow_state_category IS NULL OR x.workflow_state_category <> 'cancelled')
              AND (x.completed_at IS NOT NULL OR x.workflow_state_category = 'done')
          ) AS act_done,
          (SELECT MAX(x.updated_at) FROM activity_instances x, tid
            WHERE x.trackable_id = tid.id
              AND COALESCE(x.is_reverted, false) = false
          ) AS last_act,
          (SELECT MIN(x.due_date) FROM activity_instances x, tid
            WHERE x.trackable_id = tid.id
              AND COALESCE(x.is_reverted, false) = false
              AND x.completed_at IS NULL
              AND (x.workflow_state_category IS NULL OR x.workflow_state_category NOT IN ('done','cancelled'))
              AND x.due_date IS NOT NULL
          ) AS min_open_due,
          EXISTS (
            SELECT 1 FROM activity_instances x, tid
            WHERE x.trackable_id = tid.id
              AND COALESCE(x.is_reverted, false) = false
              AND x.completed_at IS NULL
              AND (x.workflow_state_category IS NULL OR x.workflow_state_category NOT IN ('done','cancelled'))
              AND x.due_date IS NOT NULL
              AND x.due_date < date_trunc('day', now())
          ) AS has_overdue,
          EXISTS (
            SELECT 1 FROM activity_instances x, tid
            WHERE x.trackable_id = tid.id
              AND COALESCE(x.is_reverted, false) = false
              AND x.completed_at IS NULL
              AND (x.workflow_state_category IS NULL OR x.workflow_state_category NOT IN ('done','cancelled'))
              AND x.due_date IS NOT NULL
              AND x.due_date >= date_trunc('day', now())
              AND x.due_date < date_trunc('day', now()) + interval '1 day'
          ) AS has_today,
          EXISTS (
            SELECT 1 FROM activity_instances x, tid
            WHERE x.trackable_id = tid.id
              AND COALESCE(x.is_reverted, false) = false
              AND x.completed_at IS NULL
              AND (x.workflow_state_category IS NULL OR x.workflow_state_category NOT IN ('done','cancelled'))
              AND x.due_date IS NOT NULL
              AND x.due_date >= date_trunc('day', now()) + interval '1 day'
              AND x.due_date < date_trunc('day', now()) + interval '8 day'
          ) AS has_week,
          EXISTS (
            SELECT 1 FROM activity_instances x, tid
            WHERE x.trackable_id = tid.id
              AND COALESCE(x.is_reverted, false) = false
              AND x.completed_at IS NULL
              AND (x.workflow_state_category IS NULL OR x.workflow_state_category NOT IN ('done','cancelled'))
              AND x.due_date IS NOT NULL
              AND x.due_date >= date_trunc('day', now()) + interval '8 day'
              AND x.due_date < date_trunc('day', now()) + interval '31 day'
          ) AS has_month,
          EXISTS (
            SELECT 1 FROM activity_instances x, tid
            WHERE x.trackable_id = tid.id
              AND COALESCE(x.is_reverted, false) = false
              AND x.completed_at IS NULL
              AND (x.workflow_state_category IS NULL OR x.workflow_state_category NOT IN ('done','cancelled'))
              AND x.due_date IS NOT NULL
              AND x.due_date >= date_trunc('day', now()) + interval '31 day'
          ) AS has_future
      ),
      docs AS (
        SELECT COUNT(d.id)::int AS c
        FROM documents d
        INNER JOIN folders f ON f.id = d.folder_id, tid
        WHERE f.trackable_id = tid.id
          AND d.deleted_at IS NULL
      ),
      coms AS (
        SELECT COUNT(c.id)::int AS c
        FROM activity_instance_comments c
        INNER JOIN activity_instances ai ON ai.id = c.activity_instance_id, tid
        WHERE ai.trackable_id = tid.id
      ),
      calc AS (
        SELECT
          b.act_total,
          b.act_done,
          b.last_act,
          b.min_open_due,
          CASE
            WHEN b.has_overdue THEN 'overdue'
            WHEN b.has_today THEN 'due_today'
            WHEN b.has_week THEN 'due_week'
            WHEN b.has_month THEN 'due_month'
            WHEN b.has_future THEN 'normal'
            ELSE 'no_deadline'
          END AS urgency,
          (SELECT c FROM docs) AS doc_count,
          (SELECT c FROM coms) AS comm_count
        FROM base b
      )
      UPDATE trackables t SET
        listing_urgency = c.urgency,
        listing_urgency_rank = CASE c.urgency
          WHEN 'overdue' THEN 0
          WHEN 'due_today' THEN 1
          WHEN 'due_week' THEN 2
          WHEN 'due_month' THEN 3
          WHEN 'normal' THEN 4
          ELSE 5
        END,
        listing_next_due_at = c.min_open_due,
        listing_last_activity_at = c.last_act,
        listing_activity_total = c.act_total,
        listing_activity_done = c.act_done,
        listing_doc_count = c.doc_count,
        listing_comment_count = c.comm_count
      FROM calc c, tid
      WHERE t.id = tid.id AND t.organization_id = tid.org
    `,
    params,
  );
}
