import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  Organization,
  WorkflowDefinition,
  WorkflowItem,
  WorkflowState,
  WorkflowTemplateItem,
  WorkflowTransition,
} from '@tracker/db';
import { ActionType, MatterType, WorkflowStateCategory } from '@tracker/shared';

@Injectable()
export class WorkflowDefinitionsService {
  constructor(private readonly em: EntityManager) {}

  async list(organizationId: string) {
    const system = await this.em.find(
      WorkflowDefinition,
      { isSystem: true, organization: null },
      { orderBy: { slug: 'ASC' } },
    );
    const orgOwned = await this.em.find(
      WorkflowDefinition,
      { organization: organizationId },
      { orderBy: { slug: 'ASC' } },
    );
    return [...system.map((w) => this.serializeList(w)), ...orgOwned.map((w) => this.serializeList(w))];
  }

  private serializeList(w: WorkflowDefinition) {
    return {
      id: w.id,
      slug: w.slug,
      name: w.name,
      description: w.description ?? null,
      matterType: w.matterType ?? null,
      actionType: (w as any).actionType ?? null,
      appliesToAllTypes: (w as any).appliesToAllTypes ?? false,
      jurisdiction: w.jurisdiction,
      isSystem: w.isSystem,
      isDefault: w.isDefault,
      organizationId: (w as any).organization?.id ?? null,
    };
  }

  async getOne(organizationId: string, id: string) {
    const w = await this.em.findOne(
      WorkflowDefinition,
      { id },
      { populate: ['organization', 'states', 'transitions'] as any },
    );
    if (!w) throw new NotFoundException('Workflow not found');
    this.assertCanRead(organizationId, w);

    const states = await this.em.find(
      WorkflowState,
      { workflow: w },
      { orderBy: { sortOrder: 'ASC', key: 'ASC' } as any },
    );
    const transitions = await this.em.find(
      WorkflowTransition,
      { workflow: w },
      { populate: ['fromState', 'toState'] as any, orderBy: { name: 'ASC' } as any },
    );

    return {
      ...this.serializeList(w),
      states: states.map((s) => ({
        id: s.id,
        key: s.key,
        name: s.name,
        category: s.category,
        color: s.color ?? null,
        sortOrder: s.sortOrder,
        isInitial: s.isInitial,
      })),
      transitions: transitions.map((t) => ({
        id: t.id,
        name: t.name,
        fromStateId: t.fromState ? (t.fromState as WorkflowState).id : null,
        fromKey: t.fromState ? (t.fromState as WorkflowState).key : null,
        toStateId: (t.toState as WorkflowState).id,
        toKey: (t.toState as WorkflowState).key,
        requiredPermission: t.requiredPermission ?? null,
      })),
    };
  }

  private assertCanRead(orgId: string, w: WorkflowDefinition) {
    if (w.isSystem && !w.organization) return;
    const oid = (w as any).organization?.id;
    if (oid && oid !== orgId) throw new ForbiddenException();
  }

  private assertCanWrite(orgId: string, w: WorkflowDefinition) {
    if (w.isSystem || !w.organization) {
      throw new ForbiddenException('System workflows are read-only');
    }
    if ((w as any).organization?.id !== orgId) throw new ForbiddenException();
  }

