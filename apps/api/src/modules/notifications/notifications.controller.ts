import { Controller, Get, Patch, Param, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: { id: string; organizationId: string; permissions?: string[] },
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('unreadOnly') unreadOnly?: boolean,
    @Query('type') type?: string,
    @Query('trackableId') trackableId?: string,
    @Query('onlyDirect') onlyDirect?: string,
  ) {
    const perms = user.permissions ?? [];
    return this.service.listInbox(user.id, user.organizationId, perms, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      unreadOnly: unreadOnly === true || (unreadOnly as unknown) === 'true',
      type,
      trackableId,
      onlyDirect: onlyDirect === 'true',
    });
  }

  @Get('unread-count')
  async unreadCount(
    @CurrentUser() user: { id: string; organizationId: string; permissions?: string[] },
  ) {
    const count = await this.service.getUnreadCount(
      user.id,
      user.organizationId,
      user.permissions ?? [],
    );
    return { count };
  }

  @Patch('read-all')
  async markAllAsRead(
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.service.markAllRead(user.id, user.organizationId);
    return { success: true };
  }

  /** `id` is notification event id */
  @Patch(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; organizationId: string; permissions?: string[] },
  ) {
    return this.service.markEventRead(id, user.id, user.organizationId, user.permissions ?? []);
  }
}
