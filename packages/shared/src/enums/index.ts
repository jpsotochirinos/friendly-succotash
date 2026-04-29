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

/** Persona natural vs jurídica en directorio de clientes (DNI / RUC, etc.). */
export enum ClientKind {
  /** No clasificado o datos legados. */
  UNKNOWN = 'unknown',
  NATURAL = 'natural',
  LEGAL = 'legal',
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

/** Denormalized bucket for expedientes list / KPI chips (persisted on `trackables`). */
export enum TrackableListingUrgency {
  OVERDUE = 'overdue',
  DUE_TODAY = 'due_today',
  DUE_WEEK = 'due_week',
  DUE_MONTH = 'due_month',
  NORMAL = 'normal',
  NO_DEADLINE = 'no_deadline',
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

export enum SignatureRequestStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum SignatureMode {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
}

export enum SignerStatus {
  PENDING = 'pending',
  NOTIFIED = 'notified',
  SIGNED = 'signed',
  DECLINED = 'declined',
}

export enum SignatureEventType {
  REQUEST_CREATED = 'request_created',
  NOTIFICATION_SENT = 'notification_sent',
  LINK_OPENED = 'link_opened',
  OTP_SENT = 'otp_sent',
  OTP_VERIFIED = 'otp_verified',
  SIGNATURE_PLACED = 'signature_placed',
  DECLINED = 'declined',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
}

// ============================================================================
// Legal process flow engine (procedural deadlines & stage advance)
// ============================================================================

export enum DeadlineType {
  NONE = 'none',
  FROM_NOTIFICATION = 'from_notification',
  FROM_STAGE_START = 'from_stage_start',
  FIXED_DATE = 'fixed_date',
}

export enum DeadlineCalendarType {
  JUDICIAL = 'judicial',
  CALENDAR = 'calendar',
  BUSINESS = 'business',
}

export enum DeadlineTriggerType {
  MANUAL = 'manual',
  SINOE = 'sinoe',
  STAGE_ENTERED = 'stage_entered',
}

export enum LegalDeadlineStatus {
  PENDING = 'pending',
  MET = 'met',
  OVERDUE = 'overdue',
  WAIVED = 'waived',
}

export enum AdvancedByType {
  MANUAL = 'manual',
  SINOE = 'sinoe',
  RULE = 'rule',
}

// =============================================================================
// Blueprint engine v2 (ProcessTrack, Stage/ActivityInstance, SinoeProposal)
// =============================================================================

export enum BlueprintScope {
  SYSTEM = 'system',
  TENANT = 'tenant',
  INSTANCE = 'instance',
}

export enum BlueprintTargetType {
  STAGE = 'stage',
  ACTIVITY = 'activity',
  DEADLINE_RULE = 'deadline_rule',
  DOCUMENT_SUGGESTION = 'document_suggestion',
  SINOE_RULE = 'sinoe_rule',
}

export enum BlueprintOverrideOperation {
  MODIFY = 'modify',
  ADD = 'add',
  REMOVE = 'remove',
  REORDER = 'reorder',
}

export enum ProcessTrackRole {
  PRIMARY = 'primary',
  ACCESSORY = 'accessory',
  APPEAL = 'appeal',
  CAUTELAR = 'cautelar',
  INCIDENTAL = 'incidental',
}

export enum ProcessTrackOutcome {
  WON = 'won',
  LOST = 'lost',
  SETTLED = 'settled',
  WITHDRAWN = 'withdrawn',
  DISMISSED = 'dismissed',
  ARCHIVED = 'archived',
}

export enum StageInstanceStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
}

/** Trigger for a `DeadlineRule` in v1: single target code per rule. */
export enum BlueprintDeadlineTrigger {
  STAGE_ENTERED = 'stage_entered',
  DOCUMENT_NOTIFIED = 'document_notified',
  ACTIVITY_COMPLETED = 'activity_completed',
}

export enum DeadlineDurationUnit {
  CALENDAR_DAYS = 'calendar_days',
  JUDICIAL_BUSINESS_DAYS = 'judicial_business_days',
}

export enum DeadlineOnExpiry {
  CREATE_ACTIVITY = 'create_activity',
  ADVANCE_STAGE = 'advance_stage',
  ALERT_ONLY = 'alert_only',
}

export enum DeadlineCriticality {
  INFO = 'info',
  ADVISORY = 'advisory',
  CRITICAL = 'critical',
}

export enum SinoeMatchMode {
  EXACT = 'exact',
  CONTAINS = 'contains',
  REGEX = 'regex',
}

export enum SinoeRuleAction {
  ADVANCE_TO_STAGE = 'advance_to_stage',
  CREATE_ACTIVITY = 'create_activity',
  TRIGGER_DEADLINE = 'trigger_deadline',
  NOTIFY_ONLY = 'notify_only',
}

export enum SinoeProposedAction {
  ADVANCE_STAGE = 'advance_stage',
  CREATE_ACTIVITY = 'create_activity',
  TRIGGER_DEADLINE = 'trigger_deadline',
  LINK_DOCUMENT = 'link_document',
}

export enum SinoeProposalStatus {
  PENDING = 'pending',
  UNMATCHED = 'unmatched',
  AUTO_APPLIED = 'auto_applied',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  REVERTED = 'reverted',
}

export enum ProcessTrackEventType {
  STAGE_ENTERED = 'stage_entered',
  STAGE_EXITED = 'stage_exited',
  STAGE_REOPENED = 'stage_reopened',
  STAGE_REVERTED = 'stage_reverted',
  STAGE_WORK_CLOSED = 'stage_work_closed',
  STAGE_WORK_REOPENED = 'stage_work_reopened',
  STAGE_INSTANCE_CREATED = 'stage_instance_created',
  ACTIVITY_CREATED = 'activity_created',
  ACTIVITY_COMPLETED = 'activity_completed',
  ACTIVITY_INHERITED = 'activity_inherited',
  ACTIVITY_CLOSED_SKIPPED = 'activity_closed_skipped',
  ACTIVITY_MOVED = 'activity_moved',
  DEADLINE_TRIGGERED = 'deadline_triggered',
  SINOE_PROPOSAL_APPLIED = 'sinoe_proposal_applied',
  SINOE_PROPOSAL_REVERTED = 'sinoe_proposal_reverted',
  OVERRIDE_APPLIED = 'override_applied',
  DEADLINE_OVERRIDDEN = 'deadline_overridden',
}

export enum ComputedDeadlineStatusV2 {
  PENDING = 'pending',
  MET = 'met',
  EXPIRED = 'expired',
  WAIVED = 'waived',
}

/** Suggested / classified document type for blueprints and UI. */
export enum BlueprintDocumentType {
  DEMANDA = 'demanda',
  RESOLUCION = 'resolucion',
  CEDULA_NOTIFICACION = 'cedula_notificacion',
  ESCRITO_CONTESTACION = 'escrito_contestacion',
  ACTA_AUDIENCIA = 'acta_audiencia',
  SENTENCIA = 'sentencia',
  OTRO = 'otro',
}
