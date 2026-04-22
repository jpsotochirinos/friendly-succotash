import { Migration } from '@mikro-orm/migrations';

export class Migration04WorkflowLegalRefactor extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "trackables" ADD COLUMN IF NOT EXISTS "matter_type" varchar(32) NOT NULL DEFAULT 'other';
    `);
    this.addSql(`
      ALTER TABLE "trackables" ADD COLUMN IF NOT EXISTS "expedient_number" varchar(120) NULL;
    `);
    this.addSql(`
      ALTER TABLE "trackables" ADD COLUMN IF NOT EXISTS "court" varchar(500) NULL;
    `);
    this.addSql(`
      ALTER TABLE "trackables" ADD COLUMN IF NOT EXISTS "counterparty_name" varchar(500) NULL;
    `);
    this.addSql(`
      ALTER TABLE "trackables" ADD COLUMN IF NOT EXISTS "jurisdiction" varchar(8) NOT NULL DEFAULT 'PE';
    `);

    this.addSql(`
      ALTER TABLE "workflow_items" ADD COLUMN IF NOT EXISTS "kind" varchar(120) NULL;
    `);
    this.addSql(`
      ALTER TABLE "workflow_items" ADD COLUMN IF NOT EXISTS "is_legal_deadline" boolean NOT NULL DEFAULT false;
    `);
    this.addSql(`
      ALTER TABLE "workflow_items" ADD COLUMN IF NOT EXISTS "instantiated_from_template_item_id" uuid NULL;
    `);

    this.addSql(`
      UPDATE "workflow_items" SET "kind" = CASE
        WHEN "item_type" = 'service' THEN 'Fase'
        WHEN "item_type" = 'task' THEN 'Actuacion'
        ELSE NULL
      END
      WHERE "item_type" IS NOT NULL;
    `);

    this.addSql(`ALTER TABLE "workflow_items" DROP COLUMN IF EXISTS "item_type";`);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "workflow_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "name" varchar(500) NOT NULL,
        "description" text NULL,
        "matter_type" varchar(32) NOT NULL,
        "category" varchar(120) NULL,
        "jurisdiction" varchar(8) NOT NULL DEFAULT 'PE',
        "is_system" boolean NOT NULL DEFAULT false,
        "organization_id" uuid NULL,
        CONSTRAINT "workflow_templates_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "workflow_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE
      );
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "workflow_template_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "template_id" uuid NOT NULL,
        "parent_id" uuid NULL,
        "title" varchar(500) NOT NULL,
        "description" text NULL,
        "kind" varchar(120) NULL,
        "action_type" varchar(40) NULL,
        "sort_order" int NOT NULL DEFAULT 0,
        "offset_days" int NULL,
        "requires_document" boolean NOT NULL DEFAULT false,
        "document_template_id" uuid NULL,
        CONSTRAINT "workflow_template_items_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "workflow_template_items_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "workflow_templates" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "workflow_template_items_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "workflow_template_items" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "workflow_template_items_document_template_id_fkey" FOREIGN KEY ("document_template_id") REFERENCES "documents" ("id") ON UPDATE CASCADE ON DELETE SET NULL
      );
    `);

    this.addSql(`CREATE INDEX IF NOT EXISTS "workflow_templates_matter_type_idx" ON "workflow_templates" ("matter_type");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "workflow_template_items_template_id_idx" ON "workflow_template_items" ("template_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "workflow_template_items_parent_id_idx" ON "workflow_template_items" ("parent_id");`);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "workflow_template_items" CASCADE;`);
    this.addSql(`DROP TABLE IF EXISTS "workflow_templates" CASCADE;`);

    this.addSql(`ALTER TABLE "workflow_items" ADD COLUMN IF NOT EXISTS "item_type" varchar(20) NOT NULL DEFAULT 'action';`);
    this.addSql(`
      UPDATE "workflow_items" SET "item_type" = CASE
        WHEN "kind" = 'Fase' THEN 'service'
        WHEN "kind" = 'Actuacion' THEN 'task'
        ELSE 'action'
      END;
    `);
    this.addSql(`ALTER TABLE "workflow_items" DROP COLUMN IF EXISTS "kind";`);
    this.addSql(`ALTER TABLE "workflow_items" DROP COLUMN IF EXISTS "is_legal_deadline";`);
    this.addSql(`ALTER TABLE "workflow_items" DROP COLUMN IF EXISTS "instantiated_from_template_item_id";`);

    this.addSql(`ALTER TABLE "trackables" DROP COLUMN IF EXISTS "matter_type";`);
    this.addSql(`ALTER TABLE "trackables" DROP COLUMN IF EXISTS "expedient_number";`);
    this.addSql(`ALTER TABLE "trackables" DROP COLUMN IF EXISTS "court";`);
    this.addSql(`ALTER TABLE "trackables" DROP COLUMN IF EXISTS "counterparty_name";`);
    this.addSql(`ALTER TABLE "trackables" DROP COLUMN IF EXISTS "jurisdiction";`);
  }
}
