import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  Trackable,
  TrackableParty,
  Folder,
  Client,
  Document,
  ExternalSource,
  DocumentWorkflowParticipation,
  ProcessTrack,
  WorkflowItem,
  SavedTrackableView,
  User,
  Organization,
} from '@tracker/db';
import {
  TrackablePartyRole,
  TrackableStatus,
  WorkflowStateCategory,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MatterType,
  TrackableListingUrgency,
} from '@tracker/shared';
import { CreateTrackablePartyDto, UpdateTrackablePartyDto } from './dto/trackable-party.dto';
import { BaseCrudService, PaginationQuery } from '../../common/services/base-crud.service';
import { CreateTrackableDto } from './dto/create-trackable.dto';
import { UpdateTrackableDto } from './dto/update-trackable.dto';
import { ProcessTracksService } from '../process-tracks/process-tracks.service';
import { refreshTrackableListingSnapshot } from './trackable-listing-snapshot.util';
import {
  buildListingWhereClause,
  buildListingOrderBy,
  buildCursorWhereUrgency,
  buildCursorWhereCreatedAt,
  decodeListingCursor,
  encodeListingCursor,
  type ListingFilters,
  type ListingSortBy,
} from './trackables-listing.query';

/** Post-order traversal: children (by parent id) before parents. Roots use parentKey=null. */
function postOrderByParent<T extends { id: string }>(
  items: T[],
  getParentKey: (item: T) => string | null | undefined,
): T[] {
  const idSet = new Set(items.map((i) => i.id));
  const children = new Map<string | null, T[]>();
  for (const item of items) {
    let pk = getParentKey(item) ?? null;
    if (pk && !idSet.has(pk)) pk = null;
    if (!children.has(pk)) children.set(pk, []);
    children.get(pk)!.push(item);
  }
  const out: T[] = [];
  const walk = (parentKey: string | null) => {
    for (const node of children.get(parentKey) ?? []) {
      walk(node.id);
      out.push(node);
    }
  };
  walk(null);
  return out;
}

@Injectable()
export class TrackablesService extends BaseCrudService<Trackable> {
  constructor(
    em: EntityManager,
    private readonly processTracks: ProcessTracksService,
  ) {
    super(em, Trackable);
  }

  async createTrackable(
    dto: CreateTrackableDto,
    userId: string,
    organizationId: string,
  ): Promise<Trackable> {
    const {
      assignedToId,
      clientId,
      matterType,
      expedientNumber,
      court,
      counterpartyName,
      jurisdiction,
      skipAutoProcessTrack,
      ...rest
    } = dto;
    const trackable = this.em.create(Trackable, {
      ...rest,
      matterType: matterType ?? undefined,
      expedientNumber,
      court,
      counterpartyName,
      jurisdiction: jurisdiction ?? 'PE',
      status: TrackableStatus.CREATED,
      organization: organizationId,
      createdBy: userId,
      assignedTo: assignedToId || undefined,
      client: clientId ? this.em.getReference(Client, clientId) : undefined,
    } as any);

    this.em.create(Folder, {
      name: dto.title,
      trackable,
      organization: organizationId,
    } as any);

    await this.em.flush();
    if (!skipAutoProcessTrack) {
      await this.processTracks.createFreeStyle(trackable.id, organizationId);
    }
    await refreshTrackableListingSnapshot(this.em, organizationId, trackable.id);
    return trackable;
  }

