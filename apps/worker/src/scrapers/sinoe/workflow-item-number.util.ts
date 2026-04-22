import type { EntityManager } from '@mikro-orm/postgresql';

function firstRow<T extends Record<string, unknown>>(rows: T | T[] | undefined): T | undefined {
  if (rows == null) return undefined;
  return Array.isArray(rows) ? rows[0] : rows;
}

/** Locks the trackable row and allocates `count` consecutive item numbers. */
export async function allocateWorkflowItemNumbers(
  em: EntityManager,
  trackableId: string,
  count: number,
): Promise<number[]> {
  if (count < 1) return [];
  await em.getConnection().execute(`SELECT 1 FROM trackables WHERE id = ? FOR UPDATE`, [trackableId]);
  const rows = await em.getConnection().execute(
    `SELECT COALESCE(MAX(item_number), 0)::int AS m FROM workflow_items WHERE trackable_id = ?`,
    [trackableId],
  );
  const row = firstRow(rows as Record<string, unknown>[]);
  const m = Number(row?.m ?? row?.M ?? 0);
  return Array.from({ length: count }, (_, i) => m + i + 1);
}
