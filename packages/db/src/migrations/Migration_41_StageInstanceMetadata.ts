import { Migration } from '@mikro-orm/migrations';

/**
 * JSON metadata for stage instance UI: label override, color, responsible user id, etc.
 */
export class Migration_41_StageInstanceMetadata extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      'ALTER TABLE "stage_instances" ADD COLUMN "metadata" jsonb NULL;',
    );
  }

  override async down(): Promise<void> {
    this.addSql('ALTER TABLE "stage_instances" DROP COLUMN "metadata";');
  }
}
