import type { NotificationSeverity, NotificationType, SinoeAssignmentStatus } from './constants';

/** Payload JSON en NotificationEvent.data — extensible por tipo */
export interface NotificationEventDataBase {
  severity?: NotificationSeverity;
  /** Quién disparó el evento para UI */
  source?: string;
  workflowItemId?: string;
  actionType?: string;
  kind?: string;
  /** ISO date string (solo fecha) */
  dueDate?: string;
  /** Ruta sugerida en la SPA */
  route?: { name: string; params?: Record<string, string> };
}

export interface DeadlineReminderData extends NotificationEventDataBase {
  severity: NotificationSeverity;
  source: string;
  workflowItemId: string;
  dueDate?: string;
}

export interface ExternalWorkflowItemData extends NotificationEventDataBase {
  source: string;
  workflowItemId: string;
  scrapeSource?: string;
}

/**
 * `NotificationEvent.data` cuando `type === sinoe_notification`.
 * Incluye metadatos para inbox / futura UI de “asignar expediente”.
 */
export interface SinoeNotificationInboxData extends NotificationEventDataBase {
  /** Debe coincidir con `NOTIFICATION_SOURCE.SCRAPE_SINOE` */
  source: string;
  sinoeNotificationId: string;
  nroNotificacion: string;
  nroExpediente: string;
  assignmentStatus: SinoeAssignmentStatus;
  workflowItemId?: string;
}

export type NotificationEventData =
  | NotificationEventDataBase
  | DeadlineReminderData
  | ExternalWorkflowItemData
  | SinoeNotificationInboxData;

/** Respuesta API enriquecida para inbox */
export interface NotificationInboxItem {
  id: string;
  type: NotificationType | string;
  title: string;
  message: string | null;
  createdAt: string;
  trackableId: string | null;
  trackableTitle: string | null;
  data: Record<string, unknown> | null;
  /** Usuario actual tiene rol directo (asignado/dueño del expediente) */
  isDirect: boolean;
  recipientRole: string | null;
  isRead: boolean;
  readAt: string | null;
}
