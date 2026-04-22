import { Migration } from '@mikro-orm/migrations';

export class Migration25WorkflowPerActionType extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "workflows" ADD COLUMN IF NOT EXISTS "action_type" varchar(32) NULL;
    `);
    this.addSql(`
      ALTER TABLE "workflows" ADD COLUMN IF NOT EXISTS "applies_to_all_types" boolean NOT NULL DEFAULT false;
    `);

    this.addSql(`
      UPDATE "workflows"
      SET "applies_to_all_types" = true
      WHERE "slug" IN ('standard-judicial-pe', 'standard-office')
        AND "organization_id" IS NULL
        AND "is_system" = true;
    `);

    this.addSql(`
      ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "workflow_action_type_defaults" jsonb NULL;
    `);

    this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS "workflows_system_action_type_unique"
      ON "workflows" ("action_type")
      WHERE "is_system" = true AND "organization_id" IS NULL AND "action_type" IS NOT NULL;
    `);

    this.addSql(`
      UPDATE "organizations"
      SET "feature_flags" = jsonb_set(
        COALESCE("feature_flags", '{}'::jsonb),
        '{useConfigurableWorkflows}',
        'true'::jsonb,
        true
      )
      WHERE NOT (COALESCE("feature_flags", '{}'::jsonb) ? 'useConfigurableWorkflows');
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "workflows_system_action_type_unique";`);
    this.addSql(`ALTER TABLE "organizations" DROP COLUMN IF EXISTS "workflow_action_type_defaults";`);
    this.addSql(`ALTER TABLE "workflows" DROP COLUMN IF EXISTS "applies_to_all_types";`);
    this.addSql(`ALTER TABLE "workflows" DROP COLUMN IF EXISTS "action_type";`);
  }
}
