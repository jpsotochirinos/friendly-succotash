import { Migration } from '@mikro-orm/migrations';

export class Migration08ClientsAndTrackableClient extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "clients" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "name" varchar(500) NOT NULL,
        "email" varchar(255) NULL,
        "phone" varchar(64) NULL,
        "document_id" varchar(120) NULL,
        "notes" text NULL,
        CONSTRAINT "clients_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "clients_organization_id_fkey"
          FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE
      );
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "clients_organization_id_idx" ON "clients" ("organization_id");
    `);

    this.addSql(`
      ALTER TABLE "trackables"
      ADD COLUMN IF NOT EXISTS "client_id" uuid NULL;
    `);
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'trackables_client_id_fkey'
        ) THEN
          ALTER TABLE "trackables"
          ADD CONSTRAINT "trackables_client_id_fkey"
          FOREIGN KEY ("client_id") REFERENCES "clients" ("id")
          ON UPDATE CASCADE ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "trackables_client_id_idx" ON "trackables" ("client_id");
    `);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE "trackables" DROP CONSTRAINT IF EXISTS "trackables_client_id_fkey";`);
    this.addSql(`DROP INDEX IF EXISTS "trackables_client_id_idx";`);
    this.addSql(`ALTER TABLE "trackables" DROP COLUMN IF EXISTS "client_id";`);
    this.addSql(`DROP TABLE IF EXISTS "clients" CASCADE;`);
  }
}
