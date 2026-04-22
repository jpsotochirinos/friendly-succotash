import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Document, Folder, Trackable, User, WorkflowItem, WorkflowItemComment } from '@tracker/db';
import { MAX_WORKFLOW_DEPTH } from '@tracker/shared';
import { WorkflowAssignmentService } from '../workflow/workflow-assignment.service';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { CreateWorkflowItemDto } from './dto/create-workflow-item.dto';
import { DocumentsService } from '../documents/documents.service';
import { FoldersService } from '../folders/folders.service';
import { allocateWorkflowItemNumbers } from './workflow-item-number.util';

@Injectable()
export class WorkflowItemsService extends BaseCrudService<WorkflowItem> {
  constructor(
    em: EntityManager,
    private readonly documentsService: DocumentsService,
    private readonly foldersService: FoldersService,
    private readonly workflowAssignment: WorkflowAssignmentService,
  ) {
    super(em, WorkflowItem);
  }

  /** Primera carpeta raíz del expediente (misma lógica que create_blank_document en el asistente). */
  private firstRootFolderId(folders: Folder[]): string | null {
    const roots = folders.filter((f) => !f.parent);
    if (roots.length) return roots[0].id;
    return folders[0]?.id ?? null;
  }

  async createItem(
    dto: CreateWorkflowItemDto,
    organizationId: string,
    actorUserId?: string,
    opts?: { creationSource?: 'user' | 'assistant' },
  ): Promise<WorkflowItem> {
    let depth = 0;

    if (dto.parentId) {
      const parent = await this.em.findOneOrFail(WorkflowItem, dto.parentId);
      depth = parent.depth + 1;
      if (depth >= MAX_WORKFLOW_DEPTH) {
        throw new BadRequestException(
          `Maximum workflow depth of ${MAX_WORKFLOW_DEPTH} exceeded`,
        );
      }
    }

    let mergedMetadata = await this.buildCreationMetadata(
      dto.metadata,
      actorUserId,
      opts?.creationSource ?? 'user',
    );
    if (dto.secondaryAssigneeIds?.length) {
      const m = (mergedMetadata && typeof mergedMetadata === 'object' ? { ...mergedMetadata } : {}) as Record<
        string,
        unknown
      >;
      m.secondaryAssigneeIds = dto.secondaryAssigneeIds;
      mergedMetadata = m;
    }

    const item = await this.em.transactional(async (em) => {
      const [nextNum] = await allocateWorkflowItemNumbers(em, dto.trackableId, 1);
      const trackable = await em.findOneOrFail(Trackable, dto.trackableId, {
        populate: ['matterType'] as any,
      });
      const resolved = await this.workflowAssignment.resolveLeafWorkflow(em, {
        organizationId,
        matterType: trackable.matterType,
        actionType: dto.actionType ?? null,
        explicitWorkflowId: dto.workflowId ?? null,
      });
      const wi = em.create(WorkflowItem, {
        trackable: dto.trackableId,
        parent: dto.parentId || undefined,
        title: dto.title,
        description: dto.description,
        kind: dto.kind,
        actionType: dto.actionType,
        workflow: resolved?.workflow,
        currentState: resolved?.currentState,
        assignedTo: dto.assignedToId || undefined,
        sortOrder: dto.sortOrder ?? 0,
        depth,
        itemNumber: nextNum,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        requiresDocument: dto.requiresDocument ?? false,
        isLegalDeadline: dto.isLegalDeadline ?? false,
        documentTemplate: dto.documentTemplateId || undefined,
        metadata: mergedMetadata,
        accentColor: dto.accentColor || undefined,
        location: dto.location,
        priority: dto.priority ?? 'normal',
        allDay: dto.allDay ?? true,
        reminderMinutesBefore: dto.reminderMinutesBefore,
        calendarColor: dto.calendarColor,
        rrule: dto.rrule,
        organization: organizationId,
      } as any);
      await em.flush();
      return wi;
    });

    if (dto.documentTemplateId && actorUserId) {
      await this.instantiateDocumentFromTemplate(item, dto, organizationId, actorUserId);
    }

    return item;
  }