  private buildTrackableSqlFilter(
    organizationId: string,
    filters?: {
      scope?: 'active' | 'archived';
      status?: TrackableStatus;
      type?: string;
      assignedToId?: string;
      search?: string;
    },
  ): { clause: string; params: unknown[] } {
    const params: unknown[] = [organizationId];
    let clause = 't.organization_id = ?';
    const scope = filters?.scope ?? 'active';

    if (scope === 'archived') {
      clause += ' AND t.status = ?';
      params.push(TrackableStatus.ARCHIVED);
    } else if (filters?.status) {
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

    if (filters?.type) {
      clause += ' AND t.type = ?';
      params.push(filters.type);
    }
    if (filters?.assignedToId) {
      if (filters.assignedToId === '__unassigned__') {
        clause += ' AND t.assigned_to_id IS NULL';
      } else {
        clause += ' AND t.assigned_to_id = ?';
        params.push(filters.assignedToId);
      }
    }
    const q = filters?.search?.trim();
    if (q) {
      clause += ' AND (t.title ILIKE ? OR t.description ILIKE ?)';
      const like = `%${q}%`;
      params.push(like, like);
    }
    return { clause, params };
  }

  async findByFilters(
    organizationId: string,
    pagination: PaginationQuery,
    filters?: {
      scope?: 'active' | 'archived';
      status?: TrackableStatus;
      type?: string;
      assignedToId?: string;
      search?: string;
      activityFilter?: 'total' | 'urgentToday' | 'overdue' | 'next14Days';
    },
  ) {
    const where: any = {};
    const scope = filters?.scope ?? 'active';

    if (scope === 'archived') {
      where.status = TrackableStatus.ARCHIVED;
    } else if (filters?.status) {
      if (filters.status === TrackableStatus.ARCHIVED) {
        where.status = { $ne: TrackableStatus.ARCHIVED };
      } else {
        where.status = filters.status;
      }
    } else {
      where.status = { $ne: TrackableStatus.ARCHIVED };
    }

    if (filters?.type) where.type = filters.type;
    if (filters?.assignedToId) {
      where.assignedTo = filters.assignedToId === '__unassigned__' ? null : filters.assignedToId;
    }
    if (filters?.search) {
      where.$or = [
        { title: { $ilike: `%${filters.search}%` } },
        { description: { $ilike: `%${filters.search}%` } },
      ];
    }

    const { clause: trackableSql, params: trackableParams } = this.buildTrackableSqlFilter(
      organizationId,
      filters,
    );

    const done = WorkflowStateCategory.DONE;
    const cancelled = WorkflowStateCategory.CANCELLED;
    const inProg = WorkflowStateCategory.IN_PROGRESS;
    const inRev = WorkflowStateCategory.IN_REVIEW;

    /** Open = not completed and not terminal done/cancelled */
    const sqlOpen = `
      ai.completed_at IS NULL
      AND (ai.workflow_state_category IS NULL OR ai.workflow_state_category NOT IN (?, ?))
    `;

    const activityExistsSql = (innerWhere: string) => `
      EXISTS (
        SELECT 1 FROM activity_instances ai
        WHERE ai.organization_id = ?
          AND ai.trackable_id = b.id
          AND COALESCE(ai.is_reverted, false) = false
          AND ${innerWhere}
      )
    `;

    const activityFilter = filters?.activityFilter;
    let activityExistsClause = '';
    let activityFilterParams: unknown[] = [];
    if (activityFilter === 'total') {
      /** Sin filtro por actividad: listar todos los expedientes del scope (misma UX que limpiar KPI). */
      activityExistsClause = '';
      activityFilterParams = [];
    } else if (activityFilter === 'urgentToday') {
      activityExistsClause = activityExistsSql(`
        (${sqlOpen})
        AND (
          ai.priority = 'urgent'
          OR (
            ai.due_date IS NOT NULL
            AND ai.due_date >= date_trunc('day', now())
            AND ai.due_date < date_trunc('day', now()) + interval '1 day'
          )
        )
      `);
      activityFilterParams = [organizationId, done, cancelled];
    } else if (activityFilter === 'overdue') {
      activityExistsClause = activityExistsSql(`
        (${sqlOpen})
        AND ai.due_date IS NOT NULL
        AND ai.due_date < date_trunc('day', now())
      `);
      activityFilterParams = [organizationId, done, cancelled];
    } else if (activityFilter === 'next14Days') {
      activityExistsClause = activityExistsSql(`
        (${sqlOpen})
        AND ai.due_date IS NOT NULL
        AND ai.due_date >= date_trunc('day', now())
        AND ai.due_date < date_trunc('day', now()) + interval '15 days'
      `);
      activityFilterParams = [organizationId, done, cancelled];
    }

    const facetSql = `
      WITH base AS (
        SELECT t.id FROM trackables t
        WHERE ${trackableSql}
      )
      SELECT
        (SELECT COUNT(*)::int FROM base) AS "facetTotal",
        (
          SELECT COUNT(*)::int FROM base b
          WHERE ${activityExistsSql(`
            (${sqlOpen})
            AND (
              ai.priority = 'urgent'
              OR (
                ai.due_date IS NOT NULL
                AND ai.due_date >= date_trunc('day', now())
                AND ai.due_date < date_trunc('day', now()) + interval '1 day'
              )
            )
          `)}
        ) AS "facetUrgentToday",
        (
          SELECT COUNT(*)::int FROM base b
          WHERE ${activityExistsSql(`
            (${sqlOpen})
            AND ai.due_date IS NOT NULL
            AND ai.due_date < date_trunc('day', now())
          `)}
        ) AS "facetOverdue",
        (
          SELECT COUNT(*)::int FROM base b
          WHERE ${activityExistsSql(`
            (${sqlOpen})
            AND ai.due_date IS NOT NULL
            AND ai.due_date >= date_trunc('day', now())
            AND ai.due_date < date_trunc('day', now()) + interval '15 days'
          `)}
        ) AS "facetNext14Days"
    `;

    const facetParams: unknown[] = [
      ...trackableParams,
      organizationId,
      done,
      cancelled,
      organizationId,
      done,
      cancelled,
      organizationId,
      done,
      cancelled,
    ];

    const facetRows = await this.em.getConnection().execute<
      Array<{
        facetTotal: number | string;
        facetUrgentToday: number | string;
        facetOverdue: number | string;
        facetNext14Days: number | string;
      }>
    >(facetSql, facetParams);
    const facetRow = facetRows[0] ?? {};
    const activityFilterFacets = {
      total: Number(facetRow.facetTotal ?? 0),
      urgentToday: Number(facetRow.facetUrgentToday ?? 0),
      overdue: Number(facetRow.facetOverdue ?? 0),
      next14Days: Number(facetRow.facetNext14Days ?? 0),
    };

    let result: Awaited<ReturnType<BaseCrudService<Trackable>['findAll']>>;

    if (activityFilter && activityFilter !== 'total' && activityExistsClause) {
      const countSql = `
        WITH base AS (
          SELECT t.id FROM trackables t
          WHERE ${trackableSql}
        ),
        filtered AS (
          SELECT b.id FROM base b
          WHERE ${activityExistsClause}
        )
        SELECT COUNT(*)::int AS c FROM filtered
      `;
      const countParams = [...trackableParams, ...activityFilterParams];
      const countRes = await this.em.getConnection().execute<Array<{ c: number | string }>>(
        countSql,
        countParams,
      );
      const total = Number(countRes[0]?.c ?? 0);

      const page = Math.max(1, pagination.page || 1);
      const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, pagination.limit || DEFAULT_PAGE_SIZE));
      const offset = (page - 1) * limit;

      const orderByField = pagination.sortBy === 'title' ? 't.title' : 't.created_at';
      const orderDir = pagination.sortOrder === 'ASC' ? 'ASC' : 'DESC';

      const pageSql = `
        WITH base AS (
          SELECT t.id FROM trackables t
          WHERE ${trackableSql}
        ),
        filtered AS (
          SELECT b.id FROM base b
          WHERE ${activityExistsClause}
        )
        SELECT t.id
        FROM trackables t
        INNER JOIN filtered f ON f.id = t.id
        ORDER BY ${orderByField} ${orderDir}
        LIMIT ? OFFSET ?
      `;
      const pageParams = [...trackableParams, ...activityFilterParams, limit, offset];
      const idRows = await this.em.getConnection().execute<Array<{ id: string }>>(pageSql, pageParams);
      const orderedIds = idRows.map((r) => r.id);

      const items =
        orderedIds.length === 0
          ? []
          : await this.em.find(
              Trackable,
              { id: { $in: orderedIds } } as any,
              {
                populate: ['createdBy', 'assignedTo', 'client'] as any,
              } as any,
            );
      const byId = new Map(items.map((it) => [it.id, it]));
      const orderedItems = orderedIds.map((id) => byId.get(id)).filter(Boolean) as Trackable[];

      result = {
        data: orderedItems,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 0,
      };
    } else {
      result = await this.findAll(where, pagination, {
        populate: ['createdBy', 'assignedTo', 'client'] as any,
      });
    }

