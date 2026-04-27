import { Migration } from '@mikro-orm/migrations';

/**
 * ActivityInstance parity with WorkflowItem-style querying:
 * - direct trackable_id (denormalized from ProcessTrack)
 * - optional parent_id for subtasks
 * - activity_instance_secondary_assignees (M:N with users)
 */
export class Migration40ActivityInstanceParity extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "activity_instances"
      ADD COLUMN "trackable_id" uuid NULL,
      ADD COLUMN "parent_id" uuid NULL;
    `);
    this.addSql(`
      ALTER TABLE "activity_instances"
      ADD CONSTRAINT "activity_instances_trackable_id_fkey"
        FOREIGN KEY ("trackable_id") REFERENCES "trackables" ("id")
        ON UPDATE CASCADE ON DELETE SET NULL;
    `);
    this.addSql(`
      ALTER TABLE "activity_instances"
      ADD CONSTRAINT "activity_instances_parent_id_fkey"
        FOREIGN KEY ("parent_id") REFERENCES "activity_instances" ("id")
        ON UPDATE CASCADE ON DELETE SET NULL;
    `);
    this.addSql(
      `CREATE INDEX "idx_activity_instances_trackable" ON "activity_instances" ("trackable_id");`,
    );
    this.addSql(
      `CREATE INDEX "idx_activity_instances_parent" ON "activity_instances" ("parent_id");`,
    );

    this.addSql(`
      UPDATE "activity_instances" AS ai
      SET "trackable_id" = pt.trackable_id
      FROM "stage_instances" AS si
      INNER JOIN "process_tracks" AS pt ON pt.id = si.process_track_id
      WHERE ai.stage_instance_id = si.id
        AND ai.trackable_id IS NULL;
    `);

    this.addSql(`
      CREATE TABLE "activity_instance_secondary_assignees" (
        "activity_instance_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        CONSTRAINT "activity_instance_secondary_assignees_pkey"
          PRIMARY KEY ("activity_instance_id", "user_id"),
        CONSTRAINT "activity_instance_secondary_assignees_activity_fkey"
          FOREIGN KEY ("activity_instance_id")
          REFERENCES "activity_instances" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "activity_instance_secondary_assignees_user_fkey"
          FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE CASCADE
      );
    `);
    this.addSql(
      `CREATE INDEX "idx_aisa_user" ON "activity_instance_secondary_assignees" ("user_id");`,
    );
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "activity_instance_secondary_assignees" CASCADE;`);
    this.addSql(
      `ALTER TABLE "activity_instances" DROP CONSTRAINT IF EXISTS "activity_instances_parent_id_fkey";`,
    );
    this.addSql(
      `ALTER TABLE "activity_instances" DROP CONSTRAINT IF EXISTS "activity_instances_trackable_id_fkey";`,
    );
    this.addSql(`DROP INDEX IF EXISTS "idx_activity_instances_parent";`);
    this.addSql(`DROP INDEX IF EXISTS "idx_activity_instances_trackable";`);
    this.addSql(
      `ALTER TABLE "activity_instances" DROP COLUMN IF EXISTS "parent_id", DROP COLUMN IF EXISTS "trackable_id";`,
    );
  }
}
