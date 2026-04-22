export type ArchiveToolCall = {
  id: string;
  type?: string;
  function: { name: string; arguments: string };
};

/** UUIDs archivados en esta invocación de tool (solo éxito). */
export function attachmentIdsFromArchiveToolCall(tc: ArchiveToolCall): string[] {
  const name = tc.function?.name;
  if (name !== 'archive_attachment' && name !== 'archive_attachments_batch') return [];
  let raw: unknown;
  try {
    raw = JSON.parse(tc.function.arguments || '{}');
  } catch {
    return [];
  }
  if (!raw || typeof raw !== 'object') return [];
  const o = raw as Record<string, unknown>;
  if (name === 'archive_attachment') {
    const id = o.attachmentId;
    return typeof id === 'string' && id.length > 0 ? [id] : [];
  }
  const entries = o.entries;
  if (!Array.isArray(entries)) return [];
  const out: string[] = [];
  for (const e of entries) {
    if (e && typeof e === 'object' && typeof (e as { attachmentId?: string }).attachmentId === 'string') {
      out.push((e as { attachmentId: string }).attachmentId);
    }
  }
  return out;
}

/** Quita UUIDs de `attachmentIds` en filas de mensaje (BD o API). */
export function pruneAttachmentIdsOnObjects<T extends { attachmentIds?: string[] }>(
  rows: T[],
  ids: string[],
): void {
  if (!ids.length) return;
  const toPrune = new Set(ids);
  for (const r of rows) {
    if (!r.attachmentIds?.length) continue;
    const left = r.attachmentIds.filter((x) => !toPrune.has(x));
    if (left.length !== r.attachmentIds.length) {
      r.attachmentIds = left.length ? left : undefined;
    }
  }
}

/** Quita UUIDs archivados de `attachmentIds` solo en mensajes `user` del array en memoria (mismo turno). */
export function pruneWorkingAttachmentIds<
  T extends { role: string; attachmentIds?: string[] },
>(messages: T[], ids: string[]): void {
  if (!ids.length) return;
  const drop = new Set(ids);
  for (const m of messages) {
    if (m.role !== 'user' || !m.attachmentIds?.length) continue;
    const left = m.attachmentIds.filter((x) => !drop.has(x));
    if (left.length !== m.attachmentIds.length) {
      if (left.length) m.attachmentIds = left;
      else delete m.attachmentIds;
    }
  }
}
