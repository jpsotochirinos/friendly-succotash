import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { WorkflowRule } from '@tracker/db';
import type { CreateWorkflowRuleDto } from './dto/create-workflow-rule.dto';
import { RuleResolverService } from './rule-resolver.service';

export type { CreateWorkflowRuleDto };

@Injectable()
export class WorkflowRulesAdminService {
  constructor(
    private readonly em: EntityManager,
    private readonly resolver: RuleResolverService,
  ) {}

  async list(organizationId: string) {
    return this.em.find(WorkflowRule, { organization: organizationId } as any, {
      orderBy: { priority: 'DESC', name: 'ASC' } as any,
    });
  }

  async create(organizationId: string, dto: CreateWorkflowRuleDto) {
    const row = this.em.create(WorkflowRule, {
      organization: organizationId,
      name: dto.name,
      description: dto.description,
      event: dto.event,
      condition: dto.condition as any,
      action: dto.action as any,
      priority: dto.priority ?? 50,
      enabled: dto.enabled ?? true,
      scope: (dto.scope ?? 'org') as any,
      scopeId: dto.scopeId ?? undefined,
      actionTypes: dto.actionTypes ?? undefined,
    } as any);
    await this.em.flush();
    this.resolver.invalidateCache(organizationId);
    return row;
  }

  async update(organizationId: string, id: string, dto: Partial<CreateWorkflowRuleDto>) {
    const row = await this.em.findOne(WorkflowRule, { id, organization: organizationId } as any);
    if (!row) throw new NotFoundException('Rule not found');
    if (dto.name !== undefined) row.name = dto.name;
    if (dto.description !== undefined) row.description = dto.description;
    if (dto.event !== undefined) row.event = dto.event;
    if (dto.condition !== undefined) row.condition = dto.condition as any;
    if (dto.action !== undefined) row.action = dto.action as any;
    if (dto.priority !== undefined) row.priority = dto.priority;
    if (dto.enabled !== undefined) row.enabled = dto.enabled;
    if (dto.scope !== undefined) row.scope = dto.scope as any;
    if (dto.scopeId !== undefined) row.scopeId = dto.scopeId ?? undefined;
    if (dto.actionTypes !== undefined) row.actionTypes = dto.actionTypes ?? undefined;
    await this.em.flush();
    this.resolver.invalidateCache(organizationId);
    return row;
  }

  async remove(organizationId: string, id: string) {
    const row = await this.em.findOne(WorkflowRule, { id, organization: organizationId } as any);
    if (!row) throw new NotFoundException('Rule not found');
    await this.em.removeAndFlush(row);
    this.resolver.invalidateCache(organizationId);
  }
}
