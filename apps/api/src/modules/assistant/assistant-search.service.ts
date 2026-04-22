import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { User } from '@tracker/db';
import { TrackablesService } from '../trackables/trackables.service';
import { ClientsService } from '../clients/clients.service';
import { FoldersService } from '../folders/folders.service';
import { SearchService } from '../search/search.service';
import { UsersService } from '../users/users.service';
import { WorkflowItemsService } from '../workflow-items/workflow-items.service';

export type AssistantSearchSource =
  | 'trackables'
  | 'clients'
  | 'folders'
  | 'templates'
  | 'users'
  | 'workflow_items';

@Injectable()
export class AssistantSearchService {
  constructor(
    private readonly em: EntityManager,
    private readonly trackables: TrackablesService,
    private readonly clients: ClientsService,
    private readonly folders: FoldersService,
    private readonly searchSvc: SearchService,
    private readonly users: UsersService,
    private readonly workflowItems: WorkflowItemsService,
  ) {}

  async searchEntities(
    source: AssistantSearchSource,
    q: string,
    organizationId: string,
    opts: { trackableId?: string; limit?: number },
  ): Promise<{ items: Array<Record<string, unknown>> }> {
    const limit = Math.min(opts.limit ?? 20, 50);
    const query = (q || '').trim();

    switch (source) {
      case 'trackables': {
        const res = await this.trackables.findByFilters(
          organizationId,
          { page: 1, limit },
          { search: query || undefined },
        );
        const data = res.data ?? [];
        return {
          items: data.map((t: any) => ({
            id: t.id,
            label: t.title ?? t.id,
            description: t.type ?? null,
          })),
        };
      }
      case 'clients': {
        const res = await this.clients.findAllForOrg(
          { page: 1, limit, sortBy: 'name', sortOrder: 'ASC' },
          query || undefined,
        );
        const data = res.data ?? [];
        return {
          items: data.map((c: any) => ({
            id: c.id,
            label: c.name ?? c.id,
            description: c.email ?? null,
          })),
        };
      }
      case 'folders': {
        if (!opts.trackableId) {
          throw new BadRequestException('trackableId requerido para source=folders');
        }
        const tree = await this.folders.getFolderTree(opts.trackableId);
        const arr = tree as Array<{ id: string; name: string; parent?: { id: string } | string | null }>;
        const byId = new Map(arr.map((f) => [f.id, f]));
        const rows = arr.map((f) => ({
          id: f.id,
          path: folderPathFrom(f, byId),
          name: f.name,
        }));
        const filtered = query
          ? rows.filter((r) => r.path.toLowerCase().includes(query.toLowerCase()))
          : rows;
        return {
          items: filtered.slice(0, limit).map((f) => ({
            id: f.id,
            label: f.path,
            description: f.name,
          })),
        };
      }
      case 'templates': {
        const { data } = await this.searchSvc.listDocuments(organizationId, { isTemplate: true }, limit, 0);
        const rows = (data as any[]) ?? [];
        const filtered = query
          ? rows.filter(
              (d) =>
                String(d.title || '')
                  .toLowerCase()
                  .includes(query.toLowerCase()),
            )
          : rows;
        return {
          items: filtered.slice(0, limit).map((d: any) => ({
            id: d.id,
            label: d.title ?? d.id,
            description: d.folder?.name ?? null,
          })),
        };
      }
      case 'users': {
        if (!query) {
          const rows = await this.em.find(
            User,
            { organization: organizationId, isActive: true } as any,
            { limit, filters: false, orderBy: { email: 'ASC' } as any },
          );
          return {
            items: rows.map((u) => ({
              id: u.id,
              label: u.getFullName?.() || u.email,
              description: u.email,
            })),
          };
        }
        const out = await this.users.searchUsersForAssignee(organizationId, query);
        return {
          items: out.matches.map((m) => ({
            id: m.id,
            label: m.displayName,
            description: m.email,
          })),
        };
      }
      case 'workflow_items': {
        if (!opts.trackableId) {
          throw new BadRequestException('trackableId requerido para source=workflow_items');
        }
        const res = await this.workflowItems.findAll(
          { trackable: opts.trackableId, organization: organizationId } as any,
          { page: 1, limit },
          { populate: ['assignedTo'] as any },
        );
        const data = res.data ?? [];
        const filtered = query
          ? data.filter((w: any) =>
              String(w.title || '')
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
          : data;
        return {
          items: filtered.slice(0, limit).map((w: any) => ({
            id: w.id,
            label: w.title ?? w.id,
            description: w.kind ?? null,
          })),
        };
      }
      default:
        throw new BadRequestException(`source inválido: ${source}`);
    }
  }
}

function folderPathFrom(
  f: { id: string; name: string; parent?: { id: string } | string | null },
  byId: Map<string, { id: string; name: string; parent?: { id: string } | string | null }>,
): string {
  const parts: string[] = [];
  const seen = new Set<string>();
  let cur: typeof f | undefined = f;
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    parts.unshift(cur.name);
    const parentId: string | undefined =
      cur.parent && typeof cur.parent === 'object'
        ? cur.parent.id
        : typeof cur.parent === 'string'
          ? cur.parent
          : undefined;
    cur = parentId ? byId.get(parentId) : undefined;
  }
  return parts.join(' / ');
}