  async duplicateFromSystem(
    organizationId: string,
    sourceWorkflowId: string,
    slug: string,
    name: string,
  ) {
    const source = await this.em.findOneOrFail(
      WorkflowDefinition,
      { id: sourceWorkflowId, isSystem: true, organization: null },
      { populate: ['states'] as any },
    );

    const exists = await this.em.findOne(WorkflowDefinition, {
      organization: organizationId,
      slug,
    });
    if (exists) {
      throw new BadRequestException(`Workflow slug '${slug}' already exists for this organization`);
    }

    const org = this.em.getReference(Organization, organizationId);
    const now = new Date();
    const copy = this.em.create(WorkflowDefinition, {
      slug,
      name,
      description: `Copia de ${source.name}`,
      matterType: source.matterType,
      actionType: (source as any).actionType,
      appliesToAllTypes: (source as any).appliesToAllTypes ?? false,
      jurisdiction: source.jurisdiction,
      isSystem: false,
      isDefault: false,
      organization: org,
      createdAt: now,
      updatedAt: now,
    });

    const stateMap = new Map<string, WorkflowState>();
    const sourceStates = await this.em.find(WorkflowState, { workflow: source });
    for (const s of sourceStates) {
      const ns = this.em.create(WorkflowState, {
        workflow: copy,
        key: s.key,
        name: s.name,
        category: s.category,
        color: s.color,
        sortOrder: s.sortOrder,
        isInitial: s.isInitial,
        createdAt: now,
        updatedAt: now,
      });
      stateMap.set(s.id, ns);
    }

    const sourceTransitions = await this.em.find(
      WorkflowTransition,
      { workflow: source },
      { populate: ['fromState', 'toState'] as any },
    );
    for (const t of sourceTransitions) {
      const from = t.fromState ? stateMap.get((t.fromState as WorkflowState).id) : undefined;
      const to = stateMap.get((t.toState as WorkflowState).id);
      if (!to) continue;
      this.em.create(WorkflowTransition, {
        workflow: copy,
        fromState: from,
        toState: to,
        name: t.name,
        requiredPermission: t.requiredPermission,
        condition: t.condition,
        autoOnEvent: t.autoOnEvent,
        createdAt: now,
        updatedAt: now,
      });
    }

    await this.em.flush();
    return this.getOne(organizationId, copy.id);
  }

  async patchOrgWorkflow(
    organizationId: string,
    id: string,
    body: {
      name?: string;
      description?: string | null;
      matterType?: MatterType | null;
      actionType?: ActionType | null;
      appliesToAllTypes?: boolean;
    },
  ) {
    const w = await this.em.findOneOrFail(WorkflowDefinition, { id }, { populate: ['organization'] as any });
    this.assertCanWrite(organizationId, w);
    if (body.name !== undefined) w.name = body.name;
    if (body.description !== undefined) w.description = body.description ?? undefined;
    if (body.matterType !== undefined) w.matterType = body.matterType ?? undefined;
    if (body.actionType !== undefined) (w as any).actionType = body.actionType ?? undefined;
    if (body.appliesToAllTypes !== undefined) (w as any).appliesToAllTypes = body.appliesToAllTypes;
    await this.em.flush();
    return this.getOne(organizationId, id);
  }

  private async loadOrgWorkflowOrFail(organizationId: string, workflowId: string): Promise<WorkflowDefinition> {
    const w = await this.em.findOneOrFail(
      WorkflowDefinition,
      { id: workflowId },
      { populate: ['organization'] as any },
    );
    this.assertCanWrite(organizationId, w);
    return w;
  }

  private assertCategory(v: string): asserts v is WorkflowStateCategory {
    const vals = Object.values(WorkflowStateCategory) as string[];
    if (!vals.includes(v)) {
      throw new BadRequestException(`category must be one of: ${vals.join(', ')}`);
    }
  }

  async createState(
    organizationId: string,
    workflowId: string,
    body: {
      key: string;
      name: string;
      category: WorkflowStateCategory;
      color?: string | null;
      sortOrder?: number;
      isInitial?: boolean;
    },
  ) {
    const wf = await this.loadOrgWorkflowOrFail(organizationId, workflowId);
    const key = body.key.trim();
    if (!key) throw new BadRequestException('key is required');
    const dup = await this.em.findOne(WorkflowState, { workflow: wf, key });
    if (dup) throw new BadRequestException(`State key '${key}' already exists in this workflow`);
    this.assertCategory(body.category);
    const now = new Date();
    if (body.isInitial) {
      const others = await this.em.find(WorkflowState, { workflow: wf });
      for (const o of others) {
        o.isInitial = false;
        o.updatedAt = now;
      }
    }
    const st = this.em.create(WorkflowState, {
      workflow: wf,
      key,
      name: body.name.trim(),
      category: body.category,
      color: body.color ?? undefined,
      sortOrder: body.sortOrder ?? 0,
      isInitial: !!body.isInitial,
      createdAt: now,
      updatedAt: now,
    });
    await this.em.flush();
    return this.getOne(organizationId, workflowId);
  }

