import { onMounted, onUnmounted, type Ref } from 'vue';

export type CalendarShortcutHandlers = {
  onMonth?: () => void;
  onWeek?: () => void;
  onDay?: () => void;
  onAgenda?: () => void;
  onToday?: () => void;
  onNew?: () => void;
  onSearchFocus?: () => void;
  onToggleFilters?: () => void;
  onHelp?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
};

export function useCalendarShortcuts(handlers: Ref<CalendarShortcutHandlers>, enabled: Ref<boolean>) {
  function onKey(e: KeyboardEvent) {
    if (!enabled.value) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
      if (e.key === 'Escape') handlers.value.onHelp?.();
      return;
    }

    const h = handlers.value;
    if (e.key === 'm' || e.key === 'M') h.onMonth?.();
    else if (e.key === 'w' || e.key === 'W') h.onWeek?.();
    else if (e.key === 'd' || e.key === 'D') h.onDay?.();
    else if (e.key === 'a' || e.key === 'A') h.onAgenda?.();
    else if (e.key === 't' || e.key === 'T') h.onToday?.();
    else if (e.key === 'n' || e.key === 'N') h.onNew?.();
    else if (e.key === '/') h.onSearchFocus?.();
    else if (e.key === 'f' || e.key === 'F') h.onToggleFilters?.();
    else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
      e.preventDefault();
      h.onHelp?.();
    } else if (e.key === 'ArrowLeft') h.onPrev?.();
    else if (e.key === 'ArrowRight') h.onNext?.();
  }

  onMounted(() => window.addEventListener('keydown', onKey));
  onUnmounted(() => window.removeEventListener('keydown', onKey));
}
