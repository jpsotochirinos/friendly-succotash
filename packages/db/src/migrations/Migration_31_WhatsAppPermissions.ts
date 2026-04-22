import { Migration } from '@mikro-orm/migrations';

/** Adds whatsapp:* permissions and grants them to system roles (Owner, Senior Operator, Junior Operator). */
export class Migration31WhatsAppPermissions extends Migration {
  async up(): Promise<void> {
    const codes = [
      ['whatsapp:use_assistant', 'Use the AI assistant over WhatsApp'],
      ['whatsapp:send_to_self', 'Allow assistant to send messages or links to own WhatsApp'],
      ['whatsapp:send_to_others', 'Allow assistant to message other org members via WhatsApp'],
      [
        'whatsapp:receive_notifications',
        'Receive calendar and in-app notification digests via WhatsApp',
      ],
    ] as const;

    for (const [code, description] of codes) {
      this.addSql(`
        INSERT INTO "permissions" ("id", "created_at", "updated_at", "code", "category", "description")
        SELECT uuid_generate_v4(), now(), now(), '${code}', 'whatsapp', '${description.replace(/'/g, "''")}'
        WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "code" = '${code}');
      `);
    }

    this.addSql(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id"
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r."is_system" = true
        AND r."name" IN ('Owner', 'Senior Operator')
        AND p."code" IN (
          'whatsapp:use_assistant',
          'whatsapp:send_to_self',
          'whatsapp:send_to_others',
          'whatsapp:receive_notifications'
        )
      ON CONFLICT DO NOTHING;
    `);

    this.addSql(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id"
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r."is_system" = true
        AND r."name" = 'Junior Operator'
        AND p."code" IN (
          'whatsapp:use_assistant',
          'whatsapp:send_to_self',
          'whatsapp:receive_notifications'
        )
      ON CONFLICT DO NOTHING;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      DELETE FROM "role_permissions"
      WHERE "permission_id" IN (
        SELECT "id" FROM "permissions" WHERE "code" LIKE 'whatsapp:%'
      );
    `);
    this.addSql(`DELETE FROM "permissions" WHERE "code" LIKE 'whatsapp:%';`);
  }
}
