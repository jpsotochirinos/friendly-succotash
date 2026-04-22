import { Migration } from '@mikro-orm/migrations';

export class Migration16TrackableParties extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "trackable_parties" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "trackable_id" uuid NOT NULL,
        "role" varchar(32) NOT NULL DEFAULT 'other',
        "party_name" varchar(500) NOT NULL,
        "document_id" varchar(120) NULL,
        "email" varchar(255) NULL,
        "phone" varchar(64) NULL,
        "notes" text NULL,
        "sort_order" int NOT NULL DEFAULT 0,
        CONSTRAINT "trackable_parties_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "trackable_parties_organization_id_fkey"
          FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE,
        CONSTRAINT "trackable_parties_trackable_id_fkey"
          FOREIGN KEY ("trackable_id") REFERENCES "trackables" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "trackable_parties_trackable_id_idx" ON "trackable_parties" ("trackable_id");
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "trackable_parties_organization_id_idx" ON "trackable_parties" ("organization_id");
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "trackable_parties" CASCADE;`);
  }
}
