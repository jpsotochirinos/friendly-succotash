import { describe, it, expect, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { WhatsAppNotificationDispatcher } from './whatsapp-notification-dispatcher.service';
import { WhatsAppNotificationService } from './whatsapp-notification.service';

describe('WhatsAppNotificationDispatcher', () => {
  it('does not send when org.settings.notifications.whatsappEnabled is false', async () => {
    const send = vi.fn();
    const notify = { send } as unknown as WhatsAppNotificationService;
    const config = {
      get: (k: string) => (k === 'FRONTEND_URL' ? 'http://localhost:5173' : undefined),
    } as unknown as ConfigService;

    const findOne = vi.fn(async (_entity: unknown, where: { id?: string }) => {
      if (where?.id === 'org-1') {
        return {
          id: 'org-1',
          settings: { notifications: { whatsappEnabled: false } },
        };
      }
      return null;
    });

    const em = {
      fork: () => em,
      findOne,
    } as any;

    const d = new WhatsAppNotificationDispatcher(em, notify, config);
    await d.dispatchFromNotification({
      params: {
        organizationId: 'org-1',
        type: 'calendar_reminder',
        title: 'T',
        message: 'M',
        recipients: [{ userId: 'u1', role: 'assignee' }],
      },
      whatsapp: { eventType: 'calendar_reminder' },
    });

    expect(send).not.toHaveBeenCalled();
  });
});
