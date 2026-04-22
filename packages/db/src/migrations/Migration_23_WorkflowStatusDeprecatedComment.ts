import { Migration } from '@mikro-orm/migrations';

/**
 * Documents deprecation of `workflow_items.status` in favor of `current_state_id`.
 * Full removal of the column is deferred until all environments run data migration
 * (`pnpm --filter @tracker/db migrate:data:workflows`) and the legacy engine path is removed.
 */
export class Migration23WorkflowStatusDeprecatedComment extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      COMMENT ON COLUMN "workflow_items"."status" IS
      'Legacy mirror of workflow_states.key via current_state_id; prefer current_state_id for new code.';
    `);
  }

  async down(): Promise<void> {
    this.addSql(`COMMENT ON COLUMN "workflow_items"."status" IS NULL;`);
  }
}
