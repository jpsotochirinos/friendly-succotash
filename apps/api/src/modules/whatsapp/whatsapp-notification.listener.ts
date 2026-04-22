import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NOTIFICATION_CREATED_EVENT } from '@tracker/shared';
import {
  WhatsAppNotificationDispatcher,
  type NotificationCreatedWhatsAppPayload,
} from './services/whatsapp-notification-dispatcher.service';

@Injectable()
export class WhatsAppNotificationListener {
  constructor(private readonly dispatcher: WhatsAppNotificationDispatcher) {}

  @OnEvent(NOTIFICATION_CREATED_EVENT)
  async onNotificationCreated(payload: NotificationCreatedWhatsAppPayload): Promise<void> {
    await this.dispatcher.dispatchFromNotification(payload);
  }
}
