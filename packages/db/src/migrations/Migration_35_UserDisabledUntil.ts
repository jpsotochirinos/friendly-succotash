import { Migration } from '@mikro-orm/migrations';

export class Migration35UserDisabledUntil extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "disabled_until" timestamptz NULL;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "disabled_until";
    `);
  }
}
