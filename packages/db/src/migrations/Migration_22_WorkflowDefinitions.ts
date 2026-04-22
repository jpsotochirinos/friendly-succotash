import { Migration } from '@mikro-orm/migrations';

export class Migration22WorkflowDefinitions extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "feature_flags" jsonb NULL;
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "workflows" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "slug" varchar(120) NOT NULL,
        "name" varchar(500) NOT NULL,
        "description" text NULL,
        "matter_type" varchar(32) NULL,
        "jurisdiction" varchar(8) NOT NULL DEFAULT 'PE',
        "is_system" boolean NOT NULL DEFAULT false,
        "is_default" boolean NOT NULL DEFAULT false,
        "organization_id" uuid NULL,
        CONSTRAINT "workflows_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "workflows_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE
      );
    `);

    this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS "workflows_slug_system_unique"
      ON "workflows" ("slug") WHERE "organization_id" IS NULL;
    `);
    this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS "workflows_org_slug_unique"
      ON "workflows" ("organization_id", "slug") WHERE "organization_id" IS NOT NULL;
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "workflow_states" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "workflow_id" uuid NOT NULL,
        "key" varchar(80) NOT NULL,
        "name" varchar(500) NOT NULL,
        "category" varchar(32) NOT NULL,
        "color" varchar(32) NULL,
        "sort_order" int NOT NULL DEFAULT 0,
        "is_initial" boolean NOT NULL DEFAULT false,
        CONSTRAINT "workflow_states_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "workflow_states_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "workflow_states_workflow_id_key_unique" UNIQUE ("workflow_id", "key")
      );
    `);

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "workflow_states_workflow_id_index" ON "workflow_states" ("workflow_id");
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "workflow_transitions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "workflow_id" uuid NOT NULL,
        "from_state_id" uuid NULL,
        "to_state_id" uuid NOT NULL,
        "name" varchar(500) NOT NULL,
        "required_permission" varchar(120) NULL,
        "condition" jsonb NULL,
        "auto_on_event" varchar(120) NULL,
        CONSTRAINT "workflow_transitions_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "workflow_transitions_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "workflow_transitions_from_state_id_fkey" FOREIGN KEY ("from_state_id") REFERENCES "workflow_states" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "workflow_transitions_to_state_id_fkey" FOREIGN KEY ("to_state_id") REFERENCES "workflow_states" ("id") ON UPDATE CASCADE ON DELETE CASCADE
      );
    `);

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "workflow_transitions_workflow_id_index" ON "workflow_transitions" ("workflow_id");
    `);

    this.addSql(`
      ALTER TABLE "workflow_items" ADD COLUMN IF NOT EXISTS "workflow_id" uuid NULL;
    `);
    this.addSql(`
      ALTER TABLE "workflow_items" ADD COLUMN IF NOT EXISTS "current_state_id" uuid NULL;
    `);
    this.addSql(`
      DO $$ BEGIN
        ALTER TABLE "workflow_items" ADD CONSTRAINT "workflow_items_workflow_id_fkey"
        FOREIGN KEY ("workflow_id") REFERENCES "workflows" ("id") ON UPDATE CASCADE ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    this.addSql(`
      DO $$ BEGIN
        ALTER TABLE "workflow_items" ADD CONSTRAINT "workflow_items_current_state_id_fkey"
        FOREIGN KEY ("current_state_id") REFERENCES "workflow_states" ("id") ON UPDATE CASCADE ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    this.addSql(`
      ALTER TABLE "workflow_template_items" ADD COLUMN IF NOT EXISTS "workflow_id" uuid NULL;
    `);
    this.addSql(`
      ALTER TABLE "workflow_template_items" ADD COLUMN IF NOT EXISTS "current_state_id" uuid NULL;
    `);
    this.addSql(`
      DO $$ BEGIN
        ALTER TABLE "workflow_template_items" ADD CONSTRAINT "workflow_template_items_workflow_id_fkey"
        FOREIGN KEY ("workflow_id") REFERENCES "workflows" ("id") ON UPDATE CASCADE ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    this.addSql(`
      DO $$ BEGIN
        ALTER TABLE "workflow_template_items" ADD CONSTRAINT "workflow_template_items_current_state_id_fkey"
        FOREIGN KEY ("current_state_id") REFERENCES "workflow_states" ("id") ON UPDATE CASCADE ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "workflow_template_items" DROP CONSTRAINT IF EXISTS "workflow_template_items_current_state_id_fkey";
    `);
    this.addSql(`
      ALTER TABLE "workflow_template_items" DROP CONSTRAINT IF EXISTS "workflow_template_items_workflow_id_fkey";
    `);
    this.addSql(`ALTER TABLE "workflow_template_items" DROP COLUMN IF EXISTS "current_state_id";`);
    this.addSql(`ALTER TABLE "workflow_template_items" DROP COLUMN IF EXISTS "workflow_id";`);

    this.addSql(`
      ALTER TABLE "workflow_items" DROP CONSTRAINT IF EXISTS "workflow_items_current_state_id_fkey";
    `);
    this.addSql(`
      ALTER TABLE "workflow_items" DROP CONSTRAINT IF EXISTS "workflow_items_workflow_id_fkey";
    `);
    this.addSql(`ALTER TABLE "workflow_items" DROP COLUMN IF EXISTS "current_state_id";`);
    this.addSql(`ALTER TABLE "workflow_items" DROP COLUMN IF EXISTS "workflow_id";`);

    this.addSql(`DROP TABLE IF EXISTS "workflow_transitions" CASCADE;`);
    this.addSql(`DROP TABLE IF EXISTS "workflow_states" CASCADE;`);
    this.addSql(`DROP INDEX IF EXISTS "workflows_org_slug_unique";`);
    this.addSql(`DROP INDEX IF EXISTS "workflows_slug_system_unique";`);
    this.addSql(`DROP TABLE IF EXISTS "workflows" CASCADE;`);

    this.addSql(`ALTER TABLE "organizations" DROP COLUMN IF EXISTS "feature_flags";`);
  }
}