  async updateState(
    organizationId: string,
    workflowId: string,
    stateId: string,
    body: {
      key?: string;
      name?: string;
      category?: WorkflowStateCategory;
      color?: string | null;
      sortOrder?: number;
      isInitial?: boolean;
    },
  ) {
    const wf = await this.loadOrgWorkflowOrFail(organizationId, workflowId);
    const st = await this.em.findOne(WorkflowState, { id: stateId, workflow: wf });
    if (!st) throw new NotFoundException('State not found');
    const now = new Date();
    if (body.key !== undefined) {
      const k = body.key.trim();
      if (!k) throw new BadRequestException('key cannot be empty');
      const dup = await this.em.findOne(WorkflowState, { workflow: wf, key: k });
      if (dup && dup.id !== st.id) throw new BadRequestException(`State key '${k}' already exists`);
      st.key = k;
    }
    if (body.name !== undefined) st.name = body.name.trim();
    if (body.category !== undefined) {
      this.assertCategory(body.category);
      st.category = body.category;
    }
    if (body.color !== undefined) st.color = body.color ?? undefined;
    if (body.sortOrder !== undefined) st.sortOrder = body.sortOrder;
    if (body.isInitial === true) {
      const others = await this.em.find(WorkflowState, { workflow: wf });
      for (const o of others) {
        if (o.id !== st.id) {
          o.isInitial = false;
          o.updatedAt = now;
        }
      }
      st.isInitial = true;
    } else if (body.isInitial === false) {
      st.isInitial = false;
    }
    st.updatedAt = now;
    await this.em.flush();
    return this.getOne(organizationId, workflowId);
  }

  async deleteState(organizationId: string, workflowId: string, stateId: string) {
    const wf = await this.loadOrgWorkflowOrFail(organizationId, workflowId);
    const st = await this.em.findOne(WorkflowState, { id: stateId, workflow: wf });
    if (!st) throw new NotFoundException('State not found');
    const inUse = await this.em.count(WorkflowItem, { currentState: st } as any);
    if (inUse > 0) {
      throw new ConflictException(
        `Cannot delete state: ${inUse} workflow item(s) use this state as current_state`,
      );
    }
    const transitions = await this.em.find(
      WorkflowTransition,
      { workflow: wf },
      { populate: ['fromState', 'toState'] as any },
    );
    for (const t of transitions) {
      const fromId = t.fromState ? (t.fromState as WorkflowState).id : null;
      const toId = (t.toState as WorkflowState).id;
      if (fromId === st.id || toId === st.id) {
        this.em.remove(t);
      }
    }
    this.em.remove(st);
    await this.em.flush();
    return this.getOne(organizationId, workflowId);
  }

  async createTransition(
    organizationId: string,
    workflowId: string,
    body: { fromStateId: string; toStateId: string; name: string; requiredPermission?: string | null },
  ) {
    const wf = await this.loadOrgWorkflowOrFail(organizationId, workflowId);
    const from = await this.em.findOne(WorkflowState, { id: body.fromStateId, workflow: wf });
    const to = await this.em.findOne(WorkflowState, { id: body.toStateId, workflow: wf });
    if (!from || !to) throw new BadRequestException('fromStateId and toStateId must belong to this workflow');
    const existing = await this.em.findOne(WorkflowTransition, {
      workflow: wf,
      fromState: from,
      toState: to,
    });
    if (existing) throw new BadRequestException('A transition with the same from/to already exists');
    const now = new Date();
    this.em.create(WorkflowTransition, {
      workflow: wf,
      fromState: from,
      toState: to,
      name: body.name.trim(),
      requiredPermission: body.requiredPermission?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    });
    await this.em.flush();
    return this.getOne(organizationId, workflowId);
  }

