import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  WorkflowTemplate,
  WorkflowTemplateItem,
  WorkflowItem,
  Trackable,
  User,
  WorkflowDefinition,
  WorkflowState,
} from '@tracker/db';
import { WorkflowItemStatus, MatterType, MAX_WORKFLOW_DEPTH } from '@tracker/shared';
import type { FilterQuery } from '@mikro-orm/core';
import { allocateWorkflowItemNumbers } from '../workflow-items/workflow-item-number.util';
import { WorkflowAssignmentService } from '../workflow/workflow-assignment.service';
import type { CreateWorkflowTemplateItemDto } from './dto/create-workflow-template-item.dto';
import type { UpdateWorkflowTemplateItemDto } from './dto/update-workflow-template-item.dto';

@Injectable()
export class WorkflowTemplatesService {
  constructor(
    private readonly em: EntityManager,
    private readonly workflowAssignment: WorkflowAssignmentService,
  ) {}

  async list(
    organizationId: string,
    options?: { q?: string; matterType?: MatterType; includeSystem?: boolean },
  ): Promise<WorkflowTemplate[]> {
    const includeSystem = options?.includeSystem !== false;

    const extra: Record<string, unknown> = {};
    if (options?.matterType) extra.matterType = options.matterType;
    if (options?.q) extra.name = { $ilike: `%${options.q}%` };

    const where: FilterQuery<WorkflowTemplate> = includeSystem
      ? ({ $or: [{ isSystem: true }, { organization: organizationId }], ...extra } as FilterQuery<WorkflowTemplate>)
      : ({ organization: organizationId, ...extra } as FilterQuery<WorkflowTemplate>);

    return this.em.find(WorkflowTemplate, where, {
      orderBy: { name: 'ASC' },
      populate: ['organization'] as any,
    });
  }

  async findOne(id: string, organizationId: string): Promise<{
    template: WorkflowTemplate;
    tree: Record<string, unknown>[];
  }> {
    const tpl = await this.em.findOne(WorkflowTemplate, { id }, {
      populate: ['organization'] as any,
    });
    if (!tpl) throw new NotFoundException('Template not found');
    if (!tpl.isSystem) {
      if (!tpl.organization || tpl.organization.id !== organizationId) {
        throw new ForbiddenException();
      }
    }

    const items = await this.em.find(WorkflowTemplateItem, { template: tpl }, {
      orderBy: { sortOrder: 'ASC' } as any,
      populate: ['parent', 'documentTemplate', 'workflow', 'currentState'] as any,
    });

    const tree = this.buildTemplateTree(items);
    return { template: tpl, tree };
  }

  private buildTemplateTree(items: WorkflowTemplateItem[]): Record<string, unknown>[] {
    const nodes = new Map<string, Record<string, unknown>>();
    for (const it of items) {
      nodes.set(it.id, {
        id: it.id,
        title: it.title,
        description: it.description,
        kind: it.kind,
        actionType: it.actionType,
        sortOrder: it.sortOrder,
        offsetDays: it.offsetDays,
        requiresDocument: it.requiresDocument,
        documentTemplateId: it.documentTemplate?.id ?? null,
        triggers: it.triggers ?? null,
        workflowId: it.workflow ? (it.workflow as { id: string }).id : null,
        currentStateId: it.currentState ? (it.currentState as { id: string }).id : null,
        parentId: it.parent ? (it.parent as { id: string }).id : null,
        children: [] as Record<string, unknown>[],
      });
    }
    const roots: Record<string, unknown>[] = [];
    for (const it of items) {
      const node = nodes.get(it.id)!;
      const pid = it.parent ? (it.parent as { id: string }).id : null;
      if (pid && nodes.has(pid)) {
        (nodes.get(pid)!.children as Record<string, unknown>[]).push(node);
      } else {
        roots.push(node);
      }
    }
    const sortRec = (arr: Record<string, unknown>[]) => {
      arr.sort((a, b) => (a.sortOrder as number) - (b.sortOrder as number));
      for (const n of arr) {
        const ch = n.children as Record<string, unknown>[];
        if (ch?.length) sortRec(ch);
      }
    };
    sortRec(roots);
    return roots;
  }

