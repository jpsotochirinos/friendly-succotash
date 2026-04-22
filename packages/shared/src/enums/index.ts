export enum TrackableStatus {
  CREATED = 'created',
  ACTIVE = 'active',
  UNDER_REVIEW = 'under_review',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

/** @deprecated Use free-text `kind` on WorkflowItem instead. Kept for migration / API compatibility. */
export enum WorkflowItemType {
  SERVICE = 'service',
  TASK = 'task',
  ACTION = 'action',
}

/** Rol de una parte procesal vinculada al expediente (además de cliente de firma / contraparte texto). */
export enum TrackablePartyRole {
  PLAINTIFF = 'plaintiff',
  DEFENDANT = 'defendant',
  THIRD_PARTY = 'third_party',
  ATTORNEY = 'attorney',
  OTHER = 'other',
}

export enum MatterType {
  LITIGATION = 'litigation',
  CORPORATE = 'corporate',
  LABOR = 'labor',
  FAMILY = 'family',
  TAX = 'tax',
  CRIMINAL = 'criminal',
  ADMINISTRATIVE = 'administrative',
  ADVISORY = 'advisory',
  REAL_ESTATE = 'real_estate',
  OTHER = 'other',
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

/** Semantic bucket for Kanban columns and terminal checks (configurable workflows). */
export enum WorkflowStateCategory {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  IN_REVIEW = 'in_review',
  DONE = 'done',
  CANCELLED = 'cancelled',
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
  /** Presentar escrito / escrito de demanda o recurso */
  FILE_BRIEF = 'file_brief',
  /** Programar audiencia */
  SCHEDULE_HEARING = 'schedule_hearing',
  /** Pago de tasa judicial / derechos */
  PAY_COURT_FEE = 'pay_court_fee',
  /** Notificar a contraparte / terceros */
  NOTIFY_PARTY = 'notify_party',
}

export enum ExternalSourceType {
  SOURCE_A = 'source_a',
  SOURCE_C = 'source_c',
  SINOE = 'sinoe',
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

export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  TRIALING = 'trialing',
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  PAID = 'paid',
  VOID = 'void',
}

export enum CreditTransactionReason {
  GRANT_MONTHLY = 'grant_monthly',
  TOPUP = 'topup',
  CONSUME_ASSISTANT = 'consume_assistant',
  ADJUST = 'adjust',
  REFUND = 'refund',
}

/** Canal de ingesta de un lote de importación. */
export enum ImportChannel {
  WEB_ZIP = 'web_zip',
  OAUTH_DRIVE = 'oauth_drive',
  OAUTH_ONEDRIVE = 'oauth_onedrive',
  OAUTH_SHAREPOINT = 'oauth_sharepoint',
  OAUTH_DROPBOX = 'oauth_dropbox',
  DESKTOP = 'desktop',
  ASSISTED = 'assisted',
}

/** Estado del lote de importación. */
export enum ImportBatchStatus {
  CREATED = 'created',
  /** Plan del wizard confirmado en servidor; listo para subir archivos vía TUS. */
  PLAN_READY = 'plan_ready',
  INGESTING = 'ingesting',
  ANALYZING = 'analyzing',
  CLASSIFYING = 'classifying',
  MAPPING = 'mapping',
  READY_FOR_REVIEW = 'ready_for_review',
  COMMITTING = 'committing',
  COMMITTED = 'committed',
  REVERTED = 'reverted',
  FAILED = 'failed',
}

/** Estado por ítem de archivo en staging. */
export enum ImportItemStatus {
  QUEUED = 'queued',
  /** Reservado: ítem planificado antes de ingesta (extensiones futuras del worker). */
  PLANNED = 'planned',
  ANALYZED = 'analyzed',
  CLASSIFIED = 'classified',
  MAPPED = 'mapped',
  COMMITTED = 'committed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

export enum WhatsAppProviderEnum {
  TWILIO = 'twilio',
  DIALOG360 = 'dialog360',
  META = 'meta',
}

export enum ActivitySuggestionStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  IGNORED = 'ignored',
}

export enum WhatsAppMessageDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}