  async updateTransition(
    organizationId: string,
    workflowId: string,
    transitionId: string,
    body: { name?: string; requiredPermission?: string | null },
  ) {
    const wf = await this.loadOrgWorkflowOrFail(organizationId, workflowId);
    const tr = await this.em.findOne(WorkflowTransition, { id: transitionId, workflow: wf });
    if (!tr) throw new NotFoundException('Transition not found');
    if (body.name !== undefined) tr.name = body.name.trim();
    if (body.requiredPermission !== undefined) tr.requiredPermission = body.requiredPermission?.trim() || undefined;
    tr.updatedAt = new Date();
    await this.em.flush();
    return this.getOne(organizationId, workflowId);
  }

  async deleteTransition(organizationId: string, workflowId: string, transitionId: string) {
    const wf = await this.loadOrgWorkflowOrFail(organizationId, workflowId);
    const tr = await this.em.findOne(WorkflowTransition, { id: transitionId, workflow: wf });
    if (!tr) throw new NotFoundException('Transition not found');
    this.em.remove(tr);
    await this.em.flush();
    return this.getOne(organizationId, workflowId);
  }

  async removeWorkflow(organizationId: string, workflowId: string) {
    const wf = await this.loadOrgWorkflowOrFail(organizationId, workflowId);
    const itemCount = await this.em.count(WorkflowItem, { workflow: wf } as any);
    const tplCount = await this.em.count(WorkflowTemplateItem, { workflow: wf } as any);
    if (itemCount > 0 || tplCount > 0) {
      throw new ConflictException({
        message: 'Workflow is in use',
        workflowItems: itemCount,
        templateItems: tplCount,
      });
    }
    const transitions = await this.em.find(WorkflowTransition, { workflow: wf });
    for (const t of transitions) this.em.remove(t);
    const states = await this.em.find(WorkflowState, { workflow: wf });
    for (const s of states) this.em.remove(s);
    this.em.remove(wf);
    await this.em.flush();
  }

  async duplicateFromOrg(
    organizationId: string,
    sourceWorkflowId: string,
    slug: string,
    name: string,
  ) {
    const source = await this.em.findOneOrFail(
      WorkflowDefinition,
      { id: sourceWorkflowId, organization: organizationId },
      { populate: ['states'] as any },
    );

    const exists = await this.em.findOne(WorkflowDefinition, {
      organization: organizationId,
      slug,
    });
    if (exists) {
      throw new BadRequestException(`Workflow slug '${slug}' already exists for this organization`);
    }

    const org = this.em.getReference(Organization, organizationId);
    const now = new Date();
    const copy = this.em.create(WorkflowDefinition, {
      slug,
      name,
      description: `Copia de ${source.name}`,
      matterType: source.matterType,
      actionType: (source as any).actionType,
      appliesToAllTypes: (source as any).appliesToAllTypes ?? false,
      jurisdiction: source.jurisdiction,
      isSystem: false,
      isDefault: false,
      organization: org,
      createdAt: now,
      updatedAt: now,
    });

    const stateMap = new Map<string, WorkflowState>();
    const sourceStates = await this.em.find(WorkflowState, { workflow: source });
    for (const s of sourceStates) {
      const ns = this.em.create(WorkflowState, {
        workflow: copy,
        key: s.key,
        name: s.name,
        category: s.category,
        color: s.color,
        sortOrder: s.sortOrder,
        isInitial: s.isInitial,
        createdAt: now,
        updatedAt: now,
      });
      stateMap.set(s.id, ns);
    }

    const sourceTransitions = await this.em.find(
      WorkflowTransition,
      { workflow: source },
      { populate: ['fromState', 'toState'] as any },
    );
    for (const t of sourceTransitions) {
      const from = t.fromState ? stateMap.get((t.fromState as WorkflowState).id) : undefined;
      const to = stateMap.get((t.toState as WorkflowState).id);
      if (!to) continue;
      this.em.create(WorkflowTransition, {
        workflow: copy,
        fromState: from,
        toState: to,
        name: t.name,
        requiredPermission: t.requiredPermission,
        condition: t.condition,
        autoOnEvent: t.autoOnEvent,
        createdAt: now,
        updatedAt: now,
      });
    }

    await this.em.flush();
    return this.getOne(organizationId, copy.id);
  }
}
