import { Migration } from '@mikro-orm/migrations';

export class Migration36Signatures extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "documents"
      ADD COLUMN IF NOT EXISTS "pdf_minio_key" varchar(255) NULL;
    `);
    this.addSql(`
      ALTER TABLE "documents"
      ADD COLUMN IF NOT EXISTS "locked_for_signing" boolean NOT NULL DEFAULT false;
    `);

    this.addSql(`
      CREATE TABLE "signature_profiles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL,
        "updated_at" timestamptz NOT NULL,
        "organization_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "storage_key" varchar(255) NOT NULL,
        "mime_type" varchar(100) NOT NULL,
        "initials_storage_key" varchar(255) NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "verified_at" timestamptz NULL,
        CONSTRAINT "signature_profiles_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "signature_profiles_organization_id_fkey" FOREIGN KEY ("organization_id")
          REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "signature_profiles_user_id_fkey" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "signature_profiles_org_user_unique" UNIQUE ("organization_id", "user_id")
      );
    `);
    this.addSql(`CREATE INDEX IF NOT EXISTS "signature_profiles_organization_id_index" ON "signature_profiles" ("organization_id");`);

    this.addSql(`
      CREATE TABLE "signature_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL,
        "updated_at" timestamptz NOT NULL,
        "organization_id" uuid NOT NULL,
        "document_id" uuid NOT NULL,
        "created_by_id" uuid NOT NULL,
        "title" varchar(500) NOT NULL,
        "message" text NULL,
        "status" varchar(32) NOT NULL DEFAULT 'draft',
        "mode" varchar(32) NOT NULL,
        "completed_at" timestamptz NULL,
        "expires_at" timestamptz NOT NULL,
        "document_signed_key" varchar(255) NULL,
        "document_hash_before" varchar(64) NULL,
        "document_hash_after" varchar(64) NULL,
        "tsa_timestamp" text NULL,
        "docx_conversion_pending" boolean NOT NULL DEFAULT false,
        "conversion_error" text NULL,
        CONSTRAINT "signature_requests_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "signature_requests_organization_id_fkey" FOREIGN KEY ("organization_id")
          REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "signature_requests_document_id_fkey" FOREIGN KEY ("document_id")
          REFERENCES "documents" ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT "signature_requests_created_by_id_fkey" FOREIGN KEY ("created_by_id")
          REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT
      );
    `);
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "signature_requests_org_status_index" ON "signature_requests" ("organization_id", "status");`,
    );
    this.addSql(`CREATE INDEX IF NOT EXISTS "signature_requests_document_id_index" ON "signature_requests" ("document_id");`);

    this.addSql(`
      CREATE TABLE "signature_request_signers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL,
        "updated_at" timestamptz NOT NULL,
        "organization_id" uuid NOT NULL,
        "request_id" uuid NOT NULL,
        "user_id" uuid NULL,
        "external_name" varchar(255) NULL,
        "external_email" varchar(255) NULL,
        "external_phone" varchar(32) NULL,
        "signer_order" int NOT NULL,
        "status" varchar(32) NOT NULL DEFAULT 'pending',
        "token_hash" varchar(64) NULL,
        "token_expires_at" timestamptz NULL,
        "signed_at" timestamptz NULL,
        "signature_zone" jsonb NULL,
        CONSTRAINT "signature_request_signers_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "signature_request_signers_organization_id_fkey" FOREIGN KEY ("organization_id")
          REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "signature_request_signers_request_id_fkey" FOREIGN KEY ("request_id")
          REFERENCES "signature_requests" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "signature_request_signers_user_id_fkey" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT "signature_request_signers_request_order_unique" UNIQUE ("request_id", "signer_order"),
        CONSTRAINT "signature_request_signers_token_hash_unique" UNIQUE ("token_hash")
      );
    `);
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "signature_request_signers_request_id_index" ON "signature_request_signers" ("request_id");`,
    );

    this.addSql(`
      CREATE TABLE "signature_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL,
        "updated_at" timestamptz NOT NULL,
        "organization_id" uuid NOT NULL,
        "signer_id" uuid NOT NULL,
        "event_type" varchar(32) NOT NULL,
        "ip_address" varchar(64) NOT NULL,
        "user_agent" text NOT NULL,
        "event_at" timestamptz NOT NULL,
        "otp_verified_at" timestamptz NULL,
        "document_hash" varchar(64) NULL,
        "metadata" jsonb NULL,
        CONSTRAINT "signature_events_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "signature_events_organization_id_fkey" FOREIGN KEY ("organization_id")
          REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "signature_events_signer_id_fkey" FOREIGN KEY ("signer_id")
          REFERENCES "signature_request_signers" ("id") ON UPDATE CASCADE ON DELETE CASCADE
      );
    `);
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "signature_events_signer_event_at_index" ON "signature_events" ("signer_id", "event_at");`,
    );

    this.addSql(`
      CREATE TABLE "signature_otps" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL,
        "updated_at" timestamptz NOT NULL,
        "organization_id" uuid NOT NULL,
        "signer_id" uuid NOT NULL,
        "code_hash" varchar(64) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "used" boolean NOT NULL DEFAULT false,
        "channel" varchar(8) NOT NULL DEFAULT 'email',
        "attempts" int NOT NULL DEFAULT 0,
        "last_sent_at" timestamptz NULL,
        CONSTRAINT "signature_otps_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "signature_otps_organization_id_fkey" FOREIGN KEY ("organization_id")
          REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "signature_otps_signer_id_fkey" FOREIGN KEY ("signer_id")
          REFERENCES "signature_request_signers" ("id") ON UPDATE CASCADE ON DELETE CASCADE
      );
    `);
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "signature_otps_signer_expires_used_index" ON "signature_otps" ("signer_id", "expires_at", "used");`,
    );
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "signature_otps" CASCADE;`);
    this.addSql(`DROP TABLE IF EXISTS "signature_events" CASCADE;`);
    this.addSql(`DROP TABLE IF EXISTS "signature_request_signers" CASCADE;`);
    this.addSql(`DROP TABLE IF EXISTS "signature_requests" CASCADE;`);
    this.addSql(`DROP TABLE IF EXISTS "signature_profiles" CASCADE;`);
    this.addSql(`ALTER TABLE "documents" DROP COLUMN IF EXISTS "locked_for_signing";`);
    this.addSql(`ALTER TABLE "documents" DROP COLUMN IF EXISTS "pdf_minio_key";`);
  }
}