  private async buildCreationMetadata(
    existing: Record<string, unknown> | undefined,
    actorUserId: string | undefined,
    creationSource: 'user' | 'assistant',
  ): Promise<Record<string, unknown> | undefined> {
    const base: Record<string, unknown> =
      existing && typeof existing === 'object' && !Array.isArray(existing) ? { ...existing } : {};
    base.creationSource = creationSource;
    if (actorUserId) {
      base.creationActorUserId = actorUserId;
      const u = await this.em.findOne(User, { id: actorUserId });
      if (u) {
        const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
        base.creationActorLabel = name || u.email;
      }
    }
    return Object.keys(base).length ? base : undefined;
  }

  /**
   * Crea un documento real (copia de la plantilla) en la carpeta del expediente y lo vincula a la actuación.
   * Sin esto, solo quedaría la relación `documentTemplate` en la tarea, sin archivo editable.
   */
  private async instantiateDocumentFromTemplate(
    item: WorkflowItem,
    dto: CreateWorkflowItemDto,
    organizationId: string,
    actorUserId: string,
  ): Promise<void> {
    const tree = await this.foldersService.getFolderTree(dto.trackableId);
    const folderId = this.firstRootFolderId(tree);
    if (!folderId) {
      throw new BadRequestException(
        'No hay carpeta de documentos en este expediente. Crea una carpeta antes de generar un documento desde plantilla.',
      );
    }

    const newDoc = await this.documentsService.copyAsTemplate(
      dto.documentTemplateId!,
      folderId,
      item.id,
      actorUserId,
      organizationId,
      dto.trackableId,
    );

    await this.documentsService.patchDocument(
      newDoc.id,
      { title: dto.title },
      organizationId,
    );
  }

  async listComments(itemId: string, organizationId: string) {
    const item = await this.em.findOne(WorkflowItem, { id: itemId, organization: organizationId });
    if (!item) {
      throw new NotFoundException('Workflow item not found');
    }
    const rows = await this.em.find(
      WorkflowItemComment,
      { workflowItem: itemId, organization: organizationId },
      {
        orderBy: { createdAt: 'ASC' },
        populate: ['user'] as any,
      },
    );
    return rows.map((c) => {
      const u = c.user as { id: string; email?: string; firstName?: string; lastName?: string } | undefined;
      return {
        id: c.id,
        body: c.body,
        createdAt: c.createdAt,
        user: u
          ? { id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName }
          : null,
      };
    });
  }

  async addComment(itemId: string, userId: string, organizationId: string, body: string) {
    const item = await this.em.findOne(WorkflowItem, { id: itemId, organization: organizationId });
    if (!item) {
      throw new NotFoundException('Workflow item not found');
    }
    const comment = this.em.create(WorkflowItemComment, {
      workflowItem: item,
      user: userId,
      body: body.trim(),
      organization: organizationId,
    } as any);
    await this.em.flush();
    await this.em.populate(comment, ['user'] as any);
    const u = comment.user as { id: string; email?: string; firstName?: string; lastName?: string };
    return {
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
      user: { id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName },
    };
  }

  async getDescendants(itemId: string): Promise<WorkflowItem[]> {
    const conn = this.em.getConnection();
    const result = await conn.execute(`
      WITH RECURSIVE descendants AS (
        SELECT * FROM workflow_items WHERE id = ?
        UNION ALL
        SELECT wi.* FROM workflow_items wi
        JOIN descendants d ON wi.parent_id = d.id
      )
      SELECT id FROM descendants WHERE id != ?
      ORDER BY depth, sort_order
    `, [itemId, itemId]);

    if (result.length === 0) return [];

    const ids = result.map((r: any) => r.id);
    return this.em.find(WorkflowItem, { id: { $in: ids } }, {
      orderBy: { depth: 'ASC', sortOrder: 'ASC' } as any,
      populate: ['assignedTo'] as any,
    });
  }

