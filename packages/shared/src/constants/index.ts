export const MAX_WORKFLOW_DEPTH = 8;

/** Ítem raíz de expediente que lleva `workflow` + `currentState` del flujo procesal. */
export const LEGAL_PROCESS_ROOT_KIND = 'Proceso';
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const JWT_ACCESS_EXPIRY = '15m';
export const JWT_REFRESH_EXPIRY = '7d';

export const DEFAULT_DOCUMENT_TRASH_RETENTION_DAYS = 15;
export const MIN_DOCUMENT_TRASH_RETENTION_DAYS = 1;
export const MAX_DOCUMENT_TRASH_RETENTION_DAYS = 365;

/** Normalize org setting for automatic permanent deletion of trashed documents. */
export function normalizeDocumentTrashRetentionDays(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_DOCUMENT_TRASH_RETENTION_DAYS;
  return Math.min(
    MAX_DOCUMENT_TRASH_RETENTION_DAYS,
    Math.max(MIN_DOCUMENT_TRASH_RETENTION_DAYS, Math.round(n)),
  );
}

/** SYSTEM blueprint `code` seeded as single empty stage; used for “estilo libre” process tracks. */
export const SYSTEM_BLUEPRINT_CODE_FREEFORM = 'freeform-estilo-libre' as const;
