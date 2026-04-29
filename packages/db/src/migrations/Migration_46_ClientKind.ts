import { Migration } from '@mikro-orm/migrations';

export class Migration_46_ClientKind extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "clients"
        ADD COLUMN IF NOT EXISTS "client_kind" text NOT NULL DEFAULT 'unknown';
    `);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE "clients" DROP COLUMN IF EXISTS "client_kind";`);
  }
}