  private async refreshDepthRecursive(node: WorkflowItem): Promise<void> {
    const parentId = node.parent
      ? (typeof node.parent === 'object' ? node.parent.id : node.parent)
      : null;
    if (!parentId) {
      node.depth = 0;
    } else {
      const p = await this.em.findOneOrFail(WorkflowItem, parentId);
      node.depth = p.depth + 1;
    }
    const children = await this.em.find(WorkflowItem, { parent: node });
    for (const c of children) {
      await this.refreshDepthRecursive(c);
    }
  }

  async updateItem(
    id: string,
    dto: Partial<CreateWorkflowItemDto>,
    organizationId: string,
  ): Promise<WorkflowItem> {
    const item = await this.em.findOne(WorkflowItem, { id, organization: organizationId });
    if (!item) {
      throw new NotFoundException('Workflow item not found');
    }
    if (dto.title !== undefined) item.title = dto.title;
    if (dto.description !== undefined) item.description = dto.description;
    if (dto.kind !== undefined) item.kind = dto.kind;
    if (dto.actionType !== undefined) item.actionType = dto.actionType;
    if (dto.assignedToId !== undefined) {
      item.assignedTo = dto.assignedToId ? this.em.getReference(User, dto.assignedToId) : undefined;
    }
    if (dto.sortOrder !== undefined) item.sortOrder = dto.sortOrder;
    if (dto.startDate !== undefined) item.startDate = dto.startDate ? new Date(dto.startDate) : undefined;
    if (dto.dueDate !== undefined) item.dueDate = dto.dueDate ? new Date(dto.dueDate) : undefined;
    if (dto.requiresDocument !== undefined) item.requiresDocument = dto.requiresDocument;
    if (dto.isLegalDeadline !== undefined) item.isLegalDeadline = dto.isLegalDeadline;
    if (dto.documentTemplateId !== undefined) {
      item.documentTemplate = dto.documentTemplateId
        ? this.em.getReference(Document, dto.documentTemplateId)
        : undefined;
    }
    if (dto.metadata !== undefined) item.metadata = dto.metadata;
    if (dto.accentColor !== undefined) item.accentColor = dto.accentColor;
    if (dto.location !== undefined) item.location = dto.location;
    if (dto.priority !== undefined) item.priority = dto.priority;
    if (dto.allDay !== undefined) item.allDay = dto.allDay;
    if (dto.reminderMinutesBefore !== undefined) item.reminderMinutesBefore = dto.reminderMinutesBefore;
    if (dto.calendarColor !== undefined) item.calendarColor = dto.calendarColor;
    if (dto.rrule !== undefined) item.rrule = dto.rrule;
    if (dto.secondaryAssigneeIds !== undefined) {
      const m = { ...(item.metadata && typeof item.metadata === 'object' ? item.metadata : {}) };
      m.secondaryAssigneeIds = dto.secondaryAssigneeIds;
      item.metadata = m as Record<string, unknown>;
    }
    if (dto.workflowId !== undefined) {
      await this.workflowAssignment.applyWorkflowToLeafItem(id, dto.workflowId, organizationId);
    }
    await this.em.flush();
    return item;
  }

  async reorder(items: Array<{ id: string; sortOrder: number; parentId?: string }>): Promise<void> {
    const touchedRoots = new Set<string>();
    for (const { id, sortOrder, parentId } of items) {
      const item = await this.em.findOneOrFail(WorkflowItem, id);
      item.sortOrder = sortOrder;
      if (parentId !== undefined) {
        item.parent = parentId ? this.em.getReference(WorkflowItem, parentId) : undefined;
        touchedRoots.add(id);
      }
    }
    await this.em.flush();
    for (const id of touchedRoots) {
      const item = await this.em.findOneOrFail(WorkflowItem, id, {
        populate: ['parent'] as any,
      });
      await this.refreshDepthRecursive(item);
    }
    await this.em.flush();
  }
}
