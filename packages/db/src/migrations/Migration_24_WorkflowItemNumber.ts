import { Migration } from '@mikro-orm/migrations';

/** Per-trackable sequential number for Jira-style ticket keys (PREFIX-N). */
export class Migration24WorkflowItemNumber extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "workflow_items" ADD COLUMN IF NOT EXISTS "item_number" int NULL;
    `);

    this.addSql(`
      UPDATE "workflow_items" AS wi
      SET "item_number" = sub.n
      FROM (
        SELECT id, ROW_NUMBER() OVER (
          PARTITION BY trackable_id ORDER BY created_at ASC, id ASC
        )::int AS n
        FROM "workflow_items"
      ) AS sub
      WHERE wi.id = sub.id;
    `);

    this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS "workflow_items_trackable_item_number_uk"
      ON "workflow_items" ("trackable_id", "item_number");
    `);

    this.addSql(`
      ALTER TABLE "workflow_items" ALTER COLUMN "item_number" SET NOT NULL;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "workflow_items_trackable_item_number_uk";`);
    this.addSql(`ALTER TABLE "workflow_items" DROP COLUMN IF EXISTS "item_number";`);
  }
}
