import { WorkflowItemStatus } from '../enums/index';
import { createStateMachine, type Transition } from './types';

const transitions: Transition<WorkflowItemStatus>[] = [
  { from: WorkflowItemStatus.PENDING, to: WorkflowItemStatus.ACTIVE, label: 'Start' },
  { from: WorkflowItemStatus.PENDING, to: WorkflowItemStatus.SKIPPED, label: 'Skip', requiredPermission: 'workflow:skip' },
  { from: WorkflowItemStatus.ACTIVE, to: WorkflowItemStatus.IN_PROGRESS, label: 'Begin work' },
  { from: WorkflowItemStatus.ACTIVE, to: WorkflowItemStatus.UNDER_REVIEW, label: 'Submit for review' },
  { from: WorkflowItemStatus.IN_PROGRESS, to: WorkflowItemStatus.UNDER_REVIEW, label: 'Submit for review' },
  { from: WorkflowItemStatus.UNDER_REVIEW, to: WorkflowItemStatus.VALIDATED, label: 'Validate', requiredPermission: 'workflow:validate' },
  { from: WorkflowItemStatus.UNDER_REVIEW, to: WorkflowItemStatus.REJECTED, label: 'Reject', requiredPermission: 'workflow:reject' },
  { from: WorkflowItemStatus.REJECTED, to: WorkflowItemStatus.IN_PROGRESS, label: 'Rework' },
  { from: WorkflowItemStatus.VALIDATED, to: WorkflowItemStatus.CLOSED, label: 'Close', requiredPermission: 'workflow:close' },
];

export const WorkflowItemStateMachine = createStateMachine(WorkflowItemStatus.PENDING, transitions);
