import { Injectable } from '@nestjs/common';
import type { DomainEventName, WorkflowRuleDefinition } from '@tracker/shared';
import { WORKFLOW_CODE_RULES } from './code-defaults/workflow-code-rules';

@Injectable()
export class CodeDefaultsRegistry {
  private readonly byEvent = new Map<string, WorkflowRuleDefinition[]>();

  constructor() {
    for (const rule of WORKFLOW_CODE_RULES) {
      const list = this.byEvent.get(rule.event) ?? [];
      list.push(rule);
      this.byEvent.set(rule.event, list);
    }
    for (const [, list] of this.byEvent) {
      list.sort((a, b) => b.priority - a.priority);
    }
  }

  getRulesForEvent(event: DomainEventName): WorkflowRuleDefinition[] {
    return [...(this.byEvent.get(event) ?? [])];
  }
}
