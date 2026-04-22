import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { FeedService } from './feed.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { ListFeedQueryDto } from './dto/list-feed-query.dto';
import { CreateFeedItemDto } from './dto/create-feed-item.dto';
import { UpdateFeedItemDto } from './dto/update-feed-item.dto';
import { CreateFeedSourceDto } from './dto/create-feed-source.dto';
import { UpdateFeedSourceDto } from './dto/update-feed-source.dto';

@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  @RequirePermissions('feed:read')
  async list(@Query() query: ListFeedQueryDto) {
    return this.feedService.list(query);
  }

  @Get('unread-count')
  @RequirePermissions('feed:read')
  async unreadCount(@CurrentUser() user: { id: string }) {
    const count = await this.feedService.getUnreadCount(user.id);
    return { count };
  }

  @Post('mark-seen')
  @RequirePermissions('feed:read')
  async markSeen(@CurrentUser() user: { id: string }) {
    await this.feedService.markSeen(user.id);
    return { success: true };
  }

  @Get('sources')
  @RequirePermissions('feed:manage')
  async listSources() {
    const rows = await this.feedService.listSources();
    return rows.map((s) => ({
      id: s.id,
      name: s.name,
      url: s.url,
      kind: s.kind,
      active: s.active,
      lastFetchedAt: s.lastFetchedAt?.toISOString() ?? null,
      lastError: s.lastError ?? null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));
  }

  @Post('sources')
  @RequirePermissions('feed:manage')
  async createSource(@Body() dto: CreateFeedSourceDto) {
    const s = await this.feedService.createSource(dto);
    return {
      id: s.id,
      name: s.name,
      url: s.url,
      kind: s.kind,
      active: s.active,
      lastFetchedAt: null,
      lastError: null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  }

  @Patch('sources/:id')
  @RequirePermissions('feed:manage')
  async updateSource(@Param('id') id: string, @Body() dto: UpdateFeedSourceDto) {
    const s = await this.feedService.updateSource(id, dto);
    return {
      id: s.id,
      name: s.name,
      url: s.url,
      kind: s.kind,
      active: s.active,
      lastFetchedAt: s.lastFetchedAt?.toISOString() ?? null,
      lastError: s.lastError ?? null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  }

  @Delete('sources/:id')
  @RequirePermissions('feed:manage')
  async deleteSource(@Param('id') id: string) {
    await this.feedService.deleteSource(id);
    return { success: true };
  }

  @Post('items')
  @RequirePermissions('feed:manage')
  async createItem(@Body() dto: CreateFeedItemDto) {
    const item = await this.feedService.createItem(dto);
    return this.feedService.serializeItem(item);
  }

  @Patch('items/:id')
  @RequirePermissions('feed:manage')
  async updateItem(@Param('id') id: string, @Body() dto: UpdateFeedItemDto) {
    const item = await this.feedService.updateItem(id, dto);
    return this.feedService.serializeItem(item);
  }

  @Delete('items/:id')
  @RequirePermissions('feed:manage')
  async deleteItem(@Param('id') id: string) {
    await this.feedService.deleteItem(id);
    return { success: true };
  }
}
