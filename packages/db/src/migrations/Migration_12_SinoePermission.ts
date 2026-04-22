import { Migration } from '@mikro-orm/migrations';

export class Migration12SinoePermission extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      INSERT INTO "permissions" ("id", "created_at", "updated_at", "code", "category", "description")
      SELECT uuid_generate_v4(), now(), now(), 'sinoe:manage', 'integration',
        'Configure SINOE credentials and sync notifications'
      WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "code" = 'sinoe:manage');
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      DELETE FROM "role_permissions"
      WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "code" = 'sinoe:manage');
    `);
    this.addSql(`DELETE FROM "permissions" WHERE "code" = 'sinoe:manage';`);
  }
}
