export enum TrackableStatus {
  CREATED = 'created',
  ACTIVE = 'active',
  UNDER_REVIEW = 'under_review',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

export enum WorkflowItemType {
  SERVICE = 'service',
  TASK = 'task',
  ACTION = 'action',
}

export enum WorkflowItemStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  IN_PROGRESS = 'in_progress',
  UNDER_REVIEW = 'under_review',
  VALIDATED = 'validated',
  CLOSED = 'closed',
  SKIPPED = 'skipped',
  REJECTED = 'rejected',
}

export enum DocumentReviewStatus {
  DRAFT = 'draft',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  SUBMITTED = 'submitted',
  REVISION_NEEDED = 'revision_needed',
}

export enum ActionType {
  DOC_CREATION = 'doc_creation',
  DOC_UPLOAD = 'doc_upload',
  APPROVAL = 'approval',
  DATA_ENTRY = 'data_entry',
  EXTERNAL_CHECK = 'external_check',
  NOTIFICATION = 'notification',
  GENERIC = 'generic',
}

export enum ExternalSourceType {
  SOURCE_A = 'source_a',
  SOURCE_C = 'source_c',
}

export enum EvaluationResult {
  PASSED = 'passed',
  FAILED = 'failed',
  PENDING = 'pending',
}

export enum PlanTier {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
}
