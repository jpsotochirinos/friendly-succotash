import { Migration } from '@mikro-orm/migrations';

export class Migration09OrganizationInvitations extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "organization_invitations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "email" varchar(255) NOT NULL,
        "role_id" uuid NOT NULL,
        "token_hash" varchar(64) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "status" varchar(32) NOT NULL DEFAULT 'pending',
        "invited_by_id" uuid NULL,
        CONSTRAINT "organization_invitations_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "organization_invitations_organization_id_fkey"
          FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "organization_invitations_role_id_fkey"
          FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "organization_invitations_invited_by_id_fkey"
          FOREIGN KEY ("invited_by_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE SET NULL
      );
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "organization_invitations_organization_id_idx"
        ON "organization_invitations" ("organization_id");
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "organization_invitations_token_hash_idx"
        ON "organization_invitations" ("token_hash");
    `);
    // Expression index: lower("email"), not the quoted identifier "lower(email)".
    this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS "organization_invitations_org_email_pending_uidx"
        ON "organization_invitations" ("organization_id", lower("email"))
        WHERE "status" = 'pending';
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "organization_invitations_org_email_pending_uidx";`);
    this.addSql(`DROP INDEX IF EXISTS "organization_invitations_token_hash_idx";`);
    this.addSql(`DROP INDEX IF EXISTS "organization_invitations_organization_id_idx";`);
    this.addSql(`DROP TABLE IF EXISTS "organization_invitations" CASCADE;`);
  }
}
