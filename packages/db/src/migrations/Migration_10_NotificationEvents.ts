import { Migration } from '@mikro-orm/migrations';

export class Migration10NotificationEvents extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "notification_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "trackable_id" uuid NULL,
        "type" varchar(80) NOT NULL,
        "title" varchar(500) NOT NULL,
        "message" text NULL,
        "data" jsonb NULL,
        "dedupe_key" varchar(300) NULL,
        "source_entity_type" varchar(80) NULL,
        "source_entity_id" uuid NULL,
        CONSTRAINT "notification_events_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "notification_events_organization_id_fkey"
          FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "notification_events_trackable_id_fkey"
          FOREIGN KEY ("trackable_id") REFERENCES "trackables" ("id") ON UPDATE CASCADE ON DELETE SET NULL
      );
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "notification_events_organization_id_created_at_idx"
        ON "notification_events" ("organization_id", "created_at");
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "notification_events_trackable_id_idx"
        ON "notification_events" ("trackable_id");
    `);
    this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS "notification_events_org_dedupe_uidx"
        ON "notification_events" ("organization_id", "dedupe_key")
        WHERE "dedupe_key" IS NOT NULL;
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "notification_recipients" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "notification_event_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "role" varchar(32) NOT NULL,
        "is_read" boolean NOT NULL DEFAULT false,
        "read_at" timestamptz NULL,
        "email_sent_at" timestamptz NULL,
        CONSTRAINT "notification_recipients_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "notification_recipients_notification_event_id_fkey"
          FOREIGN KEY ("notification_event_id") REFERENCES "notification_events" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "notification_recipients_user_id_fkey"
          FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "notification_recipients_event_user_uidx" UNIQUE ("notification_event_id", "user_id")
      );
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "notification_recipients_user_id_is_read_idx"
        ON "notification_recipients" ("user_id", "is_read");
    `);

    this.addSql(`
      INSERT INTO "notification_events" (
        "id", "created_at", "updated_at", "organization_id", "trackable_id",
        "type", "title", "message", "data", "dedupe_key", "source_entity_type", "source_entity_id"
      )
      SELECT
        "id", "created_at", "updated_at", "organization_id", "trackable_id",
        "type", "title", "message", "data", NULL, NULL, NULL
      FROM "notifications";
    `);

    this.addSql(`
      INSERT INTO "notification_recipients" (
        "created_at", "updated_at", "notification_event_id", "user_id", "role", "is_read", "read_at", "email_sent_at"
      )
      SELECT
        "created_at", "updated_at", "id", "user_id", 'assignee', "is_read", "read_at", NULL
      FROM "notifications";
    `);

    this.addSql(`DROP TABLE IF EXISTS "notifications" CASCADE;`);
  }

  async down(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "trackable_id" uuid NULL,
        "type" varchar(50) NOT NULL,
        "title" varchar(500) NOT NULL,
        "message" text NULL,
        "is_read" boolean NOT NULL DEFAULT false,
        "read_at" timestamptz NULL,
        "data" jsonb NULL,
        CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "notifications_organization_id_fkey"
          FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE,
        CONSTRAINT "notifications_user_id_fkey"
          FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE CASCADE,
        CONSTRAINT "notifications_trackable_id_fkey"
          FOREIGN KEY ("trackable_id") REFERENCES "trackables" ("id") ON UPDATE CASCADE ON DELETE SET NULL
      );
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "notifications_user_id_is_read_idx" ON "notifications" ("user_id", "is_read");
    `);

    this.addSql(`
      INSERT INTO "notifications" (
        "id", "created_at", "updated_at", "organization_id", "user_id", "trackable_id",
        "type", "title", "message", "is_read", "read_at", "data"
      )
      SELECT
        e."id", e."created_at", e."updated_at", e."organization_id", r."user_id", e."trackable_id",
        e."type", e."title", e."message", r."is_read", r."read_at", e."data"
      FROM "notification_events" e
      INNER JOIN "notification_recipients" r ON r."notification_event_id" = e."id" AND r."role" = 'assignee';
    `);

    this.addSql(`DROP TABLE IF EXISTS "notification_recipients" CASCADE;`);
    this.addSql(`DROP TABLE IF EXISTS "notification_events" CASCADE;`);
  }
}
