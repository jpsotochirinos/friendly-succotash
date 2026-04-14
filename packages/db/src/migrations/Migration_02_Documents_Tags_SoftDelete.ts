import { Migration } from '@mikro-orm/migrations';

export class Migration02DocumentsTagsSoftDelete extends Migration {
  async up(): Promise<void> {
    this.addSql('ALTER TABLE documents ADD COLUMN IF NOT EXISTS tags jsonb NULL;');
    this.addSql('ALTER TABLE documents ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;');
  }

  async down(): Promise<void> {
    this.addSql('ALTER TABLE documents DROP COLUMN IF EXISTS deleted_at;');
    this.addSql('ALTER TABLE documents DROP COLUMN IF EXISTS tags;');
  }
}
