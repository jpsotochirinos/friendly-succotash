import { ActionType, MatterType, WorkflowItemStatus, WorkflowStateCategory } from '../enums/index';

const JUDICIAL_MATTER_TYPES = new Set<MatterType>([
  MatterType.LITIGATION,
  MatterType.CRIMINAL,
  MatterType.ADMINISTRATIVE,
  MatterType.FAMILY,
  MatterType.LABOR,
  MatterType.TAX,
  MatterType.REAL_ESTATE,
]);

/** Slug del workflow sistema por defecto según materia (sin ActionType en la actividad). */
export function matterFallbackWorkflowSlug(matterType: MatterType | undefined): 'standard-judicial-pe' | 'standard-office' {
  if (matterType && JUDICIAL_MATTER_TYPES.has(matterType)) return 'standard-judicial-pe';
  return 'standard-office';
}

/** Slug estable del workflow sistema ligado a un ActionType (`workflows.slug` en seed). */
export function systemWorkflowSlugForActionType(actionType: ActionType): string {
  return `action-${actionType}-default`;
}

/** Columna Kanban unificada cuando no hay `currentState` (motor legacy). */
export function legacyWorkflowCategoryForStatus(status: WorkflowItemStatus | string): WorkflowStateCategory {
  const s = status as WorkflowItemStatus;
  switch (s) {
    case WorkflowItemStatus.PENDING:
    case WorkflowItemStatus.ACTIVE:
      return WorkflowStateCategory.TODO;
    case WorkflowItemStatus.IN_PROGRESS:
      return WorkflowStateCategory.IN_PROGRESS;
    case WorkflowItemStatus.UNDER_REVIEW:
      return WorkflowStateCategory.IN_REVIEW;
    case WorkflowItemStatus.VALIDATED:
    case WorkflowItemStatus.CLOSED:
      return WorkflowStateCategory.DONE;
    case WorkflowItemStatus.SKIPPED:
    case WorkflowItemStatus.REJECTED:
      return WorkflowStateCategory.CANCELLED;
    default:
      return WorkflowStateCategory.TODO;
  }
}
