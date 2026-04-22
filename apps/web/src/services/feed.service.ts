import { apiClient } from '@/api/client';

export type FeedItemKind = 'ALEGA_UPDATE' | 'LEGAL_NEWS' | 'LEGISLATION';

export interface FeedItem {
  id: string;
  kind: FeedItemKind;
  title: string;
  summary: string | null;
  content: string | null;
  url: string | null;
  sourceLabel: string | null;
  imageUrl: string | null;
  publishedAt: string;
  pinned: boolean;
}

export interface FeedListResponse {
  items: FeedItem[];
  nextCursor: string | null;
}

export async function listFeed(params: {
  kind?: FeedItemKind;
  cursor?: string;
  limit?: number;
}): Promise<FeedListResponse> {
  const { data } = await apiClient.get<FeedListResponse>('/feed', { params });
  return data;
}

export async function getFeedUnreadCount(): Promise<number> {
  const { data } = await apiClient.get<{ count: number }>('/feed/unread-count');
  return data.count;
}

export async function markFeedSeen(): Promise<void> {
  await apiClient.post('/feed/mark-seen');
}

export interface CreateFeedItemBody {
  kind: FeedItemKind;
  title: string;
  summary?: string;
  content?: string;
  url?: string;
  imageUrl?: string;
  pinned?: boolean;
  publishedAt?: string;
}

export async function createFeedItem(body: CreateFeedItemBody): Promise<FeedItem> {
  const { data } = await apiClient.post<FeedItem>('/feed/items', body);
  return data;
}

export interface FeedSourceRow {
  id: string;
  name: string;
  url: string;
  kind: FeedItemKind;
  active: boolean;
  lastFetchedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function listFeedSources(): Promise<FeedSourceRow[]> {
  const { data } = await apiClient.get<FeedSourceRow[]>('/feed/sources');
  return data;
}

export async function createFeedSource(body: {
  name: string;
  url: string;
  kind: FeedItemKind;
  active?: boolean;
}): Promise<FeedSourceRow> {
  const { data } = await apiClient.post<FeedSourceRow>('/feed/sources', body);
  return data;
}

export async function updateFeedSource(
  id: string,
  body: Partial<{ name: string; url: string; kind: FeedItemKind; active: boolean }>,
): Promise<FeedSourceRow> {
  const { data } = await apiClient.patch<FeedSourceRow>(`/feed/sources/${id}`, body);
  return data;
}

export async function deleteFeedSource(id: string): Promise<void> {
  await apiClient.delete(`/feed/sources/${id}`);
}
