import { Migration } from '@mikro-orm/migrations';

export class Migration_44_ActivityInstanceComments extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "activity_instance_comments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "activity_instance_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "body" text NOT NULL,
        CONSTRAINT "activity_instance_comments_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "activity_instance_comments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE,
        CONSTRAINT "activity_instance_comments_activity_instance_id_fkey" FOREIGN KEY ("activity_instance_id") REFERENCES "activity_instances" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "activity_instance_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE CASCADE
      );
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "activity_instance_comments_activity_instance_id_idx"
      ON "activity_instance_comments" ("activity_instance_id");
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "activity_instance_comments";`);
  }
}
