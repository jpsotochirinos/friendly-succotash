import { Migration } from '@mikro-orm/migrations';

/**
 * JSON metadata for process track UI: icon, iconColor, custom label, etc.
 */
export class Migration_42_ProcessTrackMetadata extends Migration {
  override async up(): Promise<void> {
    this.addSql('ALTER TABLE "process_tracks" ADD COLUMN "metadata" jsonb NULL;');
  }

  override async down(): Promise<void> {
    this.addSql('ALTER TABLE "process_tracks" DROP COLUMN "metadata";');
  }
}
