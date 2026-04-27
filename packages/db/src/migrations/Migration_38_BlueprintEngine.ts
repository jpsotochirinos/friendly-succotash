import { Migration } from '@mikro-orm/migrations';

/**
 * Blueprint engine v2: ProcessTrack, Stage/ActivityInstance, ComputedDeadline, SinoeProposal, snapshots, CourtClosure.
 */
export class Migration38BlueprintEngine extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE "blueprints" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL,
        "updated_at" timestamptz NOT NULL,
        "scope" varchar(255) NOT NULL,
        "organization_id" uuid NULL,
        "code" varchar(120) NOT NULL,
        "name" varchar(500) NOT NULL,
        "description" text NULL,
        "matter_type" varchar(255) NULL,
        "sub_matter_type" varchar(120) NULL,
        "parent_blueprint_id" uuid NULL,
        "applicable_law" varchar(50) NULL,
        "legal_references" jsonb NULL,
        "prefix" varchar(32) NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "blueprints_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "blueprints_organization_id_fkey" FOREIGN KEY ("organization_id")
          REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT "blueprints_parent_blueprint_id_fkey" FOREIGN KEY ("parent_blueprint_id")
          REFERENCES "blueprints" ("id") ON UPDATE CASCADE ON DELETE SET NULL
      );
    `);

    this.addSql(
      `CREATE INDEX "idx_blueprints_scope_code" ON "blueprints" ("scope", "code");`,
    );
    this.addSql(
      `CREATE UNIQUE INDEX "idx_blueprints_system_code_unique" ON "blueprints" ("code") WHERE "scope" = 'system' AND "organization_id" IS NULL;`,
    );
    this.addSql(
      `CREATE UNIQUE INDEX "idx_blueprints_tenant_code_unique" ON "blueprints" ("organization_id", "code") WHERE "organization_id" IS NOT NULL;`,
    );

    this.addSql(`
      CREATE TABLE "blueprint_versions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL,
        "updated_at" timestamptz NOT NULL,
        "blueprint_id" uuid NOT NULL,
        "version_number" int NOT NULL,
        "published_at" timestamptz NULL,
        "published_by_id" uuid NULL,
        "changelog" text NOT NULL DEFAULT '',
        "migration_notes" text NULL,
        "is_draft" boolean NOT NULL DEFAULT false,
        CONSTRAINT "blueprint_versions_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "blueprint_versions_blueprint_id_fkey" FOREIGN KEY ("blueprint_id")
          REFERENCES "blueprints" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "blueprint_versions_published_by_id_fkey" FOREIGN KEY ("published_by_id")
          REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE SET NULL
      );
    `);
    this.addSql(
      `CREATE INDEX "idx_blueprint_versions_blueprint" ON "blueprint_versions" ("blueprint_id");`,
    );
    this.addSql(
      `CREATE UNIQUE INDEX "idx_blueprint_versions_blueprint_version" ON "blueprint_versions" ("blueprint_id", "version_number");`,
    );

    this.addSql(`
      ALTER TABLE "blueprints"
      ADD COLUMN "current_version_id" uuid NULL;
    `);
    this.addSql(`
      ALTER TABLE "blueprints"
      ADD CONSTRAINT "blueprints_current_version_id_fkey" FOREIGN KEY ("current_version_id")
        REFERENCES "blueprint_versions" ("id") ON UPDATE CASCADE ON DELETE SET NULL;
    `);

    this.addSql(`
      CREATE TABLE "stage_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL,
        "updated_at" timestamptz NOT NULL,
        "blueprint_version_id" uuid NOT NULL,
        "code" varchar(80) NOT NULL,
        "name" varchar(500) NOT NULL,
        "description" text NULL,
        "order" int NOT NULL,
        "entry_conditions" jsonb NULL,
        "exit_conditions" jsonb NULL,
        "estimated_duration_days" int NULL,
        "sinoe_keywords" text[] NULL,
        "is_optional" boolean NOT NULL DEFAULT false,
        "is_parallelizable" boolean NOT NULL DEFAULT false,
        CONSTRAINT "stage_templates_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "stage_templates_blueprint_version_id_fkey" FOREIGN KEY ("blueprint_version_id")
          REFERENCES "blueprint_versions" ("id") ON UPDATE CASCADE ON DELETE CASCADE
      );
    `);
    this.addSql(
      `CREATE INDEX "idx_stage_templates_version_code" ON "stage_templates" ("blueprint_version_id", "code");`,
    );

    this.addSql(`
      CREATE TABLE "activity_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL,
        "updated_at" timestamptz NOT NULL,
        "stage_template_id" uuid NOT NULL,
        "code" varchar(80) NOT NULL,
        "name" varchar(500) NOT NULL,
        "description" text NULL,
        "order" int NOT NULL,
        "estimated_duration_minutes" int NULL,
        "is_mandatory" boolean NOT NULL DEFAULT false,
        "requires_document" boolean NOT NULL DEFAULT false,
        "suggested_document_type" varchar(255) NULL,
        "triggers_deadline_code" varchar(120) NULL,
        "document_template_id" uuid NULL,
        CONSTRAINT "activity_templates_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "activity_templates_stage_template_id_fkey" FOREIGN KEY ("stage_template_id")
          REFERENCES "stage_templates" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "activity_templates_document_template_id_fkey" FOREIGN KEY ("document_template_id")
          REFERENCES "documents" ("id") ON UPDATE CASCADE ON DELETE SET NULL
      );
    `);
    this.addSql(
      `CREATE INDEX "idx_activity_templates_stage_code" ON "activity_templates" ("stage_template_id", "code");`,
    );

    this.addSql(`
      CREATE TABLE "deadline_rules" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL,
        "updated_at" timestamptz NOT NULL,
        "blueprint_version_id" uuid NOT NULL,
        "code" varchar(120) NOT NULL,
        "name" varchar(500) NOT NULL,
        "trigger" varchar(255) NOT NULL,
        "trigger_target_code" varchar(120) NULL,
        "duration_days" int NOT NULL,
        "duration_unit" varchar(255) NOT NULL DEFAULT 'judicial_business_days',
        "legal_reference" varchar(200) NULL,
        "on_expiry" varchar(255) NOT NULL DEFAULT 'alert_only',
        "criticality" varchar(255) NOT NULL DEFAULT 'advisory',
        CONSTRAINT "deadline_rules_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "deadline_rules_blueprint_version_id_fkey" FOREIGN KEY ("blueprint_version_id")
          REFERENCES "blueprint_versions" ("id") ON UPDATE CASCADE ON DELETE CASCADE
      );
    `);
    this.addSql(
      `CREATE INDEX "idx_deadline_rules_version_code" ON "deadline_rules" ("blueprint_version_id", "code");`,
    );

    this.addSql(`
      CREATE TABLE "document_suggestions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL,
        "updated_at" timestamptz NOT NULL,
        "stage_template_id" uuid NOT NULL,
        "code" varchar(80) NOT NULL DEFAULT 'suggestion',
        "document_type" varchar(255) NOT NULL DEFAULT 'otro',
        "name" varchar(500) NOT NULL,
        "description" text NULL,
        "is_required" boolean NOT NULL DEFAULT false,
        "order" int NOT NULL,
        CONSTRAINT "document_suggestions_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "document_suggestions_stage_template_id_fkey" FOREIGN KEY ("stage_template_id")
          REFERENCES "stage_templates" ("id") ON UPDATE CASCADE ON DELETE CASCADE
      );
    `);

    this.addSql(`
      CREATE TABLE "sinoe_keyword_rules" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL,
        "updated_at" timestamptz NOT NULL,
        "blueprint_version_id" uuid NOT NULL,
        "code" varchar(120) NOT NULL DEFAULT 'rule',
        "pattern" text NOT NULL,
        "match_mode" varchar(255) NOT NULL DEFAULT 'contains',
        "action" varchar(255) NOT NULL,
        "action_target_code" varchar(120) NULL,
        "confidence_score" double precision NOT NULL DEFAULT 0.8,
        "requires_approval" boolean NOT NULL DEFAULT false,
        "criticality" varchar(255) NULL,
        CONSTRAINT "sinoe_keyword_rules_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "sinoe_keyword_rules_blueprint_version_id_fkey" FOREIGN KEY ("blueprint_version_id")
          REFERENCES "blueprint_versions" ("id") ON UPDATE CASCADE ON DELETE CASCADE
      );
    `);
    this.addSql(
      `CREATE INDEX "idx_sinoe_keyword_rules_version" ON "sinoe_keyword_rules" ("blueprint_version_id");`,
    );

    this.addSql(`
      CREATE TABLE "blueprint_overrides" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL,
        "updated_at" timestamptz NOT NULL,
        "organization_id" uuid NOT NULL,
        "blueprint_id" uuid NOT NULL,
        "target_type" varchar(255) NOT NULL,
        "target_code" varchar(120) NULL,
        "operation" varchar(255) NOT NULL,
        "patch" jsonb NOT NULL,
        "original_value_snapshot" jsonb NULL,
        "edited_by_id" uuid NULL,
        "edited_at" timestamptz NULL,
        "reason" text NULL,
        "is_locked" boolean NOT NULL DEFAULT false,
        CONSTRAINT "blueprint_overrides_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "blueprint_overrides_organization_id_fkey" FOREIGN KEY ("organization_id")
          REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "blueprint_overrides_blueprint_id_fkey" FOREIGN KEY ("blueprint_id")
          REFERENCES "blueprints" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "blueprint_overrides_edited_by_id_fkey" FOREIGN KEY ("edited_by_id")
          REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE SET NULL
      );
    `);
    this.addSql(
      `CREATE INDEX "idx_blueprint_overrides_target" ON "blueprint_overrides" ("blueprint_id", "target_type", "target_code");`,
    );

    this.addSql(`
      CREATE TABLE "process_tracks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL,
        "updated_at" timestamptz NOT NULL,
        "organization_id" uuid NOT NULL,
        "trackable_id" uuid NOT NULL,
        "blueprint_id" uuid NOT NULL,
        "role" varchar(255) NOT NULL DEFAULT 'primary',
        "parent_process_track_id" uuid NULL,
        "prefix" varchar(16) NULL,
        "expedient_number" varchar(120) NULL,
        "court" varchar(500) NULL,
        "judge" varchar(500) NULL,
        "started_at" timestamptz NOT NULL,
        "closed_at" timestamptz NULL,
        "outcome" varchar(255) NULL,
        CONSTRAINT "process_tracks_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "process_tracks_organization_id_fkey" FOREIGN KEY ("organization_id")
          REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "process_tracks_trackable_id_fkey" FOREIGN KEY ("trackable_id")
          REFERENCES "trackables" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "process_tracks_blueprint_id_fkey" FOREIGN KEY ("blueprint_id")
          REFERENCES "blueprints" ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT "process_tracks_parent_process_track_id_fkey" FOREIGN KEY ("parent_process_track_id")
          REFERENCES "process_tracks" ("id") ON UPDATE CASCADE ON DELETE SET NULL
      );
    `);
    this.addSql(
      `CREATE INDEX "idx_process_tracks_trackable_role" ON "process_tracks" ("trackable_id", "role");`,
    );

    this.addSql(`
      CREATE TABLE "stage_instances" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL,
        "updated_at" timestamptz NOT NULL,
        "organization_id" uuid NOT NULL,
        "process_track_id" uuid NOT NULL,
        "stage_template_code" varchar(80) NOT NULL,
        "order" int NOT NULL,
        "status" varchar(255) NOT NULL DEFAULT 'pending',
        "entered_at" timestamptz NULL,
        "exited_at" timestamptz NULL,
        "is_reverted" boolean NOT NULL DEFAULT false,
        CONSTRAINT "stage_instances_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "stage_instances_organization_id_fkey" FOREIGN KEY ("organization_id")
          REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "stage_instances_process_track_id_fkey" FOREIGN KEY ("process_track_id")
          REFERENCES "process_tracks" ("id") ON UPDATE CASCADE ON DELETE CASCADE
      );
    `);
    this.addSql(
      `CREATE INDEX "idx_stage_instances_process_order" ON "stage_instances" ("process_track_id", "order");`,
    );

    this.addSql(`
      ALTER TABLE "process_tracks"
      ADD COLUMN "current_stage_instance_id" uuid NULL;
    `);
    this.addSql(`
      ALTER TABLE "process_tracks"
      ADD CONSTRAINT "process_tracks_current_stage_instance_id_fkey" FOREIGN KEY ("current_stage_instance_id")
        REFERENCES "stage_instances" ("id") ON UPDATE CASCADE ON DELETE SET NULL;
    `);

    this.addSql(`
      CREATE TABLE "sinoe_proposals" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL,
        "updated_at" timestamptz NOT NULL,
        "organization_id" uuid NOT NULL,
        "sinoe_notification_id" uuid NOT NULL,
        "process_track_id" uuid NULL,
        "proposed_action" varchar(255) NULL,
        "proposed_payload" jsonb NULL,
        "confidence_score" double precision NULL,
        "status" varchar(255) NOT NULL DEFAULT 'pending',
        "auto_applied_reason" text NULL,
        "approved_by_id" uuid NULL,
        "approved_at" timestamptz NULL,
        "rejection_reason" text NULL,
        "reverted_at" timestamptz NULL,
        "reverted_by_id" uuid NULL,
        CONSTRAINT "sinoe_proposals_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "sinoe_proposals_organization_id_fkey" FOREIGN KEY ("organization_id")
          REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "sinoe_proposals_sinoe_notification_id_fkey" FOREIGN KEY ("sinoe_notification_id")
          REFERENCES "sinoe_notifications" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "sinoe_proposals_process_track_id_fkey" FOREIGN KEY ("process_track_id")
          REFERENCES "process_tracks" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT "sinoe_proposals_approved_by_id_fkey" FOREIGN KEY ("approved_by_id")
          REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT "sinoe_proposals_reverted_by_id_fkey" FOREIGN KEY ("reverted_by_id")
          REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE SET NULL
      );
    `);
    this.addSql(
      `CREATE INDEX "idx_sinoe_proposals_org_status_created" ON "sinoe_proposals" ("organization_id", "status", "created_at" DESC);`,
    );

    this.addSql(`
      CREATE TABLE "activity_instances" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL,
        "updated_at" timestamptz NOT NULL,
        "organization_id" uuid NOT NULL,
        "stage_instance_id" uuid NOT NULL,
        "activity_template_code" varchar(80) NULL,
        "title" varchar(500) NOT NULL,
        "description" text NULL,
        "kind" varchar(120) NULL,
        "action_type" varchar(255) NULL,
        "assigned_to_id" uuid NULL,
        "reviewed_by_id" uuid NULL,
        "item_number" int NOT NULL,
        "start_date" timestamptz NULL,
        "due_date" timestamptz NULL,
        "location" varchar(255) NULL,
        "priority" varchar(255) NOT NULL DEFAULT 'normal',
        "all_day" boolean NOT NULL DEFAULT true,
        "reminder_minutes_before" int[] NULL,
        "calendar_color" varchar(32) NULL,
        "rrule" text NULL,
        "completed_at" timestamptz NULL,
        "requires_document" boolean NOT NULL DEFAULT false,
        "is_legal_deadline" boolean NOT NULL DEFAULT false,
        "accent_color" varchar(7) NULL,
        "is_custom" boolean NOT NULL DEFAULT false,
        "is_mandatory" boolean NOT NULL DEFAULT true,
        "is_reverted" boolean NOT NULL DEFAULT false,
        "workflow_state_category" varchar(255) NOT NULL DEFAULT 'todo',
        "workflow_id" uuid NULL,
        "current_state_id" uuid NULL,
        "document_template_id" uuid NULL,
        "metadata" jsonb NULL,
        "created_by_sinoe_proposal_id" uuid NULL,
        CONSTRAINT "activity_instances_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "activity_instances_organization_id_fkey" FOREIGN KEY ("organization_id")
          REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "activity_instances_stage_instance_id_fkey" FOREIGN KEY ("stage_instance_id")
          REFERENCES "stage_instances" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "activity_instances_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id")
          REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT "activity_instances_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id")
          REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT "activity_instances_workflow_id_fkey" FOREIGN KEY ("workflow_id")
          REFERENCES "workflows" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT "activity_instances_current_state_id_fkey" FOREIGN KEY ("current_state_id")
          REFERENCES "workflow_states" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT "activity_instances_document_template_id_fkey" FOREIGN KEY ("document_template_id")
          REFERENCES "documents" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT "activity_instances_created_by_sinoe_proposal_id_fkey" FOREIGN KEY ("created_by_sinoe_proposal_id")
          REFERENCES "sinoe_proposals" ("id") ON UPDATE CASCADE ON DELETE SET NULL
      );
    `);
    this.addSql(
      `CREATE INDEX "idx_activity_instances_stage" ON "activity_instances" ("stage_instance_id");`,
    );

    this.addSql(`
      CREATE TABLE "computed_deadlines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL,
        "updated_at" timestamptz NOT NULL,
        "organization_id" uuid NOT NULL,
        "process_track_id" uuid NOT NULL,
        "deadline_rule_code" varchar(120) NOT NULL,
        "legal_date" timestamptz NOT NULL,
        "effective_date" timestamptz NOT NULL,
        "triggered_at" timestamptz NULL,
        "triggered_by_event" text NULL,
        "status" varchar(255) NOT NULL DEFAULT 'pending',
        "evidence_document_id" uuid NULL,
        "override_reason" text NULL,
        "override_by_id" uuid NULL,
        "override_at" timestamptz NULL,
        "is_reverted" boolean NOT NULL DEFAULT false,
        CONSTRAINT "computed_deadlines_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "computed_deadlines_organization_id_fkey" FOREIGN KEY ("organization_id")
          REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "computed_deadlines_process_track_id_fkey" FOREIGN KEY ("process_track_id")
          REFERENCES "process_tracks" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "computed_deadlines_evidence_document_id_fkey" FOREIGN KEY ("evidence_document_id")
          REFERENCES "documents" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT "computed_deadlines_override_by_id_fkey" FOREIGN KEY ("override_by_id")
          REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE SET NULL
      );
    `);
    this.addSql(
      `CREATE INDEX "idx_computed_deadlines_process_status_effective" ON "computed_deadlines" ("process_track_id", "status", "effective_date");`,
    );

    this.addSql(`
      CREATE TABLE "process_track_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL,
        "updated_at" timestamptz NOT NULL,
        "organization_id" uuid NOT NULL,
        "process_track_id" uuid NOT NULL,
        "event_type" varchar(255) NOT NULL,
        "payload" jsonb NULL,
        "actor_id" uuid NULL,
        "sinoe_proposal_id" uuid NULL,
        "event_at" timestamptz NOT NULL,
        CONSTRAINT "process_track_events_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "process_track_events_organization_id_fkey" FOREIGN KEY ("organization_id")
          REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "process_track_events_process_track_id_fkey" FOREIGN KEY ("process_track_id")
          REFERENCES "process_tracks" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "process_track_events_actor_id_fkey" FOREIGN KEY ("actor_id")
          REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT "process_track_events_sinoe_proposal_id_fkey" FOREIGN KEY ("sinoe_proposal_id")
          REFERENCES "sinoe_proposals" ("id") ON UPDATE CASCADE ON DELETE SET NULL
      );
    `);
    this.addSql(
      `CREATE INDEX "idx_process_track_events_process_event_at" ON "process_track_events" ("process_track_id", "event_at" DESC);`,
    );

    this.addSql(`
      CREATE TABLE "court_closures" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL,
        "updated_at" timestamptz NOT NULL,
        "organization_id" uuid NOT NULL,
        "court_name" varchar(500) NOT NULL,
        "date_from" date NOT NULL,
        "date_to" date NOT NULL,
        "reason" text NULL,
        "is_global" boolean NOT NULL DEFAULT false,
        CONSTRAINT "court_closures_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "court_closures_organization_id_fkey" FOREIGN KEY ("organization_id")
          REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE
      );
    `);
    this.addSql(
      `CREATE INDEX "idx_court_closures_org_court_dates" ON "court_closures" ("organization_id", "court_name", "date_from", "date_to");`,
    );

    this.addSql(`
      CREATE TABLE "blueprint_resolved_snapshots" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL,
        "updated_at" timestamptz NOT NULL,
        "organization_id" uuid NOT NULL,
        "process_track_id" uuid NOT NULL,
        "resolved_tree_json" jsonb NOT NULL,
        "source_version_ids" text[] NULL,
        "resolved_at" timestamptz NOT NULL,
        CONSTRAINT "blueprint_resolved_snapshots_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "blueprint_resolved_snapshots_organization_id_fkey" FOREIGN KEY ("organization_id")
          REFERENCES "organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "blueprint_resolved_snapshots_process_track_id_fkey" FOREIGN KEY ("process_track_id")
          REFERENCES "process_tracks" ("id") ON UPDATE CASCADE ON DELETE CASCADE
      );
    `);
    this.addSql(
      `CREATE UNIQUE INDEX "idx_blueprint_resolved_snapshots_process_unique" ON "blueprint_resolved_snapshots" ("process_track_id");`,
    );

    this.addSql(`
      ALTER TABLE "documents"
      ADD COLUMN "classified_stage_instance_id" uuid NULL;
    `);
    this.addSql(`
      ALTER TABLE "documents"
      ADD CONSTRAINT "documents_classified_stage_instance_id_fkey" FOREIGN KEY ("classified_stage_instance_id")
        REFERENCES "stage_instances" ("id") ON UPDATE CASCADE ON DELETE SET NULL;
    `);

    this.addSql(`
      COMMENT ON COLUMN "organizations"."feature_flags" IS
        'JSON: useConfigurableWorkflows, useBlueprintEngine, sinoePolicy, etc.';
    `);

    for (const [code, category, desc] of [
      ['blueprint:read', 'blueprint', 'View blueprints and resolved structure'],
      ['blueprint:manage', 'blueprint', 'Adopt, edit, publish tenant blueprints and overrides'],
      [
        'sinoe-proposal:approve',
        'integration',
        'Approve or reject SINOE proposal actions',
      ],
    ] as const) {
      this.addSql(`
        INSERT INTO "permissions" ("id", "created_at", "updated_at", "code", "category", "description")
        SELECT uuid_generate_v4(), now(), now(), '${code}', '${category}', '${desc.replace(/'/g, "''")}'
        WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "code" = '${code}');
      `);
    }

    this.addSql(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT DISTINCT rp."role_id", p_new."id"
      FROM "role_permissions" rp
      INNER JOIN "permissions" p_old ON p_old."id" = rp."permission_id" AND p_old."code" = 'trackable:read'
      CROSS JOIN "permissions" p_new
      WHERE p_new."code" = 'blueprint:read'
      ON CONFLICT DO NOTHING;
    `);
    for (const perm of ['blueprint:manage', 'sinoe-proposal:approve'] as const) {
      this.addSql(`
        INSERT INTO "role_permissions" ("role_id", "permission_id")
        SELECT DISTINCT rp."role_id", p_new."id"
        FROM "role_permissions" rp
        INNER JOIN "permissions" p_old ON p_old."id" = rp."permission_id" AND p_old."code" = 'org:manage'
        CROSS JOIN "permissions" p_new
        WHERE p_new."code" = '${perm}'
        ON CONFLICT DO NOTHING;
      `);
    }
  }

  async down(): Promise<void> {
    this.addSql(
      `ALTER TABLE "documents" DROP CONSTRAINT IF EXISTS "documents_classified_stage_instance_id_fkey";`,
    );
    this.addSql(`ALTER TABLE "documents" DROP COLUMN IF EXISTS "classified_stage_instance_id";`);
    for (const code of [
      'blueprint:read',
      'blueprint:manage',
      'sinoe-proposal:approve',
    ] as const) {
      this.addSql(
        `DELETE FROM "role_permissions" WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "code" = '${code}');`,
      );
    }
    for (const code of [
      'blueprint:read',
      'blueprint:manage',
      'sinoe-proposal:approve',
    ] as const) {
      this.addSql(`DELETE FROM "permissions" WHERE "code" = '${code}';`);
    }
    this.addSql(
      `ALTER TABLE "process_tracks" DROP CONSTRAINT IF EXISTS "process_tracks_current_stage_instance_id_fkey";`,
    );
    this.addSql(`ALTER TABLE "process_tracks" DROP COLUMN IF EXISTS "current_stage_instance_id";`);
    this.addSql(
      `ALTER TABLE "blueprints" DROP CONSTRAINT IF EXISTS "blueprints_current_version_id_fkey";`,
    );
    this.addSql(`ALTER TABLE "blueprints" DROP COLUMN IF EXISTS "current_version_id";`);

    for (const t of [
      'blueprint_resolved_snapshots',
      'court_closures',
      'process_track_events',
      'computed_deadlines',
      'activity_instances',
      'sinoe_proposals',
      'stage_instances',
      'process_tracks',
      'blueprint_overrides',
      'sinoe_keyword_rules',
      'document_suggestions',
      'deadline_rules',
      'activity_templates',
      'stage_templates',
      'blueprint_versions',
      'blueprints',
    ] as const) {
      this.addSql(`DROP TABLE IF EXISTS "${t}" CASCADE;`);
    }
  }
}
