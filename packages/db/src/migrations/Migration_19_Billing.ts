import { Migration } from '@mikro-orm/migrations';

export class Migration19Billing extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "plan_catalog" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "tier" varchar(32) NOT NULL,
        "name" varchar(120) NOT NULL,
        "price_cents" int NOT NULL DEFAULT 0,
        "currency" varchar(8) NOT NULL DEFAULT 'PEN',
        "credits_per_month" int NOT NULL,
        "max_users" int NOT NULL,
        "features" jsonb NULL,
        "active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "plan_catalog_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "plan_catalog_tier_unique" UNIQUE ("tier")
      );
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "plan_catalog_id" uuid NOT NULL,
        "status" varchar(32) NOT NULL DEFAULT 'active',
        "period_start" timestamptz NOT NULL,
        "period_end" timestamptz NOT NULL,
        "cancel_at_period_end" boolean NOT NULL DEFAULT false,
        "gateway" varchar(32) NOT NULL DEFAULT 'mock',
        "gateway_ref" varchar(255) NULL,
        CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "subscriptions_organization_id_unique" UNIQUE ("organization_id"),
        CONSTRAINT "subscriptions_organization_id_fkey"
          FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "subscriptions_plan_catalog_id_fkey"
          FOREIGN KEY ("plan_catalog_id") REFERENCES "plan_catalog" ("id") ON UPDATE CASCADE ON DELETE RESTRICT
      );
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "payment_methods" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "brand" varchar(32) NOT NULL,
        "last4" varchar(4) NOT NULL,
        "exp_month" int NOT NULL,
        "exp_year" int NOT NULL,
        "holder_name" varchar(255) NOT NULL,
        "is_default" boolean NOT NULL DEFAULT false,
        "gateway" varchar(32) NOT NULL DEFAULT 'mock',
        "gateway_ref" varchar(255) NOT NULL,
        CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "payment_methods_organization_id_fkey"
          FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE
      );
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "invoices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "number" varchar(64) NOT NULL,
        "status" varchar(32) NOT NULL DEFAULT 'paid',
        "issued_at" timestamptz NOT NULL,
        "period_start" timestamptz NULL,
        "period_end" timestamptz NULL,
        "amount_cents" int NOT NULL,
        "currency" varchar(8) NOT NULL DEFAULT 'PEN',
        "payment_method_id" uuid NULL,
        "items_json" jsonb NULL,
        CONSTRAINT "invoices_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "invoices_organization_id_fkey"
          FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "invoices_payment_method_id_fkey"
          FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods" ("id") ON UPDATE CASCADE ON DELETE SET NULL
      );
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "invoices_org_issued_idx"
        ON "invoices" ("organization_id", "issued_at" DESC);
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "credit_wallets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "balance" int NOT NULL DEFAULT 0,
        "period_credits" int NOT NULL DEFAULT 0,
        "period_consumed" int NOT NULL DEFAULT 0,
        "period_reset_at" timestamptz NULL,
        CONSTRAINT "credit_wallets_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "credit_wallets_organization_id_unique" UNIQUE ("organization_id"),
        CONSTRAINT "credit_wallets_organization_id_fkey"
          FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE
      );
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "credit_allocations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "monthly_limit" int NULL,
        "month_consumed" int NOT NULL DEFAULT 0,
        "period_reset_at" timestamptz NULL,
        CONSTRAINT "credit_allocations_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "credit_allocations_organization_id_user_id_unique" UNIQUE ("organization_id", "user_id"),
        CONSTRAINT "credit_allocations_organization_id_fkey"
          FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "credit_allocations_user_id_fkey"
          FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE CASCADE
      );
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "credit_transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "user_id" uuid NULL,
        "delta" int NOT NULL,
        "reason" varchar(32) NOT NULL,
        "ref" jsonb NULL,
        CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "credit_transactions_organization_id_fkey"
          FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "credit_transactions_user_id_fkey"
          FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE SET NULL
      );
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "credit_tx_org_created_idx"
        ON "credit_transactions" ("organization_id", "created_at" DESC);
    `);

    this.addSql(`
      INSERT INTO "permissions" ("id", "created_at", "updated_at", "code", "category", "description")
      SELECT uuid_generate_v4(), now(), now(), 'billing:read', 'billing', 'View plan, billing and AI credits'
      WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "code" = 'billing:read');
    `);
    this.addSql(`
      INSERT INTO "permissions" ("id", "created_at", "updated_at", "code", "category", "description")
      SELECT uuid_generate_v4(), now(), now(), 'billing:manage', 'billing', 'Change plan, payment methods and credit allocations'
      WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "code" = 'billing:manage');
    `);

    this.addSql(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT rp."role_id", p."id"
      FROM "role_permissions" rp
      INNER JOIN "permissions" p_old ON p_old."id" = rp."permission_id" AND p_old."code" = 'trackable:read'
      CROSS JOIN "permissions" p
      WHERE p."code" = 'billing:read'
      ON CONFLICT DO NOTHING;
    `);
    this.addSql(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT rp."role_id", p."id"
      FROM "role_permissions" rp
      INNER JOIN "permissions" p_old ON p_old."id" = rp."permission_id" AND p_old."code" = 'org:manage'
      CROSS JOIN "permissions" p
      WHERE p."code" = 'billing:manage'
      ON CONFLICT DO NOTHING;
    `);

    this.addSql(`
      INSERT INTO "plan_catalog" ("id", "created_at", "updated_at", "tier", "name", "price_cents", "currency", "credits_per_month", "max_users", "features", "active")
      SELECT uuid_generate_v4(), now(), now(), 'free', 'Alega Free', 0, 'PEN', 200, 2,
        '["Asistente IA limitado","2 usuarios"]'::jsonb, true
      WHERE NOT EXISTS (SELECT 1 FROM "plan_catalog" WHERE "tier" = 'free');
    `);
    this.addSql(`
      INSERT INTO "plan_catalog" ("id", "created_at", "updated_at", "tier", "name", "price_cents", "currency", "credits_per_month", "max_users", "features", "active")
      SELECT uuid_generate_v4(), now(), now(), 'basic', 'Alega Basic', 4900, 'PEN', 5000, 10,
        '["Asistente IA ampliado","Hasta 10 usuarios"]'::jsonb, true
      WHERE NOT EXISTS (SELECT 1 FROM "plan_catalog" WHERE "tier" = 'basic');
    `);
    this.addSql(`
      INSERT INTO "plan_catalog" ("id", "created_at", "updated_at", "tier", "name", "price_cents", "currency", "credits_per_month", "max_users", "features", "active")
      SELECT uuid_generate_v4(), now(), now(), 'pro', 'Alega Pro', 14900, 'PEN', 50000, 50,
        '["Asistente IA alto volumen","Hasta 50 usuarios"]'::jsonb, true
      WHERE NOT EXISTS (SELECT 1 FROM "plan_catalog" WHERE "tier" = 'pro');
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      DELETE FROM "role_permissions"
      WHERE "permission_id" IN (
        SELECT "id" FROM "permissions" WHERE "code" IN ('billing:read', 'billing:manage')
      );
    `);
    this.addSql(`DELETE FROM "permissions" WHERE "code" IN ('billing:read', 'billing:manage');`);

    this.addSql(`DROP TABLE IF EXISTS "credit_transactions" CASCADE;`);
    this.addSql(`DROP TABLE IF EXISTS "credit_allocations" CASCADE;`);
    this.addSql(`DROP TABLE IF EXISTS "credit_wallets" CASCADE;`);
    this.addSql(`DROP TABLE IF EXISTS "invoices" CASCADE;`);
    this.addSql(`DROP TABLE IF EXISTS "payment_methods" CASCADE;`);
    this.addSql(`DROP TABLE IF EXISTS "subscriptions" CASCADE;`);
    this.addSql(`DELETE FROM "plan_catalog";`);
    this.addSql(`DROP TABLE IF EXISTS "plan_catalog" CASCADE;`);
  }
}
