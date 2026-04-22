import { Migration } from '@mikro-orm/migrations';

/** Vinculación con expediente Alega para UI / reglas posteriores. */
export class Migration29SinoeNotificationAssignmentStatus extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "sinoe_notifications"
      ADD COLUMN IF NOT EXISTS "assignment_status" varchar(32) NOT NULL DEFAULT 'needs_expediente';
    `);
    this.addSql(`
      COMMENT ON COLUMN "sinoe_notifications"."assignment_status" IS
        'linked | needs_expediente | needs_assignee (see @tracker/shared SINOE_ASSIGNMENT_STATUS)';
    `);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE "sinoe_notifications" DROP COLUMN IF EXISTS "assignment_status";`);
  }
}
