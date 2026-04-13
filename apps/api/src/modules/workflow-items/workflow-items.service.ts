import { Injectable, BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { WorkflowItem } from '@tracker/db';
import { WorkflowItemStatus, MAX_WORKFLOW_DEPTH } from '@tracker/shared';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { CreateWorkflowItemDto } from './dto/create-workflow-item.dto';

@Injectable()
export class WorkflowItemsService extends BaseCrudService<WorkflowItem> {
  constructor(em: EntityManager) {
    super(em, WorkflowItem);
  }

  async createItem(
    dto: CreateWorkflowItemDto,
    organizationId: string,
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

    const item = this.em.create(WorkflowItem, {
      trackable: dto.trackableId,
      parent: dto.parentId || undefined,
      title: dto.title,
      description: dto.description,
      itemType: dto.itemType,
      actionType: dto.actionType,
      status: WorkflowItemStatus.PENDING,
      assignedTo: dto.assignedToId || undefined,
      sortOrder: dto.sortOrder || 0,
      depth,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      requiresDocument: dto.requiresDocument || false,
      documentTemplate: dto.documentTemplateId || undefined,
      organization: organizationId,
    } as any);

    await this.em.flush();
    return item;
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

  async reorder(items: Array<{ id: string; sortOrder: number; parentId?: string }>): Promise<void> {
    for (const { id, sortOrder, parentId } of items) {
      const item = await this.em.findOneOrFail(WorkflowItem, id);
      item.sortOrder = sortOrder;
      if (parentId !== undefined) {
        item.parent = parentId ? this.em.getReference(WorkflowItem, parentId) : undefined;
      }
    }
    await this.em.flush();
  }
}
