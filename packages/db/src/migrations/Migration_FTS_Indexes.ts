import { Migration } from '@mikro-orm/migrations';

export class MigrationFTSIndexes extends Migration {
  async up(): Promise<void> {
    this.addSql('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
    this.addSql('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    this.addSql(`
      ALTER TABLE documents
      ADD COLUMN IF NOT EXISTS search_vector tsvector;
    `);

    this.addSql(`
      CREATE INDEX IF NOT EXISTS idx_documents_fts
      ON documents USING GIN (search_vector);
    `);

    this.addSql(`
      CREATE INDEX IF NOT EXISTS idx_chunks_trgm
      ON document_chunks USING GIN (content gin_trgm_ops);
    `);

    this.addSql(`
      CREATE OR REPLACE FUNCTION documents_search_vector_update()
      RETURNS trigger AS $$
      BEGIN
        NEW.search_vector := to_tsvector('spanish',
          coalesce(NEW.title, '') || ' ' || coalesce(NEW.content_text, ''));
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    this.addSql(`
      DROP TRIGGER IF EXISTS trg_documents_search_vector ON documents;
      CREATE TRIGGER trg_documents_search_vector
        BEFORE INSERT OR UPDATE OF title, content_text ON documents
        FOR EACH ROW EXECUTE FUNCTION documents_search_vector_update();
    `);

    this.addSql(`
      CREATE INDEX IF NOT EXISTS idx_workflow_items_tree
      ON workflow_items (trackable_id, parent_id, sort_order);
    `);

    this.addSql(`
      CREATE INDEX IF NOT EXISTS idx_workflow_items_depth
      ON workflow_items (trackable_id, depth);
    `);
  }

  async down(): Promise<void> {
    this.addSql('DROP TRIGGER IF EXISTS trg_documents_search_vector ON documents;');
    this.addSql('DROP FUNCTION IF EXISTS documents_search_vector_update();');
    this.addSql('DROP INDEX IF EXISTS idx_documents_fts;');
    this.addSql('DROP INDEX IF EXISTS idx_chunks_trgm;');
    this.addSql('DROP INDEX IF EXISTS idx_workflow_items_tree;');
    this.addSql('DROP INDEX IF EXISTS idx_workflow_items_depth;');
    this.addSql('ALTER TABLE documents DROP COLUMN IF EXISTS search_vector;');
  }
}
