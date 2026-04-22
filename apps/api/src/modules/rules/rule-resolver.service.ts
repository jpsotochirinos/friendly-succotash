import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { DomainEventName, WorkflowRuleDefinition } from '@tracker/shared';
import { WorkflowRule } from '@tracker/db';
import type { WorkflowItem } from '@tracker/db';
import { CodeDefaultsRegistry } from './code-defaults-registry.service';

/** Simple LRU-ish cache: orgId+event -> rules list */
const MAX_CACHE = 200;

@Injectable()
export class RuleResolverService {
  private cache = new Map<string, { rules: WorkflowRuleDefinition[]; at: number }>();

  constructor(
    private readonly em: EntityManager,
    private readonly codeDefaults: CodeDefaultsRegistry,
  ) {}

  invalidateCache(organizationId?: string): void {
    if (!organizationId) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${organizationId}:`)) this.cache.delete(key);
    }
  }

  async resolveRules(
    event: DomainEventName,
    organizationId: string,
    _item: WorkflowItem,
  ): Promise<WorkflowRuleDefinition[]> {
    const key = `${organizationId}:${event}`;
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < 60_000) {
      return hit.rules;
    }

    const codeRules = this.codeDefaults.getRulesForEvent(event);
    const rows = await this.em.find(WorkflowRule, {
      organization: organizationId,
      event,
      enabled: true,
    } as any);

    const dbRules: WorkflowRuleDefinition[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? undefined,
      event: r.event as DomainEventName,
      actionTypes: r.actionTypes as any,
      condition: r.condition as any,
      action: r.action as any,
      priority: r.priority,
      enabled: r.enabled,
    }));

    const merged = [...dbRules, ...codeRules].sort((a, b) => b.priority - a.priority);
    this.evictIfNeeded();
    this.cache.set(key, { rules: merged, at: Date.now() });
    return merged;
  }

  private evictIfNeeded(): void {
    if (this.cache.size <= MAX_CACHE) return;
    const first = this.cache.keys().next().value;
    if (first) this.cache.delete(first);
  }
}
