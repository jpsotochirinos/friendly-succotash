/**
 * Domain event names emitted by the API/worker for the ECA rule engine.
 * Keep in sync with emitters and RuleEngineService listeners.
 */
export const DomainEvents = {
  DOCUMENT_CREATED: 'document.created',
  DOCUMENT_UPDATED: 'document.updated',
  DOCUMENT_UPLOADED: 'document.uploaded',
  DOCUMENT_SUBMITTED: 'document.submitted',
  DOCUMENT_APPROVED: 'document.approved',
  DOCUMENT_REJECTED: 'document.rejected',

  WORKFLOW_ITEM_CREATED: 'workflow-item.created',
  WORKFLOW_ITEM_ASSIGNED: 'workflow-item.assigned',
  WORKFLOW_ITEM_COMMENT_ADDED: 'workflow-item.comment-added',
  WORKFLOW_ITEM_STATUS_CHANGED: 'workflow-item.status-changed',
  WORKFLOW_ITEM_DUE_DATE_NEAR: 'workflow-item.due-date-near',
  WORKFLOW_ITEM_OVERDUE: 'workflow-item.overdue',

  TRACKABLE_CREATED: 'trackable.created',
  TRACKABLE_STATUS_CHANGED: 'trackable.status-changed',

  TIME_DAILY_TICK: 'time.daily-tick',
  TIME_HOURLY_TICK: 'time.hourly-tick',

  SINOE_NOTIFICATION_RECEIVED: 'sinoe.notification-received',
  EXTERNAL_SCRAPE_FINISHED: 'external.scrape-finished',
} as const;

export type DomainEventName = (typeof DomainEvents)[keyof typeof DomainEvents];
