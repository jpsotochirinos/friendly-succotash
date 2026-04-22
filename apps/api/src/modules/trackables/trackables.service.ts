import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  Trackable,
  TrackableParty,
  Folder,
  Client,
  Document,
  WorkflowItem,
  DocumentWorkflowParticipation,
  ExternalSource,
} from '@tracker/db';
import { TrackablePartyRole, TrackableStatus } from '@tracker/shared';
import { CreateTrackablePartyDto, UpdateTrackablePartyDto } from './dto/trackable-party.dto';
import { BaseCrudService, PaginationQuery } from '../../common/services/base-crud.service';
import { CreateTrackableDto } from './dto/create-trackable.dto';
import { UpdateTrackableDto } from './dto/update-trackable.dto';

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
  constructor(em: EntityManager) {
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
    return trackable;
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
    if (filters?.assignedToId) where.assignedTo = filters.assignedToId;
    if (filters?.search) {
      where.$or = [
        { title: { $ilike: `%${filters.search}%` } },
        { description: { $ilike: `%${filters.search}%` } },
      ];
    }

    return this.findAll(where, pagination, {
      populate: ['createdBy', 'assignedTo', 'client'] as any,
    });
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