  async create(
    dto: { name: string; description?: string; matterType: MatterType; category?: string; jurisdiction?: string },
    organizationId: string,
  ): Promise<WorkflowTemplate> {
    const tpl = this.em.create(WorkflowTemplate, {
      name: dto.name,
      description: dto.description,
      matterType: dto.matterType,
      category: dto.category,
      jurisdiction: dto.jurisdiction || 'PE',
      isSystem: false,
      organization: organizationId,
    } as any);
    await this.em.flush();
    return tpl;
  }

  async update(
    id: string,
    dto: Partial<{ name: string; description: string; matterType: MatterType; category: string; jurisdiction: string }>,
    organizationId: string,
  ): Promise<WorkflowTemplate> {
    const tpl = await this.em.findOneOrFail(WorkflowTemplate, { id }, { populate: ['organization'] as any });
    if (tpl.isSystem) throw new ForbiddenException('Cannot edit system templates');
    if (tpl.organization?.id !== organizationId) throw new ForbiddenException();
    this.em.assign(tpl, dto as any);
    await this.em.flush();
    return tpl;
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const tpl = await this.em.findOneOrFail(WorkflowTemplate, { id }, { populate: ['organization'] as any });
    if (tpl.isSystem) throw new ForbiddenException('Cannot delete system templates');
    if (tpl.organization?.id !== organizationId) throw new ForbiddenException();
    await this.em.removeAndFlush(tpl);
  }

  private async assertTemplateWritable(
    templateId: string,
    organizationId: string,
  ): Promise<WorkflowTemplate> {
    const tpl = await this.em.findOneOrFail(WorkflowTemplate, { id: templateId }, {
      populate: ['organization'] as any,
    });
    if (tpl.isSystem) {
      throw new ForbiddenException('Cannot modify system templates');
    }
    if (tpl.organization?.id !== organizationId) {
      throw new ForbiddenException();
    }
    return tpl;
  }

  private async getTemplateItemDepth(item: WorkflowTemplateItem): Promise<number> {
    let depth = 0;
    let current: WorkflowTemplateItem | null = item;
    while (current?.parent) {
      const pid: string =
        typeof current.parent === 'object'
          ? (current.parent as WorkflowTemplateItem).id
          : String(current.parent);
      depth += 1;
      const parentItem: WorkflowTemplateItem | null = await this.em.findOne(WorkflowTemplateItem, {
        id: pid,
      });
      if (!parentItem) break;
      current = parentItem;
    }
    return depth;
  }

  async createItem(
    templateId: string,
    organizationId: string,
    dto: CreateWorkflowTemplateItemDto,
  ): Promise<WorkflowTemplateItem> {
    const tpl = await this.assertTemplateWritable(templateId, organizationId);

    let parent: WorkflowTemplateItem | undefined;
    let depth = 0;
    if (dto.parentId) {
      const loadedParent = await this.em.findOne(WorkflowTemplateItem, {
        id: dto.parentId,
        template: tpl,
      });
      if (!loadedParent) {
        throw new BadRequestException('Parent item not found in this template');
      }
      parent = loadedParent;
      depth = (await this.getTemplateItemDepth(loadedParent)) + 1;
    }
    if (depth >= MAX_WORKFLOW_DEPTH) {
      throw new BadRequestException(`Max template depth is ${MAX_WORKFLOW_DEPTH}`);
    }

    const sortOrder = dto.sortOrder ?? 0;
    const docRef =
      dto.documentTemplateId === undefined || dto.documentTemplateId === null
        ? undefined
        : this.em.getReference('Document', dto.documentTemplateId);

    const wfRef =
      dto.workflowId === undefined || dto.workflowId === null
        ? undefined
        : this.em.getReference(WorkflowDefinition, dto.workflowId);
    let initialState: WorkflowState | undefined;
    if (wfRef) {
      initialState =
        (await this.em.findOne(WorkflowState, {
          workflow: wfRef,
          isInitial: true,
        })) ??
        (await this.em.findOne(WorkflowState, {
          workflow: wfRef,
          key: WorkflowItemStatus.PENDING,
        })) ??
        undefined;
    }

    const row = this.em.create(WorkflowTemplateItem, {
      template: tpl,
      parent: parent ?? undefined,
      title: dto.title,
      description: dto.description,
      kind: dto.kind,
      actionType: dto.actionType,
      sortOrder,
      offsetDays: dto.offsetDays,
      requiresDocument: dto.requiresDocument ?? false,
      documentTemplate: docRef,
      triggers: dto.triggers,
      workflow: wfRef,
      currentState: initialState,
    } as any);

    await this.em.flush();
    return row;
  }

