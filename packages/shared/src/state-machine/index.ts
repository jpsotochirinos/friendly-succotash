import {
  TrackableStatus,
  WorkflowItemStatus,
  DocumentReviewStatus,
} from '../enums/index';

export interface Transition<S> {
  from: S;
  to: S;
  requiredPermission?: string;
  label: string;
}

function createStateMachine<S>(transitions: Transition<S>[]) {
  return {
    transitions,
    getAvailableTransitions(currentStatus: S): Transition<S>[] {
      return transitions.filter((t) => t.from === currentStatus);
    },
    isValidTransition(from: S, to: S): Transition<S> | undefined {
      return transitions.find((t) => t.from === from && t.to === to);
    },
  };
}

export const TrackableStateMachine = createStateMachine<TrackableStatus>([
  { from: TrackableStatus.CREATED, to: TrackableStatus.ACTIVE, requiredPermission: 'trackable:update', label: 'Activate' },
  { from: TrackableStatus.ACTIVE, to: TrackableStatus.UNDER_REVIEW, requiredPermission: 'trackable:update', label: 'Send to review' },
  { from: TrackableStatus.UNDER_REVIEW, to: TrackableStatus.ACTIVE, requiredPermission: 'trackable:update', label: 'Return to active' },
  { from: TrackableStatus.UNDER_REVIEW, to: TrackableStatus.COMPLETED, requiredPermission: 'trackable:update', label: 'Complete' },
  { from: TrackableStatus.COMPLETED, to: TrackableStatus.ARCHIVED, requiredPermission: 'trackable:update', label: 'Archive' },
  { from: TrackableStatus.COMPLETED, to: TrackableStatus.ACTIVE, requiredPermission: 'trackable:update', label: 'Reopen' },
]);

/** @deprecated Prefer configurable workflows (`WorkflowDefinition` / `WorkflowEngineService`) when `useConfigurableWorkflows` is enabled. */
export const WorkflowItemStateMachine = createStateMachine<WorkflowItemStatus>([
  { from: WorkflowItemStatus.PENDING, to: WorkflowItemStatus.ACTIVE, requiredPermission: 'workflow:update', label: 'Activate' },
  { from: WorkflowItemStatus.ACTIVE, to: WorkflowItemStatus.IN_PROGRESS, requiredPermission: 'workflow:update', label: 'Start' },
  /** Allows submitting from ACTIVE without an explicit IN_PROGRESS step (e.g. rule-driven / short workflows). */
  { from: WorkflowItemStatus.ACTIVE, to: WorkflowItemStatus.UNDER_REVIEW, requiredPermission: 'workflow:update', label: 'Submit for review' },
  { from: WorkflowItemStatus.IN_PROGRESS, to: WorkflowItemStatus.UNDER_REVIEW, requiredPermission: 'workflow:update', label: 'Submit for review' },
  { from: WorkflowItemStatus.UNDER_REVIEW, to: WorkflowItemStatus.VALIDATED, requiredPermission: 'workflow:review', label: 'Validate' },
  { from: WorkflowItemStatus.UNDER_REVIEW, to: WorkflowItemStatus.REJECTED, requiredPermission: 'workflow:review', label: 'Reject' },
  { from: WorkflowItemStatus.VALIDATED, to: WorkflowItemStatus.CLOSED, requiredPermission: 'workflow:update', label: 'Close' },
  { from: WorkflowItemStatus.REJECTED, to: WorkflowItemStatus.IN_PROGRESS, requiredPermission: 'workflow:update', label: 'Rework' },
  { from: WorkflowItemStatus.PENDING, to: WorkflowItemStatus.SKIPPED, requiredPermission: 'workflow:update', label: 'Skip' },
  { from: WorkflowItemStatus.ACTIVE, to: WorkflowItemStatus.SKIPPED, requiredPermission: 'workflow:update', label: 'Skip' },
]);

export const DocumentReviewStateMachine = createStateMachine<DocumentReviewStatus>([
  { from: DocumentReviewStatus.DRAFT, to: DocumentReviewStatus.IN_REVIEW, requiredPermission: 'document:update', label: 'Submit for review' },
  { from: DocumentReviewStatus.IN_REVIEW, to: DocumentReviewStatus.APPROVED, requiredPermission: 'workflow:review', label: 'Approve' },
  { from: DocumentReviewStatus.IN_REVIEW, to: DocumentReviewStatus.REVISION_NEEDED, requiredPermission: 'workflow:review', label: 'Request revision' },
  { from: DocumentReviewStatus.REVISION_NEEDED, to: DocumentReviewStatus.DRAFT, requiredPermission: 'document:update', label: 'Return to draft' },
  { from: DocumentReviewStatus.APPROVED, to: DocumentReviewStatus.SUBMITTED, requiredPermission: 'document:update', label: 'Submit' },
]);

export const trackableTransitions = TrackableStateMachine.transitions;
export const workflowItemTransitions = WorkflowItemStateMachine.transitions;
export const documentReviewTransitions = DocumentReviewStateMachine.transitions;

export const getTrackableTransitions = TrackableStateMachine.getAvailableTransitions;
export const getWorkflowItemTransitions = WorkflowItemStateMachine.getAvailableTransitions;
export const getDocumentReviewTransitions = DocumentReviewStateMachine.getAvailableTransitions;
export const validateTrackableTransition = TrackableStateMachine.isValidTransition;
export const validateWorkflowItemTransition = WorkflowItemStateMachine.isValidTransition;
export const validateDocumentReviewTransition = DocumentReviewStateMachine.isValidTransition;
