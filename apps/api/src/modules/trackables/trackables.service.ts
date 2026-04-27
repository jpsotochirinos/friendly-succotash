import { Injectable } from '@nestjs/common';
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
} from '@tracker/db';
import {
  TrackablePartyRole,
  TrackableStatus,
  WorkflowStateCategory,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '@tracker/shared';
import { CreateTrackablePartyDto, UpdateTrackablePartyDto } from './dto/trackable-party.dto';
import { BaseCrudService, PaginationQuery } from '../../common/services/base-crud.service';
import { CreateTrackableDto } from './dto/create-trackable.dto';
import { UpdateTrackableDto } from './dto/update-trackable.dto';
import { ProcessTracksService } from '../process-tracks/process-tracks.service';

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
}
