/** Key in `StageInstance.metadata` for user-initiated "close work" on a stage (ISO 8601 string). */
export const STAGE_INSTANCE_METADATA_WORK_CLOSED_AT = 'workClosedAt';

export function isStageWorkClosed(metadata: Record<string, unknown> | null | undefined): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  const v = metadata[STAGE_INSTANCE_METADATA_WORK_CLOSED_AT];
  return typeof v === 'string' && v.length > 0;
}

/**
 * True when the stage should not allow add / move / delete / drag of activities
 * (completed or skipped in the workflow, or user-closed work lock).
 */
export function isStageEditsLocked(st: { status: string; metadata?: Record<string, unknown> | null }): boolean {
  if (isStageWorkClosed(st.metadata)) return true;
  const s = (st.status || '').toLowerCase();
  return s === 'completed' || s === 'skipped';
}
