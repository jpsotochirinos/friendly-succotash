/** Domain event type strings stored on NotificationEvent.type */
export const NOTIFICATION_TYPES = {
  /** Solicitud de firma digital pendiente (destinatario interno) */
  SIGNATURE_REQUEST: 'signature_request',
  /** Plazo / recordatorio generado por el scheduler */
  DEADLINE_REMINDER: 'deadline_reminder',
  /** Ítem creado desde fuente externa (scraping, etc.) */
  WORKFLOW_ITEM_FROM_EXTERNAL: 'workflow_item_from_external',
  /** Expediente listo para revisión (cascade workflow) */
  TRACKABLE_REVIEW: 'trackable_review',
  /**
   * Notificación PJ scrapeada (SINOE): siempre al usuario con credenciales.
   * `data.assignmentStatus` indica si hace falta vincular expediente o asignado.
   */
  SINOE_NOTIFICATION: 'sinoe_notification',
} as const;

/** Estado de vinculación con expediente Alega (worker + UI posterior). */
export const SINOE_ASSIGNMENT_STATUS = {
  /** Expediente encontrado, diligencia creada y expediente con responsable */
  LINKED: 'linked',
  /** No hay expediente en Alega con ese nº — el usuario debe crear o vincular */
  NEEDS_EXPEDIENTE: 'needs_expediente',
  /** Expediente existe y hay tarea SINOE, pero el expediente no tiene asignado */
  NEEDS_ASSIGNEE: 'needs_assignee',
} as const;

export type SinoeAssignmentStatus =
  (typeof SINOE_ASSIGNMENT_STATUS)[keyof typeof SINOE_ASSIGNMENT_STATUS];

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

/** Rol del destinatario respecto al evento */
export const NOTIFICATION_RECIPIENT_ROLES = {
  ASSIGNEE: 'assignee',
  OWNER: 'owner',
  /** Usuario con trackable:read que ve el evento sin ser directo */
  ORG_MEMBER: 'org_member',
} as const;

export type NotificationRecipientRole =
  (typeof NOTIFICATION_RECIPIENT_ROLES)[keyof typeof NOTIFICATION_RECIPIENT_ROLES];

/** Severidad lógica (va en data.severity) */
export const NOTIFICATION_SEVERITY = {
  UPCOMING: 'upcoming',
  DUE_TODAY: 'due_today',
  OVERDUE: 'overdue',
  INFO: 'info',
} as const;

export type NotificationSeverity =
  (typeof NOTIFICATION_SEVERITY)[keyof typeof NOTIFICATION_SEVERITY];

/** Origen del evento (data.source) */
export const NOTIFICATION_SOURCE = {
  SCHEDULER: 'scheduler',
  SCRAPE_SOURCE_A: 'scrape:source_a',
  SCRAPE_SOURCE_C: 'scrape:source_c',
  SCRAPE_SINOE: 'scrape:sinoe',
  WORKFLOW: 'workflow',
} as const;
