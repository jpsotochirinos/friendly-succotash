/**
 * Same semantics as `packages/shared/src/process-track/stage-work.ts`.
 * Imported here instead of `@tracker/shared` to avoid CJS barrel resolution where
 * `isStageWorkClosed` may be missing on `require('@tracker/shared')` in some runtimes.
 */
export const STAGE_INSTANCE_METADATA_WORK_CLOSED_AT = 'workClosedAt' as const;

export function isStageWorkClosed(
  metadata: Record<string, unknown> | null | undefined,
): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  const v = metadata[STAGE_INSTANCE_METADATA_WORK_CLOSED_AT];
  return typeof v === 'string' && v.length > 0;
}

/** Completed/skipped/locked — same idea as `isStageEditsLocked` in shared (API avoids barrel for workClosed). */
export function isStageInstanceTerminalForEdits(st: {
  status: string;
  metadata?: Record<string, unknown> | null;
}): boolean {
  if (isStageWorkClosed(st.metadata)) return true;
  const s = (st.status || '').toLowerCase();
  return s === 'completed' || s === 'skipped';
}
