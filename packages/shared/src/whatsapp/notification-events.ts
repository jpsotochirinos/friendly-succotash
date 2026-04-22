/** Keys for whatsapp_event_opt_in and WhatsApp dispatcher (align UI toggles). */
export const WHATSAPP_NOTIFICATION_EVENT_TYPES = [
  'calendar_reminder',
  'deadlines',
  'mention',
  'assignment',
  'document_shared',
  'briefing',
] as const;

export type WhatsAppNotificationEventType = (typeof WHATSAPP_NOTIFICATION_EVENT_TYPES)[number];

/** Map in-app notification_event.type → opt-in bucket (fallback: null = no WhatsApp). */
export function notificationTypeToWhatsAppEventType(
  notificationType: string,
): WhatsAppNotificationEventType | null {
  if (notificationType === 'calendar_reminder') return 'calendar_reminder';
  if (
    notificationType.includes('deadline')
    || notificationType === 'deadline_digest'
    || notificationType === 'deadline_reminder'
  ) {
    return 'deadlines';
  }
  if (notificationType.includes('mention')) return 'mention';
  if (notificationType.includes('assign')) return 'assignment';
  if (notificationType.includes('document') && notificationType.includes('share')) {
    return 'document_shared';
  }
  return null;
}
