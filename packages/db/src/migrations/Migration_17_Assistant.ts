import { Migration } from '@mikro-orm/migrations';

export class Migration17Assistant extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "assistant_threads" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "title" varchar(500) NULL,
        "pinned_trackable_id" uuid NULL,
        "last_message_at" timestamptz NULL,
        "archived_at" timestamptz NULL,
        CONSTRAINT "assistant_threads_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "assistant_threads_organization_id_fkey"
          FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE,
        CONSTRAINT "assistant_threads_user_id_fkey"
          FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE CASCADE,
        CONSTRAINT "assistant_threads_pinned_trackable_id_fkey"
          FOREIGN KEY ("pinned_trackable_id") REFERENCES "trackables" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "assistant_threads_org_user_idx"
        ON "assistant_threads" ("organization_id", "user_id");
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "assistant_threads_last_message_idx"
        ON "assistant_threads" ("last_message_at" DESC);
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "assistant_messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "thread_id" uuid NOT NULL,
        "role" varchar(32) NOT NULL,
        "content" text NULL,
        "tool_calls" jsonb NULL,
        "tool_call_id" varchar(128) NULL,
        "tool_name" varchar(128) NULL,
        "feedback" varchar(8) NULL,
        "attachment_ids" jsonb NULL,
        CONSTRAINT "assistant_messages_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "assistant_messages_thread_id_fkey"
          FOREIGN KEY ("thread_id") REFERENCES "assistant_threads" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "assistant_messages_thread_created_idx"
        ON "assistant_messages" ("thread_id", "created_at");
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "assistant_attachments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "thread_id" uuid NULL,
        "uploaded_by_id" uuid NOT NULL,
        "status" varchar(32) NOT NULL DEFAULT 'staged',
        "filename" varchar(500) NOT NULL,
        "mime_type" varchar(200) NOT NULL,
        "size" int NOT NULL,
        "minio_key" varchar(1024) NOT NULL,
        "document_id" uuid NULL,
        "extracted_text" text NULL,
        CONSTRAINT "assistant_attachments_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "assistant_attachments_organization_id_fkey"
          FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE,
        CONSTRAINT "assistant_attachments_thread_id_fkey"
          FOREIGN KEY ("thread_id") REFERENCES "assistant_threads" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "assistant_attachments_uploaded_by_id_fkey"
          FOREIGN KEY ("uploaded_by_id") REFERENCES "users" ("id") ON UPDATE CASCADE,
        CONSTRAINT "assistant_attachments_document_id_fkey"
          FOREIGN KEY ("document_id") REFERENCES "documents" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "assistant_attachments_org_status_created_idx"
        ON "assistant_attachments" ("organization_id", "status", "created_at");
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "assistant_attachments_thread_idx"
        ON "assistant_attachments" ("thread_id");
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "assistant_attachments" CASCADE;`);
    this.addSql(`DROP TABLE IF EXISTS "assistant_messages" CASCADE;`);
    this.addSql(`DROP TABLE IF EXISTS "assistant_threads" CASCADE;`);
  }
}
