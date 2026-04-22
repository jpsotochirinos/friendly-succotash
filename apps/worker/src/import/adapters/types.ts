import type { ImportBatch } from '@tracker/db';

/** Extensión por cliente enterprise (plugins de dominio). */
export interface ImportDomainAdapter {
  readonly id: string;
  /** Ajusta clave de expediente antes del agrupador por defecto. */
  refineTrackableKey?(sourcePath: string, textPreview: string): string | undefined;
  /** Metadatos extra en Trackable.metadata al crear borrador. */
  trackableMetadataExtra?(batch: ImportBatch): Record<string, unknown>;
}