    const ids = result.data.map((item) => item.id);
    if (!ids.length) {
      return {
        ...result,
        activityFilterFacets,
      } as any;
    }

    const placeholders = ids.map(() => '?').join(', ');
    const rows = await this.em.getConnection().execute<
      Array<{
        trackableId: string;
        total: number | string;
        done: number | string;
        inProgress: number | string;
        overdue: number | string;
        urgentToday: number | string;
        next14Days: number | string;
      }>
    >(
      `
        SELECT
          trackable_id AS "trackableId",
          COUNT(*)::int AS total,
          COUNT(*) FILTER (
            WHERE completed_at IS NOT NULL
               OR workflow_state_category = ?
          )::int AS done,
          COUNT(*) FILTER (
            WHERE completed_at IS NULL
              AND workflow_state_category IN (?, ?)
          )::int AS "inProgress",
          COUNT(*) FILTER (
            WHERE completed_at IS NULL
              AND (workflow_state_category IS NULL OR workflow_state_category NOT IN (?, ?))
              AND due_date IS NOT NULL
              AND due_date < date_trunc('day', now())
          )::int AS overdue,
          COUNT(*) FILTER (
            WHERE completed_at IS NULL
              AND (workflow_state_category IS NULL OR workflow_state_category NOT IN (?, ?))
              AND (
                priority = 'urgent'
                OR (
                  due_date IS NOT NULL
                  AND due_date >= date_trunc('day', now())
                  AND due_date < date_trunc('day', now()) + interval '1 day'
                )
              )
          )::int AS "urgentToday",
          COUNT(*) FILTER (
            WHERE completed_at IS NULL
              AND (workflow_state_category IS NULL OR workflow_state_category NOT IN (?, ?))
              AND due_date IS NOT NULL
              AND due_date >= date_trunc('day', now())
              AND due_date < date_trunc('day', now()) + interval '15 days'
          )::int AS "next14Days"
        FROM activity_instances
        WHERE organization_id = ?
          AND trackable_id IN (${placeholders})
          AND COALESCE(is_reverted, false) = false
          AND (workflow_state_category IS NULL OR workflow_state_category <> ?)
        GROUP BY trackable_id
      `,
      [
        done,
        inProg,
        inRev,
        done,
        cancelled,
        done,
        cancelled,
        done,
        cancelled,
        organizationId,
        ...ids,
        cancelled,
      ],
    );

