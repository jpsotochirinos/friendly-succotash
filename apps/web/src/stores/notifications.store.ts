import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { makeAuthFetch } from '@/utils/makeAuthFetch';

export interface InboxItem {
  id: string;
  type: string;
  title: string;
  message: string | null;
  createdAt: string;
  trackableId: string | null;
  trackableTitle: string | null;
  data: Record<string, unknown> | null;
  isDirect: boolean;
  recipientRole: string | null;
  isRead: boolean;
  readAt: string | null;
}

export const useNotificationsStore = defineStore('notifications', () => {
  const fetchAuth = makeAuthFetch();
  const items = ref<InboxItem[]>([]);
  const total = ref(0);
  const page = ref(1);
  const limit = ref(20);
  const loading = ref(false);
  const unreadCount = ref(0);
  const unreadOnly = ref(false);
  const onlyDirect = ref(false);

  const hasUnread = computed(() => unreadCount.value > 0);

  async function loadPage(p = 1) {
    loading.value = true;
    page.value = p;
    try {
      const qs = new URLSearchParams({
        page: String(p),
        limit: String(limit.value),
      });
      if (unreadOnly.value) qs.set('unreadOnly', 'true');
      if (onlyDirect.value) qs.set('onlyDirect', 'true');
      const res = await fetchAuth(`/api/notifications?${qs}`);
      if (!res.ok) throw new Error('notifications');
      const body = await res.json();
      items.value = body.data ?? [];
      total.value = body.total ?? 0;
    } finally {
      loading.value = false;
    }
  }

  async function refreshUnread() {
    try {
      const res = await fetchAuth('/api/notifications/unread-count');
      if (!res.ok) return;
      const data = await res.json();
      unreadCount.value = Number(data.count) || 0;
    } catch {
      /* ignore */
    }
  }

  async function markRead(id: string) {
    const res = await fetchAuth(`/api/notifications/${id}/read`, { method: 'PATCH' });
    if (!res.ok) return;
    await Promise.all([loadPage(page.value), refreshUnread()]);
  }

  async function markAllRead() {
    const res = await fetchAuth('/api/notifications/read-all', { method: 'PATCH' });
    if (!res.ok) return;
    await Promise.all([loadPage(1), refreshUnread()]);
  }

  return {
    items,
    total,
    page,
    limit,
    loading,
    unreadCount,
    unreadOnly,
    onlyDirect,
    hasUnread,
    loadPage,
    refreshUnread,
    markRead,
    markAllRead,
  };
});
