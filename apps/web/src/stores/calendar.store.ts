import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { defaultCalendarFilters, type CalendarFiltersState } from '@/composables/calendarEventKind';

export type CalendarScope = 'mine' | 'team';

const STORAGE_KEY = 'alega.calendar.scope';

export const useCalendarStore = defineStore('calendar', () => {
  const route = useRoute();
  const router = useRouter();

  function initialScope(): CalendarScope {
    const q = route.query.scope;
    if (q === 'mine' || q === 'team') return q;
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s === 'mine' || s === 'team') return s;
    } catch {
      /* ignore */
    }
    return 'mine';
  }

  const scope = ref<CalendarScope>(initialScope());
  const filters = ref<CalendarFiltersState>(defaultCalendarFilters());

  watch(scope, (v) => {
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {
      /* ignore */
    }
    router.replace({
      query: { ...route.query, scope: v },
    });
    if (v === 'mine') {
      filters.value = { ...filters.value, assignees: [] };
    }
  });

  function setScope(v: CalendarScope) {
    scope.value = v;
  }

  function setFilters(partial: Partial<CalendarFiltersState>) {
    filters.value = { ...filters.value, ...partial };
  }

  function resetFilters() {
    filters.value = defaultCalendarFilters();
  }

  return { scope, setScope, filters, setFilters, resetFilters };
});
