import { Migration } from '@mikro-orm/migrations';

/** Global feed (Alega updates + legal news) and per-user read cursor. */
export class Migration33Feed extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "feed_sources" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "name" varchar(255) NOT NULL,
        "url" varchar(2048) NOT NULL,
        "kind" varchar(32) NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "last_fetched_at" timestamptz NULL,
        "last_error" text NULL,
        CONSTRAINT "feed_sources_pkey" PRIMARY KEY ("id")
      );
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "feed_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "kind" varchar(32) NOT NULL,
        "title" text NOT NULL,
        "summary" text NULL,
        "content" text NULL,
        "url" varchar(2048) NULL,
        "source_label" varchar(255) NULL,
        "image_url" varchar(2048) NULL,
        "published_at" timestamptz NOT NULL,
        "pinned" boolean NOT NULL DEFAULT false,
        "feed_source_id" uuid NULL,
        CONSTRAINT "feed_items_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "feed_items_feed_source_id_fkey"
          FOREIGN KEY ("feed_source_id") REFERENCES "feed_sources" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT "feed_items_url_unique" UNIQUE ("url")
      );
    `);

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "feed_items_kind_published_idx"
        ON "feed_items" ("kind", "published_at" DESC);
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "user_feed_reads" (
        "user_id" uuid NOT NULL,
        "last_seen_at" timestamptz NOT NULL,
        CONSTRAINT "user_feed_reads_pkey" PRIMARY KEY ("user_id"),
        CONSTRAINT "user_feed_reads_user_id_fkey"
          FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE CASCADE
      );
    `);

    this.addSql(`
      INSERT INTO "permissions" ("id", "created_at", "updated_at", "code", "category", "description")
      SELECT uuid_generate_v4(), now(), now(), 'feed:read', 'feed', 'View legal news and Alega updates feed'
      WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "code" = 'feed:read');
    `);

    this.addSql(`
      INSERT INTO "permissions" ("id", "created_at", "updated_at", "code", "category", "description")
      SELECT uuid_generate_v4(), now(), now(), 'feed:manage', 'feed', 'Manage feed items and RSS sources'
      WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "code" = 'feed:manage');
    `);

    /** Everyone who can read trackables sees the feed */
    this.addSql(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT DISTINCT rp."role_id", p_new."id"
      FROM "role_permissions" rp
      INNER JOIN "permissions" p_old ON p_old."id" = rp."permission_id" AND p_old."code" = 'trackable:read'
      CROSS JOIN "permissions" p_new
      WHERE p_new."code" = 'feed:read'
      ON CONFLICT DO NOTHING;
    `);

    /** Org admins / role managers can curate feed + sources */
    this.addSql(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT DISTINCT rp."role_id", p_new."id"
      FROM "role_permissions" rp
      INNER JOIN "permissions" p_old ON p_old."id" = rp."permission_id" AND p_old."code" IN ('org:manage', 'role:manage')
      CROSS JOIN "permissions" p_new
      WHERE p_new."code" = 'feed:manage'
      ON CONFLICT DO NOTHING;
    `);

    /** Default RSS sources (worker ingests on schedule) */
    const seeds: [string, string, string][] = [
      ['BOE — Boletín Oficial', 'https://www.boe.es/rss/boe.php', 'LEGISLATION'],
      ['CGPJ — Noticias', 'https://www.poderjudicial.es/stfls/INTERNET/resources/doc/xml/Noticias.xml', 'LEGAL_NEWS'],
      ['Confilegal', 'https://www.confilegal.com/comunicacion/noticias/rss/', 'LEGAL_NEWS'],
    ];
    for (const [name, url, kind] of seeds) {
      const safeName = String(name).replace(/'/g, "''");
      const safeUrl = String(url).replace(/'/g, "''");
      const safeKind = String(kind).replace(/'/g, "''");
      this.addSql(`
        INSERT INTO "feed_sources" ("id", "created_at", "updated_at", "name", "url", "kind", "active")
        SELECT uuid_generate_v4(), now(), now(), '${safeName}', '${safeUrl}', '${safeKind}', true
        WHERE NOT EXISTS (SELECT 1 FROM "feed_sources" WHERE "url" = '${safeUrl}');
      `);
    }
  }

  async down(): Promise<void> {
    this.addSql(`
      DELETE FROM "role_permissions"
      WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "code" IN ('feed:read', 'feed:manage'));
    `);
    this.addSql(`DELETE FROM "permissions" WHERE "code" IN ('feed:read', 'feed:manage');`);
    this.addSql(`DROP TABLE IF EXISTS "user_feed_reads" CASCADE;`);
    this.addSql(`DROP TABLE IF EXISTS "feed_items" CASCADE;`);
    this.addSql(`DROP TABLE IF EXISTS "feed_sources" CASCADE;`);
  }
}
