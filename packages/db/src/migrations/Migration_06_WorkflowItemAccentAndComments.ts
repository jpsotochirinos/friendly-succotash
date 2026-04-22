import { Migration } from '@mikro-orm/migrations';

export class Migration06WorkflowItemAccentAndComments extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "workflow_items" ADD COLUMN IF NOT EXISTS "accent_color" varchar(7) NULL;
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "workflow_item_comments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "workflow_item_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "body" text NOT NULL,
        CONSTRAINT "workflow_item_comments_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "workflow_item_comments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE,
        CONSTRAINT "workflow_item_comments_workflow_item_id_fkey" FOREIGN KEY ("workflow_item_id") REFERENCES "workflow_items" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "workflow_item_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE CASCADE
      );
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "workflow_item_comments_workflow_item_id_idx"
      ON "workflow_item_comments" ("workflow_item_id");
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "workflow_item_comments";`);
    this.addSql(`ALTER TABLE "workflow_items" DROP COLUMN IF EXISTS "accent_color";`);
  }
}
