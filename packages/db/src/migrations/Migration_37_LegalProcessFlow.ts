import { Migration } from '@mikro-orm/migrations';

export class Migration37LegalProcessFlow extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "workflows"
      ADD COLUMN IF NOT EXISTS "applicable_law" varchar(50) NULL;
    `);
    this.addSql(`
      ALTER TABLE "workflows"
      ADD COLUMN IF NOT EXISTS "legal_process_code" varchar(80) NULL;
    `);

    this.addSql(`
      ALTER TABLE "workflow_states"
      ADD COLUMN IF NOT EXISTS "deadline_type" varchar(255) NOT NULL DEFAULT 'none';
    `);
    this.addSql(`
      ALTER TABLE "workflow_states"
      ADD COLUMN IF NOT EXISTS "deadline_days" int NULL;
    `);
    this.addSql(`
      ALTER TABLE "workflow_states"
      ADD COLUMN IF NOT EXISTS "deadline_calendar_type" varchar(255) NOT NULL DEFAULT 'judicial';
    `);
    this.addSql(`
      ALTER TABLE "workflow_states"
      ADD COLUMN IF NOT EXISTS "deadline_law_ref" varchar(120) NULL;
    `);
    this.addSql(`
      ALTER TABLE "workflow_states"
      ADD COLUMN IF NOT EXISTS "sinoe_keywords" text[] NULL;
    `);
    this.addSql(`
      ALTER TABLE "workflow_states"
      ADD COLUMN IF NOT EXISTS "stage_order_index" int NULL;
    `);

    this.addSql(`
      CREATE TABLE "legal_deadline" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL,
        "updated_at" timestamptz NOT NULL,
        "organization_id" uuid NOT NULL,
        "trackable_id" uuid NOT NULL,
        "workflow_state_id" uuid NOT NULL,
        "process_root_item_id" uuid NULL,
        "trigger_type" varchar(255) NOT NULL,
        "trigger_date" timestamptz NOT NULL,
        "sinoe_notification_id" uuid NULL,
        "legal_days" int NOT NULL,
        "due_date" timestamptz NOT NULL,
        "calendar_type" varchar(255) NOT NULL,
        "law_ref" varchar(120) NULL,
        "status" varchar(255) NOT NULL DEFAULT 'pending',
        "met_at" timestamptz NULL,
        "waived_reason" varchar(500) NULL,
        "alert_days_before" int[] NOT NULL DEFAULT '{3,1}',
        CONSTRAINT "legal_deadline_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "legal_deadline_organization_id_fkey" FOREIGN KEY ("organization_id")
          REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "legal_deadline_trackable_id_fkey" FOREIGN KEY ("trackable_id")
          REFERENCES "trackables" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "legal_deadline_workflow_state_id_fkey" FOREIGN KEY ("workflow_state_id")
          REFERENCES "workflow_states" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "legal_deadline_process_root_item_id_fkey" FOREIGN KEY ("process_root_item_id")
          REFERENCES "workflow_items" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT "legal_deadline_sinoe_notification_id_fkey" FOREIGN KEY ("sinoe_notification_id")
          REFERENCES "sinoe_notifications" ("id") ON UPDATE CASCADE ON DELETE SET NULL
      );
    `);

    this.addSql(`
      CREATE TABLE "legal_process_stage_log" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL,
        "updated_at" timestamptz NOT NULL,
        "organization_id" uuid NOT NULL,
        "trackable_id" uuid NOT NULL,
        "process_root_item_id" uuid NOT NULL,
        "from_state_id" uuid NULL,
        "to_state_id" uuid NOT NULL,
        "advanced_by" varchar(255) NOT NULL,
        "sinoe_notification_id" uuid NULL,
        "advanced_by_user_id" uuid NULL,
        "advanced_at" timestamptz NOT NULL,
        "notes" text NULL,
        CONSTRAINT "legal_process_stage_log_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "legal_process_stage_log_organization_id_fkey" FOREIGN KEY ("organization_id")
          REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "legal_process_stage_log_trackable_id_fkey" FOREIGN KEY ("trackable_id")
          REFERENCES "trackables" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "legal_process_stage_log_process_root_item_id_fkey" FOREIGN KEY ("process_root_item_id")
          REFERENCES "workflow_items" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "legal_process_stage_log_from_state_id_fkey" FOREIGN KEY ("from_state_id")
          REFERENCES "workflow_states" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT "legal_process_stage_log_to_state_id_fkey" FOREIGN KEY ("to_state_id")
          REFERENCES "workflow_states" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "legal_process_stage_log_sinoe_notification_id_fkey" FOREIGN KEY ("sinoe_notification_id")
          REFERENCES "sinoe_notifications" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT "legal_process_stage_log_advanced_by_user_id_fkey" FOREIGN KEY ("advanced_by_user_id")
          REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE SET NULL
      );
    `);

    this.addSql(
      `CREATE INDEX "idx_legal_deadline_org_trackable_status" ON "legal_deadline" ("organization_id", "trackable_id", "status");`,
    );
    this.addSql(
      `CREATE INDEX "idx_legal_deadline_due_pending" ON "legal_deadline" ("due_date", "status") WHERE "status" = 'pending';`,
    );
    this.addSql(
      `CREATE INDEX "idx_workflow_state_sinoe_keywords_gin" ON "workflow_states" USING GIN ("sinoe_keywords") WHERE "sinoe_keywords" IS NOT NULL;`,
    );
    this.addSql(
      `CREATE INDEX "idx_legal_process_stage_log_trackable_advanced" ON "legal_process_stage_log" ("trackable_id", "advanced_at" DESC);`,
    );
  }

  async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "idx_legal_process_stage_log_trackable_advanced";`);
    this.addSql(`DROP INDEX IF EXISTS "idx_workflow_state_sinoe_keywords_gin";`);
    this.addSql(`DROP INDEX IF EXISTS "idx_legal_deadline_due_pending";`);
    this.addSql(`DROP INDEX IF EXISTS "idx_legal_deadline_org_trackable_status";`);

    this.addSql(`DROP TABLE IF EXISTS "legal_process_stage_log";`);
    this.addSql(`DROP TABLE IF EXISTS "legal_deadline";`);

    this.addSql(`ALTER TABLE "workflow_states" DROP COLUMN IF EXISTS "stage_order_index";`);
    this.addSql(`ALTER TABLE "workflow_states" DROP COLUMN IF EXISTS "sinoe_keywords";`);
    this.addSql(`ALTER TABLE "workflow_states" DROP COLUMN IF EXISTS "deadline_law_ref";`);
    this.addSql(`ALTER TABLE "workflow_states" DROP COLUMN IF EXISTS "deadline_calendar_type";`);
    this.addSql(`ALTER TABLE "workflow_states" DROP COLUMN IF EXISTS "deadline_days";`);
    this.addSql(`ALTER TABLE "workflow_states" DROP COLUMN IF EXISTS "deadline_type";`);

    this.addSql(`ALTER TABLE "workflows" DROP COLUMN IF EXISTS "legal_process_code";`);
    this.addSql(`ALTER TABLE "workflows" DROP COLUMN IF EXISTS "applicable_law";`);
  }
}
