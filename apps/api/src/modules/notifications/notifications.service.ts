import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Notification } from '@tracker/db';
import { BaseCrudService } from '../../common/services/base-crud.service';

@Injectable()
export class NotificationsService extends BaseCrudService<Notification> {
  constructor(em: EntityManager) {
    super(em, Notification);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.em.count(Notification, { user: userId, isRead: false });
  }

  async markAsRead(id: string): Promise<Notification> {
    const notification = await this.findOne(id);
    notification.isRead = true;
    notification.readAt = new Date();
    await this.em.flush();
    return notification;
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.em.nativeUpdate(
      Notification,
      { user: userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }
}
