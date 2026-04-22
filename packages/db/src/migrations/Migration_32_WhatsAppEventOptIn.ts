import { Migration } from '@mikro-orm/migrations';

export class Migration32WhatsAppEventOptIn extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "whatsapp_event_opt_in" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "event_type" varchar(64) NOT NULL,
        "enabled" boolean NOT NULL DEFAULT true,
        CONSTRAINT "whatsapp_event_opt_in_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "whatsapp_event_opt_in_organization_id_fkey"
          FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "whatsapp_event_opt_in_user_id_fkey"
          FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "whatsapp_event_opt_in_user_event_uidx" UNIQUE ("user_id", "event_type")
      );
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "whatsapp_event_opt_in_org_idx"
        ON "whatsapp_event_opt_in" ("organization_id");
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "whatsapp_event_opt_in" CASCADE;`);
  }
}
