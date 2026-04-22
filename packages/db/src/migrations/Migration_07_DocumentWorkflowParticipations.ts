import { Migration } from '@mikro-orm/migrations';

export class Migration07DocumentWorkflowParticipations extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "document_workflow_participations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "document_id" uuid NOT NULL,
        "workflow_item_id" uuid NOT NULL,
        "started_at" timestamptz NOT NULL,
        "ended_at" timestamptz NULL,
        "version_at_start" int NULL,
        CONSTRAINT "document_workflow_participations_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "document_workflow_participations_organization_id_fkey"
          FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE,
        CONSTRAINT "document_workflow_participations_document_id_fkey"
          FOREIGN KEY ("document_id") REFERENCES "documents" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "document_workflow_participations_workflow_item_id_fkey"
          FOREIGN KEY ("workflow_item_id") REFERENCES "workflow_items" ("id") ON UPDATE CASCADE ON DELETE RESTRICT
      );
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "document_workflow_participations_document_id_idx"
      ON "document_workflow_participations" ("document_id");
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "document_workflow_participations_workflow_item_id_idx"
      ON "document_workflow_participations" ("workflow_item_id");
    `);

    this.addSql(`
      INSERT INTO "document_workflow_participations" (
        "id", "created_at", "updated_at", "organization_id", "document_id", "workflow_item_id",
        "started_at", "ended_at", "version_at_start"
      )
      SELECT
        uuid_generate_v4(),
        d."created_at",
        d."updated_at",
        d."organization_id",
        d."id",
        d."workflow_item_id",
        d."created_at",
        NULL,
        d."current_version"
      FROM "documents" d
      WHERE d."workflow_item_id" IS NOT NULL
        AND d."deleted_at" IS NULL;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "document_workflow_participations";`);
  }
}
