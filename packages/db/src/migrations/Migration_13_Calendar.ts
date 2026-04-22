import { Migration } from '@mikro-orm/migrations';

export class Migration13Calendar extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "workflow_items"
        ALTER COLUMN "start_date" TYPE timestamptz USING ("start_date"::timestamp AT TIME ZONE 'UTC'),
        ALTER COLUMN "due_date" TYPE timestamptz USING ("due_date"::timestamp AT TIME ZONE 'UTC');
    `);

    this.addSql(`
      ALTER TABLE "workflow_items"
        ADD COLUMN IF NOT EXISTS "location" varchar(255) NULL,
        ADD COLUMN IF NOT EXISTS "priority" varchar(20) NOT NULL DEFAULT 'normal',
        ADD COLUMN IF NOT EXISTS "all_day" boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS "reminder_minutes_before" int[] NULL,
        ADD COLUMN IF NOT EXISTS "calendar_color" varchar(32) NULL,
        ADD COLUMN IF NOT EXISTS "rrule" text NULL;
    `);

    this.addSql(`
      ALTER TABLE "workflow_items"
        ADD CONSTRAINT "workflow_items_priority_check"
        CHECK ("priority" IN ('low', 'normal', 'high', 'urgent'));
    `);

    this.addSql(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "birth_date" date NULL,
        ADD COLUMN IF NOT EXISTS "calendar_ics_token" varchar(64) NULL;
    `);

    this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS "users_calendar_ics_token_unique"
      ON "users" ("calendar_ics_token") WHERE "calendar_ics_token" IS NOT NULL;
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "calendar_integrations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "provider" varchar(20) NOT NULL,
        "access_token" text NULL,
        "refresh_token" text NULL,
        "expires_at" timestamptz NULL,
        "external_calendar_id" varchar(255) NULL,
        "sync_token" text NULL,
        "watch_channel_id" varchar(255) NULL,
        "watch_resource_id" text NULL,
        "watch_expiration" timestamptz NULL,
        "last_sync_at" timestamptz NULL,
        "export_enabled" boolean NOT NULL DEFAULT true,
        "import_enabled" boolean NOT NULL DEFAULT true,
        CONSTRAINT "calendar_integrations_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "calendar_integrations_organization_id_fkey"
          FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "calendar_integrations_user_id_fkey"
          FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "calendar_integrations_provider_check"
          CHECK ("provider" IN ('google', 'outlook')),
        CONSTRAINT "calendar_integrations_user_provider_unique" UNIQUE ("user_id", "provider")
      );
    `);

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "calendar_integrations_user_id_idx"
      ON "calendar_integrations" ("user_id");
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "workflow_item_calendar_mappings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "workflow_item_id" uuid NOT NULL,
        "provider" varchar(20) NOT NULL,
        "external_event_id" varchar(512) NOT NULL,
        "etag" varchar(512) NULL,
        CONSTRAINT "workflow_item_calendar_mappings_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "workflow_item_calendar_mappings_wi_fkey"
          FOREIGN KEY ("workflow_item_id") REFERENCES "workflow_items" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "workflow_item_calendar_mappings_provider_check"
          CHECK ("provider" IN ('google', 'outlook')),
        CONSTRAINT "workflow_item_calendar_mappings_unique"
          UNIQUE ("workflow_item_id", "provider")
      );
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "calendar_imported_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "integration_id" uuid NOT NULL,
        "external_id" varchar(512) NOT NULL,
        "title" varchar(500) NOT NULL,
        "body" text NULL,
        "starts_at" timestamptz NOT NULL,
        "ends_at" timestamptz NOT NULL,
        "all_day" boolean NOT NULL DEFAULT false,
        "etag" varchar(512) NULL,
        CONSTRAINT "calendar_imported_events_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "calendar_imported_events_org_fkey"
          FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "calendar_imported_events_int_fkey"
          FOREIGN KEY ("integration_id") REFERENCES "calendar_integrations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "calendar_imported_events_ext_unique" UNIQUE ("integration_id", "external_id")
      );
    `);

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "calendar_imported_events_org_starts_idx"
      ON "calendar_imported_events" ("organization_id", "starts_at");
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "workflow_item_reminder_dispatches" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "workflow_item_id" uuid NOT NULL,
        "minute_offset" int NOT NULL,
        "scheduled_fire_at" timestamptz NOT NULL,
        CONSTRAINT "workflow_item_reminder_dispatches_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "workflow_item_reminder_dispatches_wi_fkey"
          FOREIGN KEY ("workflow_item_id") REFERENCES "workflow_items" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "workflow_item_reminder_dispatches_unique"
          UNIQUE ("workflow_item_id", "minute_offset", "scheduled_fire_at")
      );
    `);

    this.addSql(`
      INSERT INTO "permissions" ("id", "created_at", "updated_at", "code", "category", "description")
      SELECT uuid_generate_v4(), now(), now(), 'calendar:read', 'calendar', 'View organization calendar'
      WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "code" = 'calendar:read');
    `);
    this.addSql(`
      INSERT INTO "permissions" ("id", "created_at", "updated_at", "code", "category", "description")
      SELECT uuid_generate_v4(), now(), now(), 'calendar:view_team', 'calendar', 'View team members calendar scope'
      WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "code" = 'calendar:view_team');
    `);
    this.addSql(`
      INSERT INTO "permissions" ("id", "created_at", "updated_at", "code", "category", "description")
      SELECT uuid_generate_v4(), now(), now(), 'calendar:integration:manage', 'calendar', 'Connect Google/Outlook calendar'
      WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "code" = 'calendar:integration:manage');
    `);

    this.addSql(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT rp."role_id", p."id"
      FROM "role_permissions" rp
      INNER JOIN "permissions" p_old ON p_old."id" = rp."permission_id" AND p_old."code" = 'trackable:read'
      CROSS JOIN "permissions" p
      WHERE p."code" IN ('calendar:read', 'calendar:view_team')
      ON CONFLICT DO NOTHING;
    `);

    this.addSql(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT rp."role_id", p."id"
      FROM "role_permissions" rp
      INNER JOIN "permissions" p_old ON p_old."id" = rp."permission_id" AND p_old."code" = 'trackable:read'
      CROSS JOIN "permissions" p
      WHERE p."code" = 'calendar:integration:manage'
      ON CONFLICT DO NOTHING;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "workflow_item_reminder_dispatches" CASCADE;`);
    this.addSql(`DROP TABLE IF EXISTS "calendar_imported_events" CASCADE;`);
    this.addSql(`DROP TABLE IF EXISTS "workflow_item_calendar_mappings" CASCADE;`);
    this.addSql(`DROP TABLE IF EXISTS "calendar_integrations" CASCADE;`);

    this.addSql(`
      DELETE FROM "role_permissions"
      WHERE "permission_id" IN (
        SELECT "id" FROM "permissions" WHERE "code" IN (
          'calendar:read', 'calendar:view_team', 'calendar:integration:manage'
        )
      );
    `);
    this.addSql(`
      DELETE FROM "permissions" WHERE "code" IN (
        'calendar:read', 'calendar:view_team', 'calendar:integration:manage'
      );
    `);

    this.addSql(`DROP INDEX IF EXISTS "users_calendar_ics_token_unique";`);
    this.addSql(`ALTER TABLE "users" DROP COLUMN IF EXISTS "birth_date", DROP COLUMN IF EXISTS "calendar_ics_token";`);

    this.addSql(`ALTER TABLE "workflow_items" DROP CONSTRAINT IF EXISTS "workflow_items_priority_check";`);
    this.addSql(`
      ALTER TABLE "workflow_items"
        DROP COLUMN IF EXISTS "location",
        DROP COLUMN IF EXISTS "priority",
        DROP COLUMN IF EXISTS "all_day",
        DROP COLUMN IF EXISTS "reminder_minutes_before",
        DROP COLUMN IF EXISTS "calendar_color",
        DROP COLUMN IF EXISTS "rrule";
    `);

    this.addSql(`
      ALTER TABLE "workflow_items"
        ALTER COLUMN "start_date" TYPE date USING ("start_date"::date),
        ALTER COLUMN "due_date" TYPE date USING ("due_date"::date);
    `);
  }
}
