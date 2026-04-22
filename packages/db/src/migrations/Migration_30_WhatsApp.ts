import { Migration } from '@mikro-orm/migrations';

export class Migration30WhatsApp extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "whatsapp_accounts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "phone_number_id" varchar(120) NOT NULL,
        "display_phone" varchar(32) NOT NULL,
        "provider" varchar(32) NOT NULL,
        "group_ids" jsonb NULL,
        "briefing_cron" varchar(64) NOT NULL DEFAULT '0 8 * * *',
        "briefing_enabled" boolean NOT NULL DEFAULT false,
        "briefing_group_id" varchar(120) NULL,
        CONSTRAINT "whatsapp_accounts_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "whatsapp_accounts_organization_id_fkey"
          FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "whatsapp_accounts_org_uidx" UNIQUE ("organization_id")
      );
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "whatsapp_users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "phone_number" varchar(20) NOT NULL,
        "verified_at" timestamptz NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "receive_briefing" boolean NOT NULL DEFAULT false,
        "verification_code" varchar(6) NULL,
        "verification_expires_at" timestamptz NULL,
        "verification_attempts" int NOT NULL DEFAULT 0,
        "last_verification_sent_at" timestamptz NULL,
        CONSTRAINT "whatsapp_users_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "whatsapp_users_organization_id_fkey"
          FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "whatsapp_users_user_id_fkey"
          FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "whatsapp_users_org_phone_uidx" UNIQUE ("organization_id", "phone_number")
      );
    `);

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "whatsapp_users_phone_number_idx"
        ON "whatsapp_users" ("phone_number");
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "whatsapp_messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "external_id" varchar(120) NOT NULL,
        "group_id" varchar(120) NULL,
        "from_phone" varchar(32) NOT NULL,
        "sender_id" uuid NULL,
        "body" text NOT NULL,
        "direction" varchar(16) NOT NULL,
        "timestamp" timestamptz NOT NULL,
        "processed_at" timestamptz NULL,
        CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "whatsapp_messages_organization_id_fkey"
          FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "whatsapp_messages_sender_id_fkey"
          FOREIGN KEY ("sender_id") REFERENCES "whatsapp_users" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT "whatsapp_messages_org_external_uidx" UNIQUE ("organization_id", "external_id")
      );
    `);

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "whatsapp_messages_tenant_id_idx"
        ON "whatsapp_messages" ("organization_id");
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "whatsapp_messages_org_timestamp_idx"
        ON "whatsapp_messages" ("organization_id", "timestamp" DESC);
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "whatsapp_activity_suggestions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "source_message_id" uuid NOT NULL,
        "suggested_to_id" uuid NOT NULL,
        "related_trackable_id" uuid NULL,
        "extracted_text" text NOT NULL,
        "suggested_title" text NULL,
        "status" varchar(32) NOT NULL DEFAULT 'pending',
        "workflow_item_id" uuid NULL,
        "confirmed_at" timestamptz NULL,
        CONSTRAINT "whatsapp_activity_suggestions_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "whatsapp_activity_suggestions_organization_id_fkey"
          FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "whatsapp_activity_suggestions_source_message_id_fkey"
          FOREIGN KEY ("source_message_id") REFERENCES "whatsapp_messages" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "whatsapp_activity_suggestions_suggested_to_id_fkey"
          FOREIGN KEY ("suggested_to_id") REFERENCES "whatsapp_users" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "whatsapp_activity_suggestions_related_trackable_id_fkey"
          FOREIGN KEY ("related_trackable_id") REFERENCES "trackables" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT "whatsapp_activity_suggestions_workflow_item_id_fkey"
          FOREIGN KEY ("workflow_item_id") REFERENCES "workflow_items" ("id") ON UPDATE CASCADE ON DELETE SET NULL
      );
    `);

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "whatsapp_activity_suggestions_status_idx"
        ON "whatsapp_activity_suggestions" ("status");
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "whatsapp_activity_suggestions" CASCADE;`);
    this.addSql(`DROP TABLE IF EXISTS "whatsapp_messages" CASCADE;`);
    this.addSql(`DROP TABLE IF EXISTS "whatsapp_users" CASCADE;`);
    this.addSql(`DROP TABLE IF EXISTS "whatsapp_accounts" CASCADE;`);
  }
}
