import { Migration } from '@mikro-orm/migrations';

export class Migration28SinoeNotifications extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "sinoe_notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "nro_notificacion" varchar(120) NOT NULL,
        "nro_expediente" text NOT NULL,
        "sumilla" text NOT NULL,
        "organo_jurisdiccional" text NOT NULL,
        "fecha" timestamptz NOT NULL,
        "estado_revision" varchar(32) NOT NULL,
        "carpeta" text NOT NULL,
        "user_id" uuid NOT NULL,
        "trackable_id" uuid NULL,
        "workflow_item_id" uuid NULL,
        "raw_data" jsonb NULL,
        CONSTRAINT "sinoe_notifications_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "sinoe_notifications_organization_id_fkey"
          FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "sinoe_notifications_user_id_fkey"
          FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "sinoe_notifications_trackable_id_fkey"
          FOREIGN KEY ("trackable_id") REFERENCES "trackables" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT "sinoe_notifications_workflow_item_id_fkey"
          FOREIGN KEY ("workflow_item_id") REFERENCES "workflow_items" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT "sinoe_notifications_org_nro_uidx" UNIQUE ("organization_id", "nro_notificacion")
      );
    `);

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "sinoe_notifications_organization_fecha_idx"
        ON "sinoe_notifications" ("organization_id", "fecha" DESC);
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "sinoe_notifications_organization_expediente_idx"
        ON "sinoe_notifications" ("organization_id", "nro_expediente");
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "sinoe_attachments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "notification_id" uuid NOT NULL,
        "tipo" text NOT NULL,
        "identificacion_anexo" text NOT NULL,
        "nro_paginas" text NOT NULL,
        "peso_archivo" text NOT NULL,
        "document_id" uuid NULL,
        "sha256" varchar(64) NULL,
        "size_bytes" varchar(32) NULL,
        CONSTRAINT "sinoe_attachments_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "sinoe_attachments_organization_id_fkey"
          FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "sinoe_attachments_notification_id_fkey"
          FOREIGN KEY ("notification_id") REFERENCES "sinoe_notifications" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "sinoe_attachments_document_id_fkey"
          FOREIGN KEY ("document_id") REFERENCES "documents" ("id") ON UPDATE CASCADE ON DELETE SET NULL
      );
    `);

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "sinoe_attachments_notification_id_idx"
        ON "sinoe_attachments" ("notification_id");
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "sinoe_attachments" CASCADE;`);
    this.addSql(`DROP TABLE IF EXISTS "sinoe_notifications" CASCADE;`);
  }
}
