import { Controller, Get, Patch, Param, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  async findAll(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('unreadOnly') unreadOnly?: boolean,
  ) {
    const filters: any = { user: userId };
    if (unreadOnly) filters.isRead = false;
    return this.service.findAll(filters, { page, limit }, {
      orderBy: { createdAt: 'DESC' } as any,
    });
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser('id') userId: string) {
    const count = await this.service.getUnreadCount(userId);
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    return this.service.markAsRead(id);
  }

  @Patch('read-all')
  async markAllAsRead(@CurrentUser('id') userId: string) {
    await this.service.markAllAsRead(userId);
    return { success: true };
  }
}
