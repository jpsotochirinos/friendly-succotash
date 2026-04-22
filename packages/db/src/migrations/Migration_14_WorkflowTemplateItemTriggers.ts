import { Migration } from '@mikro-orm/migrations';

export class Migration14WorkflowTemplateItemTriggers extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "workflow_template_items"
      ADD COLUMN IF NOT EXISTS "triggers" jsonb NULL;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "workflow_template_items" DROP COLUMN IF EXISTS "triggers";
    `);
  }
}
