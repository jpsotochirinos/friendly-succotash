import { Migration } from '@mikro-orm/migrations';

export class Migration13WorkflowRules extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "workflow_rules" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "name" varchar(500) NOT NULL,
        "description" text NULL,
        "event" varchar(120) NOT NULL,
        "condition" jsonb NOT NULL,
        "action" jsonb NOT NULL,
        "priority" int NOT NULL DEFAULT 0,
        "enabled" boolean NOT NULL DEFAULT true,
        "scope" varchar(32) NOT NULL DEFAULT 'org',
        "scope_id" uuid NULL,
        "action_types" jsonb NULL,
        CONSTRAINT "workflow_rules_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "workflow_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE
      );
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "workflow_rules_org_event_enabled_idx"
      ON "workflow_rules" ("organization_id", "event", "enabled");
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "workflow_rules";`);
  }
}
