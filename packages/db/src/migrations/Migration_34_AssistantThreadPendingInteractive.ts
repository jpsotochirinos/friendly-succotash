import { Migration } from '@mikro-orm/migrations';

export class Migration34AssistantThreadPendingInteractive extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "assistant_threads"
      ADD COLUMN IF NOT EXISTS "pending_interactive" jsonb NULL;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "assistant_threads" DROP COLUMN IF EXISTS "pending_interactive";
    `);
  }
}
