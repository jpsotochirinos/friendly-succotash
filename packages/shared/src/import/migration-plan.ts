/**
 * Plan de migración persistido en `ImportBatch.config.migrationPlan` tras `POST /api/migration/commit-plan`.
 */
export interface MigrationPlanFolderProfile {
  relPath: string;
  fileCount?: number;
  bytes?: number;
  extensions?: Record<string, number>;
  dateRange?: [string, string];
  topTerms?: string[];
  sampleFilenames?: string[];
  sampleSnippets?: Array<{ filename: string; text: string }>;
}

export interface MigrationPlanGroup {
  id: string;
  title: string;
  trackableKind: string;
  /** Rutas relativas (como irán en `ImportItem.sourcePath` vía TUS filename). */
  fileRelPaths?: string[];
  confidence?: number;
  rationale?: string;
  expedienteHint?: string;
}

export interface StoredMigrationPlan {
  version: number;
  committedAt: string;
  groups: Array<MigrationPlanGroup & { trackableId: string }>;
  /** `sourcePath` → trackable UUID */
  pathToTrackable: Record<string, string>;
}
