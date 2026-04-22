import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth.store';

const PREFIX = 'sidebar-nav-order:';

function keyForUser(userId: string) {
  return `${PREFIX}${userId}`;
}

export const useSidebarNavOrderStore = defineStore('sidebar-nav-order', () => {
  /** Route paths (`to`) in user-chosen order; empty means “use default”. */
  const order = ref<string[]>([]);

  function hydrate() {
    const userId = useAuthStore().user?.id;
    if (!userId) {
      order.value = [];
      return;
    }
    try {
      const raw = globalThis.localStorage.getItem(keyForUser(userId));
      if (!raw) {
        order.value = [];
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      order.value = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
    } catch {
      order.value = [];
    }
  }

  function saveOrder(routes: string[]) {
    const userId = useAuthStore().user?.id;
    if (!userId) return;
    order.value = [...routes];
    try {
      globalThis.localStorage.setItem(keyForUser(userId), JSON.stringify(routes));
    } catch {
      /* quota / private mode */
    }
  }

  function clear() {
    order.value = [];
  }

  return { order, hydrate, saveOrder, clear };
});
