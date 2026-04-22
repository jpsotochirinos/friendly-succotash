import { Migration } from '@mikro-orm/migrations';

export class Migration18Import extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "import_batches" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "name" varchar(500) NOT NULL,
        "channel" varchar(32) NOT NULL,
        "status" varchar(32) NOT NULL DEFAULT 'created',
        "config" jsonb NULL,
        "total_items" int NOT NULL DEFAULT 0,
        "processed_items" int NOT NULL DEFAULT 0,
        "committed_items" int NOT NULL DEFAULT 0,
        "error_message" text NULL,
        "staging_expires_at" timestamptz NULL,
        "created_by_id" uuid NULL,
        CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "import_batches_organization_id_fkey"
          FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "import_batches_created_by_id_fkey"
          FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "import_batches_org_status_idx"
        ON "import_batches" ("organization_id", "status");
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "import_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "batch_id" uuid NOT NULL,
        "source_path" text NOT NULL,
        "sha256" varchar(64) NOT NULL,
        "size_bytes" bigint NOT NULL,
        "mime_detected" varchar(200) NULL,
        "staging_key" text NULL,
        "created_at_source" timestamptz NULL,
        "extracted_text_preview" text NULL,
        "text_storage_key" text NULL,
        "classification" jsonb NULL,
        "suggested_trackable_key" varchar(500) NULL,
        "trackable_confidence" double precision NULL,
        "mapped_trackable_id" uuid NULL,
        "mapped_document_id" uuid NULL,
        "parent_id" uuid NULL,
        "status" varchar(32) NOT NULL DEFAULT 'queued',
        "error_message" text NULL,
        CONSTRAINT "import_items_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "import_items_organization_id_fkey"
          FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "import_items_batch_id_fkey"
          FOREIGN KEY ("batch_id") REFERENCES "import_batches" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "import_items_mapped_trackable_id_fkey"
          FOREIGN KEY ("mapped_trackable_id") REFERENCES "trackables" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "import_items_mapped_document_id_fkey"
          FOREIGN KEY ("mapped_document_id") REFERENCES "documents" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "import_items_parent_id_fkey"
          FOREIGN KEY ("parent_id") REFERENCES "import_items" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "import_items_org_sha256_idx"
        ON "import_items" ("organization_id", "sha256");
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "import_items_batch_sha256_idx"
        ON "import_items" ("batch_id", "sha256");
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "import_items_batch_status_idx"
        ON "import_items" ("batch_id", "status");
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "import_items" CASCADE;`);
    this.addSql(`DROP TABLE IF EXISTS "import_batches" CASCADE;`);
  }
}
