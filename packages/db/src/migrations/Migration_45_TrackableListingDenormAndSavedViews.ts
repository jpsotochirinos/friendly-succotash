import { Migration } from '@mikro-orm/migrations';

export class Migration_45_TrackableListingDenormAndSavedViews extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "trackables"
        ADD COLUMN IF NOT EXISTS "listing_urgency" text NOT NULL DEFAULT 'no_deadline',
        ADD COLUMN IF NOT EXISTS "listing_urgency_rank" smallint NOT NULL DEFAULT 5,
        ADD COLUMN IF NOT EXISTS "listing_next_due_at" timestamptz NULL,
        ADD COLUMN IF NOT EXISTS "listing_last_activity_at" timestamptz NULL,
        ADD COLUMN IF NOT EXISTS "listing_activity_total" int NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "listing_activity_done" int NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "listing_doc_count" int NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "listing_comment_count" int NOT NULL DEFAULT 0;
    `);

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "idx_trackables_org_status_listing_rank_due"
        ON "trackables" ("organization_id", "status", "listing_urgency_rank", "listing_next_due_at");
      CREATE INDEX IF NOT EXISTS "idx_trackables_org_status_assigned"
        ON "trackables" ("organization_id", "status", "assigned_to_id");
      CREATE INDEX IF NOT EXISTS "idx_trackables_org_status_client"
        ON "trackables" ("organization_id", "status", "client_id");
      CREATE INDEX IF NOT EXISTS "idx_trackables_org_status_matter_type"
        ON "trackables" ("organization_id", "status", "matter_type");
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "saved_trackable_views" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "name" varchar(200) NOT NULL,
        "slug" varchar(80) NOT NULL,
        "is_shared" boolean NOT NULL DEFAULT false,
        "is_favorite" boolean NOT NULL DEFAULT false,
        "last_used_at" timestamptz NULL,
        "config" jsonb NOT NULL DEFAULT '{}'::jsonb,
        CONSTRAINT "saved_trackable_views_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "saved_trackable_views_organization_id_fkey"
          FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "saved_trackable_views_user_id_fkey"
          FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "saved_trackable_views_org_user_slug_unique" UNIQUE ("organization_id", "user_id", "slug")
      );
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "idx_saved_trackable_views_org_user"
        ON "saved_trackable_views" ("organization_id", "user_id", "last_used_at" DESC NULLS LAST);
    `);

    /** Backfill listing_* from activity_instances (open activities drive urgency). */
    this.addSql(`
      WITH base AS (
        SELECT
          t.id AS trackable_id,
          t.organization_id AS organization_id,
          (SELECT COUNT(*)::int FROM activity_instances x
            WHERE x.trackable_id = t.id
              AND COALESCE(x.is_reverted, false) = false
              AND (x.workflow_state_category IS NULL OR x.workflow_state_category <> 'cancelled')
          ) AS act_total,
          (SELECT COUNT(*)::int FROM activity_instances x
            WHERE x.trackable_id = t.id
              AND COALESCE(x.is_reverted, false) = false
              AND (x.workflow_state_category IS NULL OR x.workflow_state_category <> 'cancelled')
              AND (x.completed_at IS NOT NULL OR x.workflow_state_category = 'done')
          ) AS act_done,
          (SELECT MAX(x.updated_at) FROM activity_instances x
            WHERE x.trackable_id = t.id
              AND COALESCE(x.is_reverted, false) = false
          ) AS last_act,
          (SELECT MIN(x.due_date) FROM activity_instances x
            WHERE x.trackable_id = t.id
              AND COALESCE(x.is_reverted, false) = false
              AND x.completed_at IS NULL
              AND (x.workflow_state_category IS NULL OR x.workflow_state_category NOT IN ('done','cancelled'))
              AND x.due_date IS NOT NULL
          ) AS min_open_due,
          EXISTS (
            SELECT 1 FROM activity_instances x
            WHERE x.trackable_id = t.id
              AND COALESCE(x.is_reverted, false) = false
              AND x.completed_at IS NULL
              AND (x.workflow_state_category IS NULL OR x.workflow_state_category NOT IN ('done','cancelled'))
              AND x.due_date IS NOT NULL
              AND x.due_date < date_trunc('day', now())
          ) AS has_overdue,
          EXISTS (
            SELECT 1 FROM activity_instances x
            WHERE x.trackable_id = t.id
              AND COALESCE(x.is_reverted, false) = false
              AND x.completed_at IS NULL
              AND (x.workflow_state_category IS NULL OR x.workflow_state_category NOT IN ('done','cancelled'))
              AND x.due_date IS NOT NULL
              AND x.due_date >= date_trunc('day', now())
              AND x.due_date < date_trunc('day', now()) + interval '1 day'
          ) AS has_today,
          EXISTS (
            SELECT 1 FROM activity_instances x
            WHERE x.trackable_id = t.id
              AND COALESCE(x.is_reverted, false) = false
              AND x.completed_at IS NULL
              AND (x.workflow_state_category IS NULL OR x.workflow_state_category NOT IN ('done','cancelled'))
              AND x.due_date IS NOT NULL
              AND x.due_date >= date_trunc('day', now()) + interval '1 day'
              AND x.due_date < date_trunc('day', now()) + interval '8 day'
          ) AS has_week,
          EXISTS (
            SELECT 1 FROM activity_instances x
            WHERE x.trackable_id = t.id
              AND COALESCE(x.is_reverted, false) = false
              AND x.completed_at IS NULL
              AND (x.workflow_state_category IS NULL OR x.workflow_state_category NOT IN ('done','cancelled'))
              AND x.due_date IS NOT NULL
              AND x.due_date >= date_trunc('day', now()) + interval '8 day'
              AND x.due_date < date_trunc('day', now()) + interval '31 day'
          ) AS has_month,
          EXISTS (
            SELECT 1 FROM activity_instances x
            WHERE x.trackable_id = t.id
              AND COALESCE(x.is_reverted, false) = false
              AND x.completed_at IS NULL
              AND (x.workflow_state_category IS NULL OR x.workflow_state_category NOT IN ('done','cancelled'))
              AND x.due_date IS NOT NULL
              AND x.due_date >= date_trunc('day', now()) + interval '31 day'
          ) AS has_future
        FROM trackables t
      ),
      docs AS (
        SELECT f.trackable_id AS trackable_id, COUNT(d.id)::int AS c
        FROM documents d
        INNER JOIN folders f ON f.id = d.folder_id
        WHERE d.deleted_at IS NULL AND f.trackable_id IS NOT NULL
        GROUP BY f.trackable_id
      ),
      coms AS (
        SELECT ai.trackable_id AS trackable_id, COUNT(c.id)::int AS c
        FROM activity_instance_comments c
        INNER JOIN activity_instances ai ON ai.id = c.activity_instance_id
        WHERE ai.trackable_id IS NOT NULL
        GROUP BY ai.trackable_id
      ),
      calc AS (
        SELECT
          b.trackable_id,
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
          COALESCE(d.c, 0) AS doc_count,
          COALESCE(cm.c, 0) AS comm_count
        FROM base b
        LEFT JOIN docs d ON d.trackable_id = b.trackable_id
        LEFT JOIN coms cm ON cm.trackable_id = b.trackable_id
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
      FROM calc c
      WHERE t.id = c.trackable_id;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "saved_trackable_views";`);
    this.addSql(`DROP INDEX IF EXISTS "idx_trackables_org_status_matter_type";`);
    this.addSql(`DROP INDEX IF EXISTS "idx_trackables_org_status_client";`);
    this.addSql(`DROP INDEX IF EXISTS "idx_trackables_org_status_assigned";`);
    this.addSql(`DROP INDEX IF EXISTS "idx_trackables_org_status_listing_rank_due";`);
    this.addSql(`
      ALTER TABLE "trackables"
        DROP COLUMN IF EXISTS "listing_comment_count",
        DROP COLUMN IF EXISTS "listing_doc_count",
        DROP COLUMN IF EXISTS "listing_activity_done",
        DROP COLUMN IF EXISTS "listing_activity_total",
        DROP COLUMN IF EXISTS "listing_last_activity_at",
        DROP COLUMN IF EXISTS "listing_next_due_at",
        DROP COLUMN IF EXISTS "listing_urgency_rank",
        DROP COLUMN IF EXISTS "listing_urgency";
    `);
  }
}
