import { Migration } from '@mikro-orm/migrations';

/**
 * Reparación idempotente por si `Migration_04` no llegó a aplicarse (p. ej. BD antigua
 * o migraciones pendientes). No rompe si 04 ya corrió bien (ADD IF NOT EXISTS + DO).
 *
 * Datos existentes: si sigue existiendo `item_type`, se copia a `kind` y se elimina
 * `item_type` (misma lógica que Migration_04).
 */
export class Migration05WorkflowLegalSchemaRepair extends Migration {
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
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'workflow_items'
            AND column_name = 'item_type'
        ) THEN
          UPDATE "workflow_items" SET "kind" = CASE
            WHEN "item_type"::text = 'service' THEN 'Fase'
            WHEN "item_type"::text = 'task' THEN 'Actuacion'
            ELSE NULL
          END
          WHERE "kind" IS NULL;
          ALTER TABLE "workflow_items" DROP COLUMN "item_type";
        END IF;
      END $$;
    `);

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
    // Intencionalmente vacío: la reparación no debe revertirse en silencio.
  }
}
