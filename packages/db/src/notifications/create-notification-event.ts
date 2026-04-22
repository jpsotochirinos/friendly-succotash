import type { EntityManager } from '@mikro-orm/postgresql';
import { NotificationEvent } from '../entities/notification-event.entity';
import { NotificationRecipient } from '../entities/notification-recipient.entity';

export interface DirectRecipientInput {
  userId: string;
  /** assignee | owner | org_member */
  role: string;
}

export interface CreateNotificationEventParams {
  organizationId: string;
  trackableId?: string | null;
  type: string;
  title: string;
  message?: string | null;
  data?: Record<string, unknown> | null;
  dedupeKey?: string | null;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  /** At least one for meaningful delivery; deduped by userId (first role wins). */
  recipients: DirectRecipientInput[];
}

/**
 * Idempotent when dedupeKey is set: returns existing event if already present.
 */
export async function createNotificationEventWithRecipients(
  em: EntityManager,
  params: CreateNotificationEventParams,
): Promise<{ event: NotificationEvent; created: boolean }> {
  if (params.dedupeKey) {
    const existing = await em.findOne(NotificationEvent, {
      organization: params.organizationId,
      dedupeKey: params.dedupeKey,
    } as any);
    if (existing) {
      return { event: existing, created: false };
    }
  }

  const seen = new Map<string, string>();
  for (const r of params.recipients) {
    if (!seen.has(r.userId)) seen.set(r.userId, r.role);
  }
  if (seen.size === 0) {
    throw new Error('createNotificationEventWithRecipients: at least one recipient required');
  }

  const event = em.create(NotificationEvent, {
    organization: params.organizationId,
    trackable: params.trackableId || undefined,
    type: params.type,
    title: params.title,
    message: params.message ?? undefined,
    data: params.data ?? undefined,
    dedupeKey: params.dedupeKey ?? undefined,
    sourceEntityType: params.sourceEntityType ?? undefined,
    sourceEntityId: params.sourceEntityId ?? undefined,
  } as any);

  for (const [userId, role] of seen) {
    em.create(NotificationRecipient, {
      notificationEvent: event,
      user: em.getReference('User', userId) as any,
      role,
      isRead: false,
    } as any);
  }

  await em.flush();
  return { event, created: true };
}
