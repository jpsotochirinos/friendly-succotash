import { TrackableListingUrgency, TrackableStatus } from '@tracker/shared';

export type ListingScope = 'active' | 'archived';

export type ListingSortBy =
  | 'urgency'
  | 'caratula'
  | 'codigo'
  | 'lastActivity'
  | 'createdAt'
  | 'nextDeadline';

export interface ListingFilters {
  scope?: ListingScope;
  status?: TrackableStatus;
  types?: string[];
  matterTypes?: string[];
  assignedToIds?: string[];
  clientIds?: string[];
  search?: string;
  urgency?: TrackableListingUrgency;
}

export interface ListingCursorPayload {
  sortBy: ListingSortBy;
  /** urgency / nextDeadline */
  r?: number;
  nd?: string | null;
  ca?: string;
  id: string;
  /** createdAt */
  cr?: string;
  /** caratula */
  tl?: string;
  /** codigo */
  ex?: string | null;
  /** lastActivity */
  la?: string | null;
}

export function encodeListingCursor(p: ListingCursorPayload): string {
  return Buffer.from(JSON.stringify(p), 'utf8').toString('base64url');
}

export function decodeListingCursor(raw: string | undefined): ListingCursorPayload | null {
  if (!raw?.trim()) return null;
  try {
    const json = Buffer.from(raw, 'base64url').toString('utf8');
    const p = JSON.parse(json) as ListingCursorPayload;
    if (!p?.id || !p?.sortBy) return null;
    return p;
  } catch {
    return null;
  }
}

export function buildListingWhereClause(
  organizationId: string,
  filters: ListingFilters,
  options: { omitUrgency?: boolean } = {},
): { clause: string; params: unknown[] } {
  const params: unknown[] = [organizationId];
  let clause = 't.organization_id = ?';
  const scope = filters.scope ?? 'active';

  if (scope === 'archived') {
    clause += ' AND t.status = ?';
    params.push(TrackableStatus.ARCHIVED);
  } else if (filters.status) {
    if (filters.status === TrackableStatus.ARCHIVED) {
      clause += ' AND t.status <> ?';
      params.push(TrackableStatus.ARCHIVED);
    } else {
      clause += ' AND t.status = ?';
      params.push(filters.status);
    }
  } else {
    clause += ' AND t.status <> ?';
    params.push(TrackableStatus.ARCHIVED);
  }

  if (filters.types?.length) {
    clause += ` AND t.type IN (${filters.types.map(() => '?').join(',')})`;
    params.push(...filters.types);
  }
  if (filters.matterTypes?.length) {
    clause += ` AND t.matter_type IN (${filters.matterTypes.map(() => '?').join(',')})`;
    params.push(...filters.matterTypes);
  }
  if (filters.clientIds?.length) {
    clause += ` AND t.client_id IN (${filters.clientIds.map(() => '?').join(',')})`;
    params.push(...filters.clientIds);
  }
  if (filters.assignedToIds?.length) {
    const hasUnassigned = filters.assignedToIds.includes('__unassigned__');
    const ids = filters.assignedToIds.filter((x) => x !== '__unassigned__');
    const parts: string[] = [];
    if (hasUnassigned) parts.push('t.assigned_to_id IS NULL');
    if (ids.length) {
      parts.push(`t.assigned_to_id IN (${ids.map(() => '?').join(',')})`);
      params.push(...ids);
    }
    if (parts.length) clause += ` AND (${parts.join(' OR ')})`;
  }

  if (!options.omitUrgency && filters.urgency) {
    clause += ' AND t.listing_urgency = ?';
    params.push(filters.urgency);
  }

  const q = filters.search?.trim();
  if (q) {
    const like = `%${q.replace(/[%_]/g, '\\$&')}%`;
    clause += ` AND (
      t.title ILIKE ?
      OR t.description ILIKE ?
      OR t.expedient_number ILIKE ?
      OR EXISTS (
        SELECT 1 FROM clients cl
        WHERE cl.id = t.client_id AND cl.organization_id = ?
          AND (cl.name ILIKE ? OR cl.email ILIKE ?)
      )
      OR EXISTS (
        SELECT 1 FROM trackable_parties tp
        WHERE tp.trackable_id = t.id AND tp.organization_id = ?
          AND tp.party_name ILIKE ?
      )
    )`;
    params.push(like, like, like, organizationId, like, like, organizationId, like);
  }

  return { clause, params };
}

export function buildListingOrderBy(sortBy: ListingSortBy = 'urgency', sortDir: 'asc' | 'desc' = 'desc'): string {
  const dir = sortDir === 'asc' ? 'ASC' : 'DESC';
  switch (sortBy) {
    case 'caratula':
      return `ORDER BY LOWER(t.title) ${dir}, t.id ASC`;
    case 'codigo':
      return `ORDER BY COALESCE(t.expedient_number, '') ${dir}, t.id ASC`;
    case 'lastActivity':
      return `ORDER BY t.listing_last_activity_at ${dir} NULLS LAST, t.id DESC`;
    case 'createdAt':
      return `ORDER BY t.created_at ${dir}, t.id DESC`;
    case 'nextDeadline':
    case 'urgency':
    default:
      return `ORDER BY t.listing_urgency_rank ASC,
        COALESCE(t.listing_next_due_at, 'infinity'::timestamptz) ASC,
        t.created_at DESC,
        t.id DESC`;
  }
}

/** Keyset WHERE for default urgency ordering (continuation after cursor row). */
export function buildCursorWhereUrgency(
  cur: ListingCursorPayload,
): { sql: string; params: unknown[] } {
  const r0 = cur.r ?? 5;
  const ndParam = cur.nd ?? null;
  const ca0 = cur.ca ?? new Date(0).toISOString();
  const id0 = cur.id;
  const sql = ` AND (
    (t.listing_urgency_rank > ?)
    OR (t.listing_urgency_rank = ? AND COALESCE(t.listing_next_due_at, 'infinity'::timestamptz) > COALESCE(?::timestamptz, 'infinity'::timestamptz))
    OR (t.listing_urgency_rank = ? AND COALESCE(t.listing_next_due_at, 'infinity'::timestamptz) = COALESCE(?::timestamptz, 'infinity'::timestamptz) AND t.created_at < ?::timestamptz)
    OR (t.listing_urgency_rank = ? AND COALESCE(t.listing_next_due_at, 'infinity'::timestamptz) = COALESCE(?::timestamptz, 'infinity'::timestamptz) AND t.created_at = ?::timestamptz AND t.id < ?::uuid)
  )`;
  const params: unknown[] = [
    r0,
    r0,
    ndParam,
    r0,
    ndParam,
    ca0,
    r0,
    ndParam,
    ca0,
    id0,
  ];
  return { sql, params };
}

export function buildCursorWhereCreatedAt(cur: ListingCursorPayload): { sql: string; params: unknown[] } {
  const cr = cur.cr ?? new Date().toISOString();
  const sql = ` AND (t.created_at < ?::timestamptz OR (t.created_at = ?::timestamptz AND t.id < ?::uuid))`;
  return { sql, params: [cr, cr, cur.id] };
}
