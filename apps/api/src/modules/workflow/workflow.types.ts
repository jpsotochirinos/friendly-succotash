export interface WorkflowItemTransitionContext {
  organizationId: string;
  permissions: string[];
  /** Human actor; omit when `automation` is set. */
  userId?: string;
  automation?: {
    ruleId: string;
    ruleName?: string;
    source: 'code_rule' | 'db_rule' | 'template';
    triggerEvent?: string;
  };
}

export interface WorkflowTransitionContext {
  userId: string;
  organizationId: string;
  permissions: string[];
}
