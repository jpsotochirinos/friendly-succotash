import { ref, onMounted, onUnmounted } from 'vue';
import { getFeedUnreadCount } from '@/services/feed.service';
import { useAuthStore } from '@/stores/auth.store';

/** Shared across layout + feed view */
const unreadCount = ref(0);

let pollTimer: ReturnType<typeof setInterval> | null = null;
const POLL_MS = 120_000;

export async function refreshFeedUnreadCount(): Promise<void> {
  try {
    const auth = useAuthStore();
    if (!auth.user?.permissions?.includes('feed:read')) {
      unreadCount.value = 0;
      return;
    }
    unreadCount.value = await getFeedUnreadCount();
  } catch {
    unreadCount.value = 0;
  }
}

/**
 * Start polling unread count (used from AppLayout).
 */
export function useFeedUnread() {
  onMounted(() => {
    void refreshFeedUnreadCount();
    pollTimer = setInterval(() => void refreshFeedUnreadCount(), POLL_MS);
  });

  onUnmounted(() => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  });

  return { unreadCount, refresh: refreshFeedUnreadCount };
}

export { unreadCount };
