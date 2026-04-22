import { ref, computed, watch } from 'vue';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'alega-theme';

function isBrowser(): boolean {
  return typeof globalThis !== 'undefined' && !!(globalThis as { window?: unknown }).window;
}

function readStoredMode(): ThemeMode {
  if (!isBrowser()) return 'system';
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (raw === 'light' || raw === 'dark') return raw;
  } catch (_e) {
    /* no-op */
  }
  return 'system';
}

function matchPrefersDark(): boolean {
  if (!isBrowser() || !globalThis.matchMedia) return false;
  return globalThis.matchMedia('(prefers-color-scheme: dark)').matches;
}

function syncFaviconHref(isDark: boolean) {
  if (!isBrowser() || !globalThis.document) return;
  const link = globalThis.document.querySelector(
    'link[data-alega-favicon]',
  ) as HTMLLinkElement | null;
  if (!link) return;
  link.href = isDark ? '/brand/favicon-dark.svg' : '/brand/favicon-light.svg';
}

function applyTheme(isDark: boolean) {
  if (!isBrowser() || !globalThis.document) return;
  const root = globalThis.document.documentElement;
  root.classList.toggle('dark', isDark);
  root.style.colorScheme = isDark ? 'dark' : 'light';
  syncFaviconHref(isDark);
}

function persist(value: ThemeMode) {
  if (!isBrowser()) return;
  try {
    if (value === 'system') {
      globalThis.localStorage.removeItem(STORAGE_KEY);
    } else {
      globalThis.localStorage.setItem(STORAGE_KEY, value);
    }
  } catch (_e) {
    /* no-op */
  }
}

const mode = ref<ThemeMode>(readStoredMode());
const systemPrefersDark = ref<boolean>(matchPrefersDark());
const resolvedIsDark = computed(() =>
  mode.value === 'system' ? systemPrefersDark.value : mode.value === 'dark',
);

watch(resolvedIsDark, (dark) => applyTheme(dark), { immediate: true, flush: 'sync' });

if (isBrowser() && globalThis.matchMedia) {
  const mql = globalThis.matchMedia('(prefers-color-scheme: dark)');
  const handler = (e: MediaQueryListEvent) => {
    systemPrefersDark.value = e.matches;
  };
  mql.addEventListener('change', handler);
}

export function useTheme() {
  function setMode(value: ThemeMode) {
    mode.value = value;
    persist(value);
  }

  function toggle() {
    setMode(resolvedIsDark.value ? 'light' : 'dark');
  }

  function cycle() {
    const order: ThemeMode[] = ['light', 'dark', 'system'];
    const next = order[(order.indexOf(mode.value) + 1) % order.length];
    setMode(next);
  }

  return {
    mode,
    isDark: resolvedIsDark,
    setMode,
    toggle,
    cycle,
  };
}
