import { Migration } from '@mikro-orm/migrations';

/**
 * Adds import:manage (migration / import batches) and grants it to every role that
 * already has org:manage (typically Owner), so only org admins see migration by default.
 * Other roles can receive the permission explicitly via role management.
 */
export class Migration21ImportManagePermission extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      INSERT INTO "permissions" ("id", "created_at", "updated_at", "code", "category", "description")
      SELECT uuid_generate_v4(), now(), now(), 'import:manage', 'import',
        'Run data imports / migration batches for the organization'
      WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "code" = 'import:manage');
    `);

    this.addSql(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT rp."role_id", p_new."id"
      FROM "role_permissions" rp
      INNER JOIN "permissions" p_old ON p_old."id" = rp."permission_id" AND p_old."code" = 'org:manage'
      CROSS JOIN "permissions" p_new
      WHERE p_new."code" = 'import:manage'
      ON CONFLICT DO NOTHING;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      DELETE FROM "role_permissions"
      WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "code" = 'import:manage');
    `);
    this.addSql(`DELETE FROM "permissions" WHERE "code" = 'import:manage';`);
  }
}
