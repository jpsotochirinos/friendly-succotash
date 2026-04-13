import { Migration } from '@mikro-orm/migrations';

export class Migration00Initial extends Migration {
  async up(): Promise<void> {
    this.addSql('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    this.addSql('CREATE EXTENSION IF NOT EXISTS pg_trgm;');

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "organizations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "name" varchar(255) NOT NULL,
        "plan_tier" varchar(10) NOT NULL DEFAULT 'free',
        "settings" jsonb NULL,
        "onboarding_state" jsonb NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "logo_url" varchar(255) NULL,
        CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
      );
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "permissions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "code" varchar(100) NOT NULL,
        "category" varchar(100) NOT NULL,
        "description" text NULL,
        CONSTRAINT "permissions_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "permissions_code_unique" UNIQUE ("code")
      );
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "name" varchar(100) NOT NULL,
        "description" text NULL,
        "is_system" boolean NOT NULL DEFAULT false,
        CONSTRAINT "roles_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "roles_organization_id_name_unique" UNIQUE ("organization_id", "name"),
        CONSTRAINT "roles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE
      );
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "role_permissions" (
        "role_id" uuid NOT NULL,
        "permission_id" uuid NOT NULL,
        CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id", "permission_id"),
        CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions" ("id") ON UPDATE CASCADE ON DELETE CASCADE
      );
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "email" varchar(255) NOT NULL,
        "first_name" varchar(255) NULL,
        "last_name" varchar(255) NULL,
        "password_hash" text NULL,
        "google_id" varchar(255) NULL,
        "avatar_url" varchar(500) NULL,
        "role_id" uuid NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "last_login_at" timestamptz NULL,
        "refresh_token" text NULL,
        CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "users_email_unique" UNIQUE ("email"),
        CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE,
        CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON UPDATE CASCADE ON DELETE SET NULL
      );
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "trackables" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "title" varchar(500) NOT NULL,
        "description" text NULL,
        "type" varchar(100) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'created',
        "created_by_id" uuid NULL,
        "assigned_to_id" uuid NULL,
        "metadata" jsonb NULL,
        "start_date" date NULL,
        "due_date" date NULL,
        "completed_at" timestamptz NULL,
        CONSTRAINT "trackables_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "trackables_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE,
        CONSTRAINT "trackables_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT "trackables_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE SET NULL
      );
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "folders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "trackable_id" uuid NOT NULL,
        "parent_id" uuid NULL,
        CONSTRAINT "folders_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "folders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE,
        CONSTRAINT "folders_trackable_id_fkey" FOREIGN KEY ("trackable_id") REFERENCES "trackables" ("id") ON UPDATE CASCADE,
        CONSTRAINT "folders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "folders" ("id") ON UPDATE CASCADE ON DELETE SET NULL
      );
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "title" varchar(500) NOT NULL,
        "filename" varchar(255) NULL,
        "mime_type" varchar(100) NULL,
        "minio_key" text NULL,
        "content_text" text NULL,
        "current_version" int NOT NULL DEFAULT 1,
        "review_status" varchar(20) NOT NULL DEFAULT 'draft',
        "evaluation_score" real NULL,
        "is_template" boolean NOT NULL DEFAULT false,
        "folder_id" uuid NULL,
        "workflow_item_id" uuid NULL,
        "uploaded_by_id" uuid NULL,
        CONSTRAINT "documents_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE,
        CONSTRAINT "documents_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT "documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE SET NULL
      );
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "workflow_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "trackable_id" uuid NOT NULL,
        "parent_id" uuid NULL,
        "title" varchar(500) NOT NULL,
        "description" text NULL,
        "item_type" varchar(20) NOT NULL,
        "action_type" varchar(30) NULL,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "assigned_to_id" uuid NULL,
        "reviewed_by_id" uuid NULL,
        "sort_order" int NOT NULL DEFAULT 0,
        "depth" int NOT NULL DEFAULT 0,
        "start_date" date NULL,
        "due_date" date NULL,
        "completed_at" timestamptz NULL,
        "requires_document" boolean NOT NULL DEFAULT false,
        "document_template_id" uuid NULL,
        "metadata" jsonb NULL,
        CONSTRAINT "workflow_items_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "workflow_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE,
        CONSTRAINT "workflow_items_trackable_id_fkey" FOREIGN KEY ("trackable_id") REFERENCES "trackables" ("id") ON UPDATE CASCADE,
        CONSTRAINT "workflow_items_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "workflow_items" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT "workflow_items_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT "workflow_items_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT "workflow_items_document_template_id_fkey" FOREIGN KEY ("document_template_id") REFERENCES "documents" ("id") ON UPDATE CASCADE ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS "workflow_items_trackable_id_idx" ON "workflow_items" ("trackable_id");
      CREATE INDEX IF NOT EXISTS "workflow_items_parent_id_idx" ON "workflow_items" ("parent_id");
    `);

    this.addSql(`
      ALTER TABLE "documents"
        ADD CONSTRAINT "documents_workflow_item_id_fkey"
        FOREIGN KEY ("workflow_item_id") REFERENCES "workflow_items" ("id")
        ON UPDATE CASCADE ON DELETE SET NULL;
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "document_versions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "document_id" uuid NOT NULL,
        "version_number" int NOT NULL,
        "minio_key" text NOT NULL,
        "editor_content" jsonb NULL,
        "file_size" bigint NULL,
        "created_by_id" uuid NULL,
        CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "document_versions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE SET NULL
      );
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "document_chunks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "document_id" uuid NOT NULL,
        "chunk_index" int NOT NULL,
        "content" text NOT NULL,
        CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "document_chunks_document_id_chunk_index_unique" UNIQUE ("document_id", "chunk_index"),
        CONSTRAINT "document_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents" ("id") ON UPDATE CASCADE ON DELETE CASCADE
      );
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "evaluations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "document_id" uuid NOT NULL,
        "document_version_id" uuid NULL,
        "type" varchar(50) NOT NULL,
        "score" real NOT NULL,
        "threshold" real NOT NULL,
        "result" varchar(20) NOT NULL DEFAULT 'pending',
        "details" jsonb NULL,
        CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "evaluations_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "evaluations_document_version_id_fkey" FOREIGN KEY ("document_version_id") REFERENCES "document_versions" ("id") ON UPDATE CASCADE ON DELETE SET NULL
      );
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "external_sources" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "trackable_id" uuid NOT NULL,
        "source_type" varchar(20) NOT NULL,
        "external_ref" varchar(500) NULL,
        "cached_data" jsonb NULL,
        "last_error" jsonb NULL,
        "last_checked_at" timestamptz NULL,
        CONSTRAINT "external_sources_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "external_sources_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE,
        CONSTRAINT "external_sources_trackable_id_fkey" FOREIGN KEY ("trackable_id") REFERENCES "trackables" ("id") ON UPDATE CASCADE
      );
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "activity_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "trackable_id" uuid NULL,
        "entity_type" varchar(100) NOT NULL,
        "entity_id" uuid NOT NULL,
        "user_id" uuid NULL,
        "action" varchar(100) NOT NULL,
        "details" jsonb NULL,
        "previous_values" jsonb NULL,
        "new_values" jsonb NULL,
        CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "activity_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE,
        CONSTRAINT "activity_logs_trackable_id_fkey" FOREIGN KEY ("trackable_id") REFERENCES "trackables" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS "activity_logs_trackable_id_idx" ON "activity_logs" ("trackable_id");
    `);

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
        CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE,
        CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE CASCADE,
        CONSTRAINT "notifications_trackable_id_fkey" FOREIGN KEY ("trackable_id") REFERENCES "trackables" ("id") ON UPDATE CASCADE ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS "notifications_user_id_is_read_idx" ON "notifications" ("user_id", "is_read");
    `);
  }

  async down(): Promise<void> {
    this.addSql('DROP TABLE IF EXISTS "notifications" CASCADE;');
    this.addSql('DROP TABLE IF EXISTS "activity_logs" CASCADE;');
    this.addSql('DROP TABLE IF EXISTS "external_sources" CASCADE;');
    this.addSql('DROP TABLE IF EXISTS "evaluations" CASCADE;');
    this.addSql('DROP TABLE IF EXISTS "document_chunks" CASCADE;');
    this.addSql('DROP TABLE IF EXISTS "document_versions" CASCADE;');
    this.addSql('DROP TABLE IF EXISTS "workflow_items" CASCADE;');
    this.addSql('DROP TABLE IF EXISTS "documents" CASCADE;');
    this.addSql('DROP TABLE IF EXISTS "folders" CASCADE;');
    this.addSql('DROP TABLE IF EXISTS "trackables" CASCADE;');
    this.addSql('DROP TABLE IF EXISTS "users" CASCADE;');
    this.addSql('DROP TABLE IF EXISTS "role_permissions" CASCADE;');
    this.addSql('DROP TABLE IF EXISTS "roles" CASCADE;');
    this.addSql('DROP TABLE IF EXISTS "permissions" CASCADE;');
    this.addSql('DROP TABLE IF EXISTS "organizations" CASCADE;');
  }
}
