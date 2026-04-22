import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { FeedItem, FeedItemKind, FeedSource, UserFeedRead } from '@tracker/db';
import { ListFeedQueryDto } from './dto/list-feed-query.dto';
import { CreateFeedItemDto } from './dto/create-feed-item.dto';
import { UpdateFeedItemDto } from './dto/update-feed-item.dto';
import { CreateFeedSourceDto } from './dto/create-feed-source.dto';
import { UpdateFeedSourceDto } from './dto/update-feed-source.dto';

const DEFAULT_UNREAD_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class FeedService {
  constructor(private readonly em: EntityManager) {}

  private defaultItemUrl(itemId: string): string {
    const base = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    return `${base}/novedades?item=${encodeURIComponent(itemId)}`;
  }

  private encodeCursor(item: FeedItem): string {
    return Buffer.from(
      JSON.stringify({
        p: item.pinned,
        t: item.publishedAt.getTime(),
        i: item.id,
      }),
      'utf8',
    ).toString('base64url');
  }

  private decodeCursor(cursor: string): { pinned: boolean; publishedAt: Date; id: string } {
    try {
      const j = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
        p: boolean;
        t: number;
        i: string;
      };
      return { pinned: Boolean(j.p), publishedAt: new Date(j.t), id: j.i };
    } catch {
      throw new BadRequestException('Invalid cursor');
    }
  }

  serializeItem(fi: FeedItem) {
    return {
      id: fi.id,
      kind: fi.kind,
      title: fi.title,
      summary: fi.summary ?? null,
      content: fi.content ?? null,
      url: fi.url ?? null,
      sourceLabel: fi.sourceLabel ?? null,
      imageUrl: fi.imageUrl ?? null,
      publishedAt: fi.publishedAt.toISOString(),
      pinned: fi.pinned,
    };
  }

  async list(dto: ListFeedQueryDto) {
    const limit = dto.limit ?? 20;
    const qb = this.em.createQueryBuilder(FeedItem, 'fi');
    qb
      .orderBy({ 'fi.pinned': 'DESC', 'fi.publishedAt': 'DESC', 'fi.id': 'DESC' })
      .limit(limit + 1);

    if (dto.kind) {
      qb.andWhere({ kind: dto.kind });
    }

    if (dto.cursor) {
      const c = this.decodeCursor(dto.cursor);
      qb.andWhere(
        `("fi"."pinned" = false AND ? = true) OR ("fi"."pinned" = ? AND "fi"."published_at" < ?) OR ("fi"."pinned" = ? AND "fi"."published_at" = ? AND "fi"."id"::text < ?::text)`,
        [c.pinned, c.pinned, c.publishedAt, c.pinned, c.publishedAt, c.id],
      );
    }

    const items = await qb.getResultList();
    const hasMore = items.length > limit;
    const slice = hasMore ? items.slice(0, limit) : items;
    const nextCursor =
      hasMore && slice.length > 0 ? this.encodeCursor(slice[slice.length - 1]!) : null;

    return {
      items: slice.map((i) => this.serializeItem(i)),
      nextCursor,
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    const row = await this.em.findOne(UserFeedRead, { userId });
    const weekAgo = new Date(Date.now() - DEFAULT_UNREAD_WINDOW_MS);
    const since = row?.lastSeenAt ?? weekAgo;
    return this.em.count(FeedItem, { publishedAt: { $gt: since } });
  }

  async markSeen(userId: string): Promise<void> {
    const now = new Date();
    let row = await this.em.findOne(UserFeedRead, { userId });
    if (!row) {
      row = this.em.create(UserFeedRead, { userId, lastSeenAt: now });
    } else {
      row.lastSeenAt = now;
    }
    await this.em.flush();
  }

  async createItem(dto: CreateFeedItemDto): Promise<FeedItem> {
    const publishedAt = dto.publishedAt ? new Date(dto.publishedAt) : new Date();
    const item = this.em.create(FeedItem, {
      kind: dto.kind,
      title: dto.title,
      summary: dto.summary,
      content: dto.content,
      url: dto.url ?? null,
      sourceLabel: dto.sourceLabel ?? (dto.kind === FeedItemKind.ALEGA_UPDATE ? 'Alega' : undefined),
      imageUrl: dto.imageUrl,
      publishedAt,
      pinned: dto.pinned ?? false,
    } as any);
    await this.em.flush();

    if (!item.url) {
      item.url = this.defaultItemUrl(item.id);
      await this.em.flush();
    }

    return item;
  }

  async updateItem(id: string, dto: UpdateFeedItemDto): Promise<FeedItem> {
    const item = await this.em.findOne(FeedItem, { id });
    if (!item) throw new NotFoundException('Feed item not found');
    if (dto.kind !== undefined) item.kind = dto.kind;
    if (dto.title !== undefined) item.title = dto.title;
    if (dto.summary !== undefined) item.summary = dto.summary;
    if (dto.content !== undefined) item.content = dto.content;
    if (dto.url !== undefined) item.url = dto.url;
    if (dto.sourceLabel !== undefined) item.sourceLabel = dto.sourceLabel;
    if (dto.imageUrl !== undefined) item.imageUrl = dto.imageUrl;
    if (dto.publishedAt !== undefined) item.publishedAt = new Date(dto.publishedAt);
    if (dto.pinned !== undefined) item.pinned = dto.pinned;
    await this.em.flush();
    return item;
  }

  async deleteItem(id: string): Promise<void> {
    const item = await this.em.findOne(FeedItem, { id });
    if (!item) throw new NotFoundException('Feed item not found');
    await this.em.removeAndFlush(item);
  }

  async listSources(): Promise<FeedSource[]> {
    return this.em.find(FeedSource, {}, { orderBy: { name: 'ASC' } });
  }

  async createSource(dto: CreateFeedSourceDto): Promise<FeedSource> {
    const src = this.em.create(FeedSource, {
      name: dto.name,
      url: dto.url,
      kind: dto.kind,
      active: dto.active ?? true,
    } as any);
    await this.em.flush();
    return src;
  }

  async updateSource(id: string, dto: UpdateFeedSourceDto): Promise<FeedSource> {
    const src = await this.em.findOne(FeedSource, { id });
    if (!src) throw new NotFoundException('Feed source not found');
    if (dto.name !== undefined) src.name = dto.name;
    if (dto.url !== undefined) src.url = dto.url;
    if (dto.kind !== undefined) src.kind = dto.kind;
    if (dto.active !== undefined) src.active = dto.active;
    await this.em.flush();
    return src;
  }

  async deleteSource(id: string): Promise<void> {
    const src = await this.em.findOne(FeedSource, { id });
    if (!src) throw new NotFoundException('Feed source not found');
    await this.em.removeAndFlush(src);
  }
}
