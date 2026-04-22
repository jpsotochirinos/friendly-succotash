import { Migration } from '@mikro-orm/migrations';

/**
 * Ensures workflow template permissions exist and grants them to existing roles:
 * - workflow_template:read → same roles that have trackable:read (catalog / list templates)
 * - workflow_template:manage → same roles that have workflow_item:update (edit org templates)
 */
export class Migration15WorkflowTemplateRolePermissions extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      INSERT INTO "permissions" ("id", "created_at", "updated_at", "code", "category", "description")
      SELECT uuid_generate_v4(), now(), now(), 'workflow_template:read', 'workflow', 'View workflow templates'
      WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "code" = 'workflow_template:read');
    `);
    this.addSql(`
      INSERT INTO "permissions" ("id", "created_at", "updated_at", "code", "category", "description")
      SELECT uuid_generate_v4(), now(), now(), 'workflow_template:manage', 'workflow', 'Create and edit org workflow templates'
      WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "code" = 'workflow_template:manage');
    `);

    this.addSql(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT rp."role_id", p."id"
      FROM "role_permissions" rp
      INNER JOIN "permissions" p_old ON p_old."id" = rp."permission_id" AND p_old."code" = 'trackable:read'
      CROSS JOIN "permissions" p
      WHERE p."code" = 'workflow_template:read'
      ON CONFLICT DO NOTHING;
    `);

    this.addSql(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT rp."role_id", p."id"
      FROM "role_permissions" rp
      INNER JOIN "permissions" p_old ON p_old."id" = rp."permission_id" AND p_old."code" = 'workflow_item:update'
      CROSS JOIN "permissions" p
      WHERE p."code" = 'workflow_template:manage'
      ON CONFLICT DO NOTHING;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      DELETE FROM "role_permissions"
      WHERE "permission_id" IN (
        SELECT "id" FROM "permissions" WHERE "code" IN ('workflow_template:read', 'workflow_template:manage')
      );
    `);
  }
}