  async updateItem(
    templateId: string,
    itemId: string,
    organizationId: string,
    dto: UpdateWorkflowTemplateItemDto,
  ): Promise<WorkflowTemplateItem> {
    await this.assertTemplateWritable(templateId, organizationId);
    const item = await this.em.findOne(
      WorkflowTemplateItem,
      { id: itemId, template: templateId },
      { populate: ['documentTemplate'] as any },
    );
    if (!item) throw new NotFoundException('Template item not found');

    if (dto.title !== undefined) item.title = dto.title;
    if (dto.description !== undefined) item.description = dto.description;
    if (dto.kind !== undefined) item.kind = dto.kind;
    if (dto.actionType !== undefined) item.actionType = dto.actionType;
    if (dto.sortOrder !== undefined) item.sortOrder = dto.sortOrder;
    if (dto.offsetDays !== undefined) item.offsetDays = dto.offsetDays;
    if (dto.requiresDocument !== undefined) item.requiresDocument = dto.requiresDocument;
    if (dto.documentTemplateId !== undefined) {
      item.documentTemplate =
        dto.documentTemplateId === null
          ? undefined
          : (this.em.getReference('Document', dto.documentTemplateId) as any);
    }
    if (dto.triggers !== undefined) {
      (item as any).triggers = dto.triggers;
    }
    if (dto.workflowId !== undefined) {
      if (dto.workflowId === null) {
        item.workflow = undefined;
        item.currentState = undefined;
      } else {
        const wfRef = this.em.getReference(WorkflowDefinition, dto.workflowId);
        item.workflow = wfRef as any;
        item.currentState =
          (await this.em.findOne(WorkflowState, {
            workflow: wfRef,
            isInitial: true,
          })) ??
          (await this.em.findOne(WorkflowState, {
            workflow: wfRef,
            key: WorkflowItemStatus.PENDING,
          })) ??
          undefined;
      }
    }

    await this.em.flush();
    return item;
  }

  async removeItem(
    templateId: string,
    itemId: string,
    organizationId: string,
  ): Promise<void> {
    await this.assertTemplateWritable(templateId, organizationId);
    const item = await this.em.findOne(WorkflowTemplateItem, {
      id: itemId,
      template: templateId,
    });
    if (!item) throw new NotFoundException('Template item not found');

    const all = await this.em.find(WorkflowTemplateItem, { template: templateId });
    const childrenByParent = new Map<string | null, string[]>();
    for (const it of all) {
      const pid = it.parent
        ? typeof it.parent === 'object'
          ? (it.parent as WorkflowTemplateItem).id
          : String(it.parent)
        : null;
      if (!childrenByParent.has(pid)) childrenByParent.set(pid, []);
      childrenByParent.get(pid)!.push(it.id);
    }

    const postOrder: string[] = [];
    const walk = (id: string) => {
      const ch = childrenByParent.get(id) ?? [];
      for (const cid of ch) walk(cid);
      postOrder.push(id);
    };
    walk(itemId);

    for (const id of postOrder) {
      const ent = await this.em.findOne(WorkflowTemplateItem, { id });
      if (ent) await this.em.remove(ent);
    }
    await this.em.flush();
  }

