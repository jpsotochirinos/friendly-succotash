import { Migration } from '@mikro-orm/migrations';

export class Migration20ImportAgents extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "import_agents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "label" varchar(200) NULL,
        "token_hash" varchar(128) NOT NULL,
        "last_heartbeat_at" timestamptz NULL,
        "last_stats" jsonb NULL,
        CONSTRAINT "import_agents_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "import_agents_organization_id_fkey"
          FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "import_agents_user_id_fkey"
          FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE CASCADE
      );
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "import_agents_organization_id_user_id_idx"
        ON "import_agents" ("organization_id", "user_id");
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "import_agents" CASCADE;`);
  }
}