    const byTrackable = new Map(
      rows.map((row) => [
        row.trackableId,
        {
          total: Number(row.total ?? 0),
          done: Number(row.done ?? 0),
          inProgress: Number(row.inProgress ?? 0),
          overdue: Number(row.overdue ?? 0),
          urgentToday: Number(row.urgentToday ?? 0),
          next14Days: Number(row.next14Days ?? 0),
        },
      ]),
    );

    result.data.forEach((item) => {
      (item as any).activitySummary = byTrackable.get(item.id) ?? {
        total: 0,
        done: 0,
        inProgress: 0,
        overdue: 0,
        urgentToday: 0,
        next14Days: 0,
      };
    });

    return {
      ...result,
      activityFilterFacets,
    } as any;
  }

  async listParties(trackableId: string): Promise<TrackableParty[]> {
    await this.findOne(trackableId);
    return this.em.find(TrackableParty, { trackable: trackableId }, { orderBy: { sortOrder: 'ASC', createdAt: 'ASC' } });
  }

  async createParty(trackableId: string, dto: CreateTrackablePartyDto, organizationId: string): Promise<TrackableParty> {
    const trackable = await this.findOne(trackableId);
    const party = this.em.create(TrackableParty, {
      trackable,
      organization: organizationId,
      role: dto.role ?? TrackablePartyRole.OTHER,
      partyName: dto.partyName,
      documentId: dto.documentId,
      email: dto.email,
      phone: dto.phone,
      notes: dto.notes,
      sortOrder: dto.sortOrder ?? 0,
    } as any);
    await this.em.flush();
    return party;
  }

  async updateParty(
    trackableId: string,
    partyId: string,
    dto: UpdateTrackablePartyDto,
  ): Promise<TrackableParty> {
    await this.findOne(trackableId);
    const party = await this.em.findOneOrFail(TrackableParty, { id: partyId, trackable: trackableId });
    this.em.assign(party, dto as any);
    await this.em.flush();
    return party;
  }

  async removeParty(trackableId: string, partyId: string): Promise<void> {
    await this.findOne(trackableId);
    const party = await this.em.findOneOrFail(TrackableParty, { id: partyId, trackable: trackableId });
    this.em.remove(party);
    await this.em.flush();
  }

  async patchTrackable(id: string, dto: UpdateTrackableDto): Promise<Trackable> {
    const { assignedToId, clientId, ...rest } = dto as UpdateTrackableDto & {
      assignedToId?: string | null;
      clientId?: string | null;
    };
    const entity = await this.findOne(id);
    this.em.assign(entity, rest as any);
    if (assignedToId !== undefined) {
      (entity as any).assignedTo = assignedToId
        ? this.em.getReference('User', assignedToId)
        : undefined;
    }
    if (clientId !== undefined) {
      (entity as any).client = clientId
        ? this.em.getReference(Client, clientId)
        : undefined;
    }
    await this.em.flush();
    const orgId = (entity as { organization: { id: string } }).organization.id;
    await refreshTrackableListingSnapshot(this.em, orgId, id);
    return this.findOne(id, {
      populate: ['createdBy', 'assignedTo', 'folders', 'client'] as any,
    });
  }

  /**
   * Deletes folders, workflow, documents and related rows before the trackable.
   * Required because FKs from folders / workflow_items / external_sources do not cascade on DB level.
   */
  /**
   * Single trackable for API, with `processTracks` summary for blueprint engine flows.
   */
  async findOneWithBlueprintData(
    id: string,
    options: { populate?: any } = {},
  ): Promise<Trackable> {
    const entity = await this.findOne(id, options);
    const orgId = (entity as { organization: { id: string } }).organization.id;
    const pts = await this.em.find(
      ProcessTrack,
      { trackable: id, organization: orgId },
      { populate: ['currentStageInstance'] as any },
    );
    (entity as any).processTracks = pts.map((pt) => ({
      id: pt.id,
      role: pt.role,
      prefix: pt.prefix,
      currentStageInstanceId: pt.currentStageInstance?.id ?? null,
    }));
    return entity;
  }

  async remove(id: string): Promise<void> {
    await this.em.transactional(async (em) => {
      const trackable = await em.findOneOrFail(Trackable, { id });

      const folders = await em.find(Folder, { trackable: id }, { populate: ['parent'] as any });
      const folderIds = folders.map((f) => f.id);

      const wfItems = await em.find(
        WorkflowItem,
        { trackable: id },
        { populate: ['parent'] as any },
      );
      const wfIds = wfItems.map((w) => w.id);

      if (wfIds.length) {
        await em.nativeDelete(DocumentWorkflowParticipation, {
          workflowItem: { $in: wfIds },
        } as any);
      }

      const docClauses: object[] = [];
      if (folderIds.length) {
        docClauses.push({ folder: { $in: folderIds } });
      }
      if (wfIds.length) {
        docClauses.push({ workflowItem: { $in: wfIds } });
      }

      if (docClauses.length) {
        const docs = await em.find(Document, { $or: docClauses } as any);
        const seen = new Set<string>();
        for (const d of docs) {
          if (seen.has(d.id)) continue;
          seen.add(d.id);
          em.remove(d);
        }
        await em.flush();
      }

      const parentId = (rel: unknown): string | null => {
        if (rel == null) return null;
        if (typeof rel === 'object' && rel !== null && 'id' in rel) {
          return String((rel as { id: string }).id);
        }
        return String(rel);
      };

      const wfOrder = postOrderByParent(wfItems, (w) => parentId(w.parent as unknown));
      for (const w of wfOrder) {
        em.remove(w);
      }
      await em.flush();

      const folderOrder = postOrderByParent(folders, (f) => parentId(f.parent as unknown));
      for (const f of folderOrder) {
        em.remove(f);
      }
      await em.flush();

      await em.nativeDelete(ExternalSource, { trackable: id } as any);
      await em.nativeDelete(TrackableParty, { trackable: id } as any);

      em.remove(trackable);
      await em.flush();
    });
  }

  // -------------------------------------------------------------------------
  // Scalable listing (cursor + facets + saved views)
  // -------------------------------------------------------------------------

  async findListingCursor(
    organizationId: string,
    q: {
      scope?: 'active' | 'archived';
      status?: TrackableStatus;
      types?: string[];
      matterTypes?: string[];
      assignedToIds?: string[];
      clientIds?: string[];
      search?: string;
      urgency?: TrackableListingUrgency;
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
      cursor?: string;
      limit?: number;
    },
  ) {
    const limit = Math.min(200, Math.max(1, Number(q.limit) || 50));
    const sortByList: ListingSortBy[] = [
      'urgency',
      'caratula',
      'codigo',
      'lastActivity',
      'createdAt',
      'nextDeadline',
    ];
    const sortBy = (sortByList.includes(q.sortBy as ListingSortBy)
      ? q.sortBy
      : 'urgency') as ListingSortBy;
    const sortDir = q.sortDir === 'asc' ? 'asc' : 'desc';

    const filters: ListingFilters = {
      scope: q.scope ?? 'active',
      status: q.status,
      types: q.types,
      matterTypes: q.matterTypes,
      assignedToIds: q.assignedToIds,
      clientIds: q.clientIds,
      search: q.search,
      urgency: q.urgency,
    };

    const { clause, params } = buildListingWhereClause(organizationId, filters);
    const facetWhere = buildListingWhereClause(organizationId, filters, { omitUrgency: true });

    let cursorSql = '';
    const cursorParams: unknown[] = [];
    const cur = decodeListingCursor(q.cursor);
    if (cur) {
      if ((sortBy === 'urgency' || sortBy === 'nextDeadline') && cur.sortBy === sortBy) {
        const c = buildCursorWhereUrgency(cur);
        cursorSql += c.sql;
        cursorParams.push(...c.params);
      } else if (sortBy === 'createdAt' && cur.sortBy === 'createdAt') {
        const c = buildCursorWhereCreatedAt(cur);
        cursorSql += c.sql;
        cursorParams.push(...c.params);
      }
    }

    const orderBy = buildListingOrderBy(sortBy, sortDir);

    const countSql = `SELECT COUNT(*)::int AS c FROM trackables t WHERE ${clause}`;
    const countRows = await this.em.getConnection().execute<Array<{ c: number | string }>>(
      countSql,
      params,
    );
    const totalCount = Number((countRows as any[])[0]?.c ?? 0);

    const facetSql = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE t.listing_urgency = 'overdue')::int AS overdue,
        COUNT(*) FILTER (WHERE t.listing_urgency = 'due_today')::int AS due_today,
        COUNT(*) FILTER (WHERE t.listing_urgency = 'due_week')::int AS due_week,
        COUNT(*) FILTER (WHERE t.listing_urgency = 'due_month')::int AS due_month,
        COUNT(*) FILTER (WHERE t.listing_urgency = 'normal')::int AS normal,
        COUNT(*) FILTER (WHERE t.listing_urgency = 'no_deadline')::int AS no_deadline
      FROM trackables t
      WHERE ${facetWhere.clause}
    `;
    const facetRows = await this.em.getConnection().execute<Array<Record<string, number | string>>>(
      facetSql,
      facetWhere.params,
    );
    const fr = (facetRows as any[])[0] ?? {};

    const listSql = `
      SELECT
        t.id,
        t.title,
        t.expedient_number,
        t.type,
        t.matter_type,
        t.status,
        t.listing_urgency,
        t.listing_urgency_rank,
        t.listing_next_due_at,
        t.listing_last_activity_at,
        t.listing_activity_total,
        t.listing_activity_done,
        t.listing_doc_count,
        t.listing_comment_count,
        t.created_at,
        c.id AS client_id,
        c.name AS client_name,
        u.id AS assignee_id,
        u.first_name AS assignee_first_name,
        u.last_name AS assignee_last_name,
        u.email AS assignee_email,
        u.avatar_url AS assignee_avatar_url
      FROM trackables t
      LEFT JOIN clients c ON c.id = t.client_id
      LEFT JOIN users u ON u.id = t.assigned_to_id
      WHERE ${clause} ${cursorSql}
      ${orderBy}
      LIMIT ?
    `;
    const listParams = [...params, ...cursorParams, limit];
    const rows = (await this.em.getConnection().execute(listSql, listParams)) as Record<
      string,
      unknown
    >[];

    const items = rows.map((row) => this.mapTrackableListingRow(row));
    let nextCursor: string | null = null;
    if (rows.length === limit) {
      const last = rows[rows.length - 1]!;
      if (sortBy === 'urgency' || sortBy === 'nextDeadline') {
        nextCursor = encodeListingCursor({
          sortBy,
          r: Number(last.listing_urgency_rank ?? 5),
          nd: last.listing_next_due_at
            ? new Date(String(last.listing_next_due_at)).toISOString()
            : null,
          ca: new Date(String(last.created_at)).toISOString(),
          id: String(last.id),
        });
      } else if (sortBy === 'createdAt') {
        nextCursor = encodeListingCursor({
          sortBy: 'createdAt',
          cr: new Date(String(last.created_at)).toISOString(),
          id: String(last.id),
        });
      }
    }

    return {
      items,
      nextCursor,
      totalCount,
      facets: {
        total: Number(fr.total ?? 0),
        overdue: Number(fr.overdue ?? 0),
        dueToday: Number(fr.due_today ?? 0),
        dueWeek: Number(fr.due_week ?? 0),
        dueMonth: Number(fr.due_month ?? 0),
        normal: Number(fr.normal ?? 0),
        noDeadline: Number(fr.no_deadline ?? 0),
      },
    };
  }

  private mapTrackableListingRow(row: Record<string, unknown>) {
    const total = Math.max(0, Number(row.listing_activity_total ?? 0));
    const done = Math.max(0, Number(row.listing_activity_done ?? 0));
    const progresoPct = total > 0 ? Math.round((done / total) * 100) : 0;
    const nextDue = row.listing_next_due_at
      ? new Date(String(row.listing_next_due_at))
      : null;
    const dias = this.listingDaysRemaining(nextDue);
    const assigneeId = row.assignee_id ? String(row.assignee_id) : null;
    const fn = row.assignee_first_name ? String(row.assignee_first_name) : '';
    const ln = row.assignee_last_name ? String(row.assignee_last_name) : '';
    const em = row.assignee_email ? String(row.assignee_email) : '';
    const assigneeName = [fn, ln].filter(Boolean).join(' ') || em || '';
    return {
      id: String(row.id),
      codigo: row.expedient_number ? String(row.expedient_number) : '',
      caratula: String(row.title ?? ''),
      tipo: String(row.type ?? ''),
      materia: String(row.matter_type ?? ''),
      estado: String(row.status ?? ''),
      urgencia: String(row.listing_urgency ?? 'no_deadline'),
      cliente: row.client_id
        ? { id: String(row.client_id), nombre: String(row.client_name ?? '') }
        : null,
      asignado: assigneeId
        ? {
            id: assigneeId,
            nombre: assigneeName,
            avatarUrl: row.assignee_avatar_url ? String(row.assignee_avatar_url) : undefined,
          }
        : null,
      proximoPlazo: nextDue
        ? {
            fecha: nextDue.toISOString(),
            tipo: 'activity',
            diasRestantes: dias ?? 0,
          }
        : null,
      ultimaActividad: row.listing_last_activity_at
        ? new Date(String(row.listing_last_activity_at)).toISOString()
        : new Date(String(row.created_at ?? new Date())).toISOString(),
      contadores: {
        documentos: Number(row.listing_doc_count ?? 0),
        actividadesHechas: done,
        actividadesTotal: total,
        comentarios: Number(row.listing_comment_count ?? 0),
      },
      progresoPct,
    };
  }

  private listingDaysRemaining(d: Date | null): number | null {
    if (!d) return null;
    const a = new Date();
    a.setHours(0, 0, 0, 0);
    const b = new Date(d);
    b.setHours(0, 0, 0, 0);
    return Math.floor((b.getTime() - a.getTime()) / 86400000);
  }

  async getListingFilterOptions(organizationId: string) {
    const matterTypes = Object.values(MatterType);
    const types = ['case', 'process', 'project', 'audit'];
    const users = await this.em.find(
      User,
      { organization: organizationId, isActive: true },
      { fields: ['id', 'firstName', 'lastName', 'email'] as any, orderBy: { email: 'ASC' } as any },
    );
    const clients = await this.em.find(
      Client,
      { organization: organizationId },
      { fields: ['id', 'name'] as any, orderBy: { name: 'ASC' } as any, limit: 500 },
    );
    return {
      matterTypes,
      types,
      users: users.map((u) => ({
        id: u.id,
        nombre: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email,
        email: u.email,
      })),
      clients: clients.map((c) => ({ id: c.id, nombre: c.name })),
    };
  }

  async listSavedViews(organizationId: string, userId: string) {
    return this.em.find(
      SavedTrackableView,
      { organization: organizationId, user: userId },
      { orderBy: { lastUsedAt: 'DESC', updatedAt: 'DESC' } as any },
    );
  }

  async createSavedView(
    organizationId: string,
    userId: string,
    body: { name: string; slug?: string; config: Record<string, unknown>; isShared?: boolean },
    permissions: string[],
  ) {
    const baseSlug = (body.slug ?? body.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'vista';
    let slug = baseSlug;
    let n = 0;
    while (
      await this.em.count(SavedTrackableView, {
        organization: organizationId,
        user: userId,
        slug,
      })
    ) {
      n += 1;
      slug = `${baseSlug}-${n}`;
    }
    const isShared = Boolean(body.isShared) && permissions.includes('trackable_view:share');
    const v = this.em.create(SavedTrackableView, {
      organization: this.em.getReference(Organization, organizationId),
      user: this.em.getReference(User, userId),
      name: body.name.trim(),
      slug,
      config: body.config,
      isShared,
    } as any);
    await this.em.flush();
    return v;
  }

  async updateSavedView(
    organizationId: string,
    userId: string,
    viewId: string,
    body: Partial<{ name: string; slug: string; config: Record<string, unknown>; isShared: boolean; isFavorite: boolean }>,
    permissions: string[],
  ) {
    const v = await this.em.findOne(SavedTrackableView, {
      id: viewId,
      organization: organizationId,
      user: userId,
    });
    if (!v) throw new NotFoundException('Saved view not found');
    if (body.name !== undefined) v.name = body.name.trim();
    if (body.slug !== undefined) v.slug = body.slug.trim().slice(0, 80);
    if (body.config !== undefined) v.config = body.config;
    if (body.isFavorite !== undefined) v.isFavorite = body.isFavorite;
    if (body.isShared !== undefined) {
      v.isShared = Boolean(body.isShared) && permissions.includes('trackable_view:share');
    }
    await this.em.flush();
    return v;
  }

  async deleteSavedView(organizationId: string, userId: string, viewId: string) {
    const v = await this.em.findOne(SavedTrackableView, {
      id: viewId,
      organization: organizationId,
      user: userId,
    });
    if (!v) return { ok: false };
    this.em.remove(v);
    await this.em.flush();
    return { ok: true };
  }

  async touchSavedViewUsed(organizationId: string, userId: string, slug: string) {
    const v = await this.em.findOne(SavedTrackableView, {
      organization: organizationId,
      user: userId,
      slug,
    });
    if (!v) return null;
    v.lastUsedAt = new Date();
    await this.em.flush();
    return v;
  }

  async stubBulkOperations() {
    return { ok: true, stub: true, message: 'Próximamente' };
  }
}
