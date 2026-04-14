import { Migration } from '@mikro-orm/migrations';

export class Migration03FolderEmojiSortOrder extends Migration {
  async up(): Promise<void> {
    this.addSql('ALTER TABLE folders ADD COLUMN IF NOT EXISTS emoji varchar(10) NULL;');
    this.addSql('ALTER TABLE folders ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;');
  }

  async down(): Promise<void> {
    this.addSql('ALTER TABLE folders DROP COLUMN IF EXISTS sort_order;');
    this.addSql('ALTER TABLE folders DROP COLUMN IF EXISTS emoji;');
  }
}
