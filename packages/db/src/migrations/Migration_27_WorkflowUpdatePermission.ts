import { Migration } from '@mikro-orm/migrations';

/**
 * Adds the missing `workflow:update` permission (used by the configurable workflow
 * definitions UI and API: /settings/workflows, workflow-definitions.controller, rules.controller).
 * Grants it to every role that already has `org:manage` (typically Owner) so that
 * administrators immediately see the "Flujos" section after deployment without manual fixup.
 */
export class Migration27WorkflowUpdatePermission extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      INSERT INTO "permissions" ("id", "created_at", "updated_at", "code", "category", "description")
      SELECT uuid_generate_v4(), now(), now(), 'workflow:update', 'workflow_action',
        'Manage workflow definitions (states and transitions)'
      WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "code" = 'workflow:update');
    `);

    this.addSql(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT DISTINCT rp."role_id", p_new."id"
      FROM "role_permissions" rp
      INNER JOIN "permissions" p_old ON p_old."id" = rp."permission_id" AND p_old."code" = 'org:manage'
      CROSS JOIN "permissions" p_new
      WHERE p_new."code" = 'workflow:update'
      ON CONFLICT DO NOTHING;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      DELETE FROM "role_permissions"
      WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "code" = 'workflow:update');
    `);
    this.addSql(`DELETE FROM "permissions" WHERE "code" = 'workflow:update';`);
  }
}
