import { Migration } from '@mikro-orm/migrations';

/**
 * Fase 3: `workflow_items.status` eliminada; la fuente de verdad es `current_state_id` → `workflow_states.key`.
 * Antes del DROP, sincroniza `current_state_id` desde `status` donde falte.
 */
export class Migration26WorkflowItemDropStatus extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      UPDATE workflow_items AS wi
      SET current_state_id = ws.id
      FROM workflow_states AS ws
      WHERE wi.workflow_id IS NOT NULL
        AND wi.workflow_id = ws.workflow_id
        AND wi.current_state_id IS NULL
        AND wi.status::text = ws.key::text
    `);
    this.addSql(`ALTER TABLE "workflow_items" DROP COLUMN IF EXISTS "status";`);
  }

  async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "workflow_items" ADD COLUMN IF NOT EXISTS "status" varchar(32) NOT NULL DEFAULT 'pending';
    `);
    this.addSql(`
      UPDATE workflow_items AS wi
      SET status = ws.key::text
      FROM workflow_states AS ws
      WHERE wi.current_state_id = ws.id
    `);
  }
}