  async instantiate(
    templateId: string,
    trackableId: string,
    organizationId: string,
    startDateIso?: string,
    actorUserId?: string,
  ): Promise<WorkflowItem[]> {
    const trackable = await this.em.findOneOrFail(Trackable, { id: trackableId }, {
      populate: ['organization'] as any,
    });
    if ((trackable.organization as { id: string }).id !== organizationId) {
      throw new ForbiddenException();
    }

    const tpl = await this.em.findOne(WorkflowTemplate, { id: templateId }, {
      populate: ['organization'] as any,
    });
    if (!tpl) throw new NotFoundException('Template not found');
    if (!tpl.isSystem) {
      if (!tpl.organization || tpl.organization.id !== organizationId) {
        throw new ForbiddenException();
      }
    }

    const tItems = await this.em.find(WorkflowTemplateItem, { template: tpl }, {
      populate: ['parent', 'documentTemplate', 'workflow', 'currentState'] as any,
    });
    if (tItems.length === 0) {
      throw new BadRequestException('Template has no items');
    }

    const base = startDateIso ? new Date(startDateIso) : new Date();
    base.setHours(0, 0, 0, 0);

    let creationMetadata: Record<string, unknown> | undefined;
    if (actorUserId) {
      const u = await this.em.findOne(User, { id: actorUserId });
      creationMetadata = {
        creationSource: 'user',
        creationActorUserId: actorUserId,
      };
      if (u) {
        const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
        creationMetadata.creationActorLabel = name || u.email;
      }
    }

    const sorted = this.topologicalTemplateItems(tItems);
    const itemNumbers = await allocateWorkflowItemNumbers(this.em, trackable.id, sorted.length);
    let numberIdx = 0;
    const idMap = new Map<string, string>();
    const created: WorkflowItem[] = [];

    const hasChildren = (ti: WorkflowTemplateItem) =>
      tItems.some((x) => {
        const pid = x.parent ? (x.parent as WorkflowTemplateItem).id : null;
        return pid === ti.id;
      });

    for (const ti of sorted) {
      const parentTid = ti.parent ? (ti.parent as { id: string }).id : null;
      const parentWiId = parentTid ? idMap.get(parentTid) : undefined;

      let depth = 0;
      if (parentWiId) {
        const parentWi = await this.em.findOne(WorkflowItem, parentWiId);
        depth = (parentWi?.depth ?? 0) + 1;
      }
      if (depth >= MAX_WORKFLOW_DEPTH) {
        throw new BadRequestException(`Template would exceed max depth ${MAX_WORKFLOW_DEPTH}`);
      }

      let dueDate: Date | undefined;
      if (ti.offsetDays != null && !Number.isNaN(ti.offsetDays)) {
        dueDate = new Date(base);
        dueDate.setDate(dueDate.getDate() + ti.offsetDays);
      }

      const docTplId = ti.documentTemplate
        ? (ti.documentTemplate as { id: string }).id
        : undefined;

      const metaFromTemplate =
        ti.triggers?.length || (creationMetadata && Object.keys(creationMetadata).length)
          ? {
              ...(creationMetadata ?? {}),
              ...(ti.triggers?.length ? { triggers: ti.triggers } : {}),
            }
          : creationMetadata;

      const leaf = !hasChildren(ti);
      let wfDef: WorkflowDefinition | undefined = (ti.workflow as WorkflowDefinition) || undefined;
      let curSt: WorkflowState | undefined = (ti.currentState as WorkflowState) || undefined;
      if (leaf) {
        if (!wfDef) {
          const resolved = await this.workflowAssignment.resolveLeafWorkflow(this.em, {
            organizationId,
            matterType: trackable.matterType,
            actionType: ti.actionType ?? null,
            templateWorkflowId: null,
            explicitWorkflowId: null,
          });
          if (resolved) {
            wfDef = resolved.workflow;
            curSt = resolved.currentState;
          }
        } else if (!curSt) {
          curSt =
            (await this.workflowAssignment.findInitialState(this.em, wfDef)) ?? undefined;
        }
      }

      const wi = this.em.create(WorkflowItem, {
        trackable,
        parent: parentWiId ? this.em.getReference(WorkflowItem, parentWiId) : undefined,
        title: ti.title,
        description: ti.description,
        kind: ti.kind,
        actionType: ti.actionType,
        sortOrder: ti.sortOrder,
        depth,
        itemNumber: itemNumbers[numberIdx++]!,
        dueDate,
        requiresDocument: ti.requiresDocument,
        documentTemplate: docTplId ? this.em.getReference('Document', docTplId) : undefined,
        instantiatedFromTemplateItemId: ti.id,
        metadata: metaFromTemplate,
        organization: organizationId,
        workflow: wfDef && leaf ? wfDef : undefined,
        currentState: curSt && leaf ? curSt : undefined,
      } as any);

      created.push(wi);
      idMap.set(ti.id, wi.id);
    }

    await this.em.flush();
    return created;
  }

  private topologicalTemplateItems(items: WorkflowTemplateItem[]): WorkflowTemplateItem[] {
    const byId = new Map(items.map((i) => [i.id, i]));
    const depth = (it: WorkflowTemplateItem): number => {
      if (!it.parent) return 0;
      const pid = typeof it.parent === 'object' ? it.parent.id : String(it.parent);
      const p = byId.get(pid);
      return p ? depth(p) + 1 : 0;
    };
    return [...items].sort((a, b) => depth(a) - depth(b));
  }
}
