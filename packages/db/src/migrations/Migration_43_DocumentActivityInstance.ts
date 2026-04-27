import { Migration } from '@mikro-orm/migrations';

/** Link documents to process-track activities (ActivityInstance) for per-activity file lists. */
export class Migration_43_DocumentActivityInstance extends Migration {
  override async up(): Promise<void> {
    this.addSql('ALTER TABLE "documents" ADD COLUMN "activity_instance_id" uuid NULL;');
    this.addSql(
      'ALTER TABLE "documents" ADD CONSTRAINT "documents_activity_instance_fk" FOREIGN KEY ("activity_instance_id") REFERENCES "activity_instances" ("id") ON UPDATE CASCADE ON DELETE SET NULL;',
    );
    this.addSql('CREATE INDEX "documents_activity_instance_id_index" ON "documents" ("activity_instance_id");');
  }

  override async down(): Promise<void> {
    this.addSql('ALTER TABLE "documents" DROP CONSTRAINT "documents_activity_instance_fk";');
    this.addSql('DROP INDEX "documents_activity_instance_id_index";');
    this.addSql('ALTER TABLE "documents" DROP COLUMN "activity_instance_id";');
  }
}
