import { Migration } from '@mikro-orm/migrations';

export class Migration11UserSinoeCredentials extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "user_sinoe_credentials" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "ciphertext" bytea NOT NULL,
        "iv" bytea NOT NULL,
        "auth_tag" bytea NOT NULL,
        "key_version" smallint NOT NULL DEFAULT 1,
        "last_scrape_snapshot" jsonb NULL,
        "last_scrape_at" timestamptz NULL,
        "last_scrape_error" text NULL,
        CONSTRAINT "user_sinoe_credentials_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "user_sinoe_credentials_organization_id_fkey"
          FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "user_sinoe_credentials_user_id_fkey"
          FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "user_sinoe_credentials_user_id_uidx" UNIQUE ("user_id")
      );
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "user_sinoe_credentials_organization_id_idx"
        ON "user_sinoe_credentials" ("organization_id");
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "user_sinoe_credentials" CASCADE;`);
  }
}
