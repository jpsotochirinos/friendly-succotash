<template>
  <section class="flex flex-col gap-6 sm:gap-8">
    <!-- Cabecera (hero alineado con landing: gradiente Zafiro → Real) -->
    <div
      class="bg-brand-gradient flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 p-5 sm:p-6 rounded-2xl border border-white/15 shadow-brand-lg text-[var(--fg-on-brand)]"
    >
      <div class="min-w-0">
        <h1 class="text-xl sm:text-2xl font-semibold tracking-tight leading-tight text-[var(--fg-on-brand)]">
          {{ headline }}
        </h1>
        <p class="mt-2 text-sm" style="color: color-mix(in srgb, var(--fg-on-brand) 85%, transparent)">
          {{ formattedDate }}
        </p>
      </div>
      <div
        class="shrink-0 flex items-center justify-end sm:justify-center rounded-xl bg-white/10 backdrop-blur-sm p-3 ring-1 ring-white/20 min-h-[4.5rem] min-w-[8rem]"
      >
        <img
          v-if="orgLogoSrc && !orgLogoFailed"
          :src="orgLogoSrc"
          :alt="orgNameForLogo"
          class="max-h-14 max-w-[10rem] w-auto object-contain drop-shadow-sm rounded-md"
          @error="orgLogoFailed = true"
        />
        <AppLogo v-else variant="wordmark" size="lg" class="!text-white drop-shadow-sm" />
      </div>
    </div>

    <div
      v-if="loadError"
      class="app-card border-surface-border px-4 py-3 sm:px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
    >
      <p class="text-sm text-fg-muted">{{ loadError }}</p>
      <button
        type="button"
        class="text-sm font-medium self-start sm:self-auto transition-colors hover:opacity-90 text-accent"
        @click="loadHome"
      >
        {{ $t('home.retry') }}
      </button>
    </div>

    <!-- Métricas (patrón kpi-card: --kpi-accent, icon wrap, números tabular) -->
    <div class="home-kpi-wrap grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" role="region" :aria-label="$t('home.kpiSectionAria')">
      <div
        v-for="(stat, idx) in statsDisplay"
        :key="stat.labelKey"
        class="home-kpi-card relative overflow-hidden rounded-2xl border p-4 sm:p-5 text-left shadow-sm"
        :style="{ '--stagger-delay': `${idx * 75}ms`, '--kpi-accent': stat.accent }"
      >
        <span
          v-if="stat.pulse"
          class="pointer-events-none absolute right-3 top-3 h-2 w-2 rounded-full bg-amber-500"
          aria-hidden="true"
        />
        <div class="relative flex min-h-[4.75rem] items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <p class="home-kpi-label m-0 text-[10px] font-semibold uppercase tracking-[0.08em]" style="color: var(--fg-muted)">
              {{ $t(stat.labelKey) }}
            </p>
            <p
              class="home-kpi-number m-0 mt-2 text-3xl font-semibold tracking-tight sm:text-[2.125rem]"
              :style="{
                fontFeatureSettings: '\'tnum\' 1, \'lnum\' 1',
                fontVariantNumeric: 'tabular-nums lining-nums',
                color: stat.isPlaceholder ? 'var(--fg-subtle)' : 'var(--kpi-accent)',
              }"
            >
              {{ stat.value }}
            </p>
          </div>
          <span
            class="home-kpi-icon-wrap inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm"
            aria-hidden="true"
          >
            <i :class="`${stat.icon} text-sm`" />
          </span>
        </div>
      </div>
    </div>

    <!-- Listas + actividad -->
    <div class="grid gap-4 lg:gap-6 lg:grid-cols-[2fr_1fr] items-start">
      <div class="flex flex-col gap-4 min-w-0">
        <article class="app-card overflow-hidden flex flex-col">
          <div
            class="flex items-start justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 border-b border-surface-border"
          >
            <h2 class="text-base font-semibold text-fg">
              {{ $t('home.priorityTasks') }}
            </h2>
            <RouterLink
              v-if="canTrackableRead"
              to="/trackables"
              class="text-sm font-medium shrink-0 transition-colors hover:opacity-90 text-accent"
            >
              {{ $t('home.seeAll') }}
            </RouterLink>
          </div>
          <ul v-if="loading" class="px-4 py-6 sm:px-5">
            <li class="text-sm text-fg-subtle">{{ $t('app.loading') }}</li>
          </ul>
          <div
            v-else-if="priorityTasks.length === 0"
            class="flex flex-col items-center gap-3 px-4 py-12 text-center sm:px-5"
          >
            <i class="pi pi-inbox text-4xl opacity-40" style="color: var(--fg-subtle);" aria-hidden="true" />
            <p class="m-0 max-w-md text-sm leading-relaxed text-fg-muted">{{ $t('home.emptyPriority') }}</p>
          </div>
          <ul v-else class="divide-y divide-surface-border">
            <li
              v-for="item in priorityTasks"
              :key="item.id"
              class="px-0 sm:px-0"
            >
              <RouterLink
                v-if="canTrackableRead"
                :to="taskLink(item)"
                class="block px-4 py-3 sm:px-5 sm:py-3.5 transition-colors hover:!bg-[var(--surface-sunken)]"
              >
                <p class="text-sm font-medium text-fg">
                  {{ item.title }}
                </p>
                <p
                  class="text-xs mt-0.5"
                  :class="isDueOverdue(item.due_date) ? 'text-red-600 dark:text-red-300' : 'text-fg-subtle'"
                >
                  {{ taskSubtitle(item) }}
                </p>
              </RouterLink>
              <div
                v-else
                class="block px-4 py-3 sm:px-5 sm:py-3.5"
              >
                <p class="text-sm font-medium text-fg">
                  {{ item.title }}
                </p>
                <p
                  class="text-xs mt-0.5"
                  :class="isDueOverdue(item.due_date) ? 'text-red-600 dark:text-red-300' : 'text-fg-subtle'"
                >
                  {{ taskSubtitle(item) }}
                </p>
              </div>
            </li>
          </ul>
        </article>

        <article class="app-card overflow-hidden flex flex-col">
          <div
            class="flex items-start justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 border-b border-surface-border"
          >
            <h2 class="text-base font-semibold text-fg">
              {{ $t('home.recentTasks') }}
            </h2>
            <RouterLink
              v-if="canTrackableRead"
              to="/trackables"
              class="text-sm font-medium shrink-0 transition-colors hover:opacity-90 text-accent"
            >
              {{ $t('home.seeAll') }}
            </RouterLink>
          </div>
          <ul v-if="loading" class="px-4 py-6 sm:px-5">
            <li class="text-sm text-fg-subtle">{{ $t('app.loading') }}</li>
          </ul>
          <div
            v-else-if="recentTasks.length === 0"
            class="flex flex-col items-center gap-3 px-4 py-12 text-center sm:px-5"
          >
            <i class="pi pi-inbox text-4xl opacity-40" style="color: var(--fg-subtle);" aria-hidden="true" />
            <p class="m-0 max-w-md text-sm leading-relaxed text-fg-muted">{{ $t('home.emptyRecent') }}</p>
          </div>
          <ul v-else class="divide-y divide-surface-border">
            <li v-for="item in recentTasks" :key="item.id" class="px-0 sm:px-0">
              <RouterLink
                v-if="canTrackableRead"
                :to="taskLink(item)"
                class="block px-4 py-3 sm:px-5 sm:py-3.5 transition-colors hover:!bg-[var(--surface-sunken)]"
              >
                <p class="text-sm font-medium text-fg">
                  {{ item.title }}
                </p>
                <p
                  class="text-xs mt-0.5"
                  :class="isDueOverdue(item.due_date) ? 'text-red-600 dark:text-red-300' : 'text-fg-subtle'"
                >
                  {{ taskSubtitle(item) }}
                </p>
              </RouterLink>
              <div
                v-else
                class="block px-4 py-3 sm:px-5 sm:py-3.5"
              >
                <p class="text-sm font-medium text-fg">
                  {{ item.title }}
                </p>
                <p
                  class="text-xs mt-0.5"
                  :class="isDueOverdue(item.due_date) ? 'text-red-600 dark:text-red-300' : 'text-fg-subtle'"
                >
                  {{ taskSubtitle(item) }}
                </p>
              </div>
            </li>
          </ul>
        </article>
      </div>

      <article class="app-card overflow-hidden min-w-0">
        <div class="px-4 py-3 sm:px-5 sm:py-4 border-b border-surface-border">
          <h2 class="text-base font-semibold text-fg">
            {{ $t('home.recentActivity') }}
          </h2>
        </div>
        <div v-if="loading" class="p-4 sm:p-5">
          <p class="text-sm text-fg-subtle">{{ $t('app.loading') }}</p>
        </div>
        <div
          v-else-if="recentActivity.length === 0"
          class="flex flex-col items-center gap-3 p-8 text-center sm:p-10"
        >
          <i class="pi pi-inbox text-4xl opacity-40" style="color: var(--fg-subtle);" aria-hidden="true" />
          <p class="m-0 max-w-md text-sm leading-relaxed text-fg-muted">{{ $t('home.emptyActivity') }}</p>
        </div>
        <div v-else class="p-4 sm:p-5">
          <ul class="relative pl-2">
            <li
              v-for="(log, idx) in recentActivity"
              :key="log.id"
              class="relative flex gap-3 pb-6 last:pb-0"
            >
              <div class="flex flex-col items-center shrink-0 w-4" aria-hidden="true">
                <span
                  class="mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 border-2 bg-accent border-surface-raised shadow-[0_0_0_1px_var(--accent-soft)]"
                />
                <span
                  v-if="idx < recentActivity.length - 1"
                  class="w-px flex-1 min-h-[1.25rem] mt-1 bg-surface-border-strong"
                />
              </div>
              <div class="min-w-0 pt-0.5">
                <p class="text-sm font-medium leading-snug text-fg">
                  {{ log.action }}
                  <span v-if="log.trackableTitle"> — {{ log.trackableTitle }}</span>
                </p>
                <p class="text-xs mt-1 text-fg-subtle">
                  {{ formatActivityMeta(log) }}
                </p>
              </div>
            </li>
          </ul>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth.store';
import AppLogo from '@/components/brand/AppLogo.vue';
import { apiClient } from '@/api/client';
import { usePermissions } from '@/composables/usePermissions';

interface HomeTaskRow {
  id: string;
  title: string;
  kind: string | null;
  status: string;
  due_date: string | null;
  trackable_id: string;
  trackable_title: string;
}

interface HomeActivityRow {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
  trackableTitle: string | null;
  userLabel: string | null;
}

interface HomePayload {
  activeTrackables: number;
  urgentTasks: number;
  dueTodayTasks: number;
  overdueTasks: number;
  priorityTasks: HomeTaskRow[];
  recentTasks: HomeTaskRow[];
  recentActivity: HomeActivityRow[];
}

const { t, locale } = useI18n();
const authStore = useAuthStore();
const { can } = usePermissions();
const canTrackableRead = computed(() => can('trackable:read'));

const orgLogoFailed = ref(false);
const orgLogoSrc = computed(() => authStore.organization?.logoUrl ?? '');
const orgNameForLogo = computed(() => authStore.organization?.name ?? '');

watch(
  () => authStore.organization?.logoUrl,
  () => {
    orgLogoFailed.value = false;
  },
);

const loading = ref(true);
const loadError = ref('');
const payload = ref<HomePayload | null>(null);

const userName = computed(() => {
  const u = authStore.user;
  return u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email : '';
});

const greetingPrefix = computed(() => {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return t('home.greetingMorning');
  if (h >= 12 && h < 20) return t('home.greetingAfternoon');
  return t('home.greetingEvening');
});

const headline = computed(() =>
  t('home.greetingLine', {
    greeting: greetingPrefix.value,
    name: userName.value || '…',
  }),
);

const formattedDate = computed(() => {
  const loc = locale.value === 'en' ? 'en-GB' : 'es';
  return new Intl.DateTimeFormat(loc, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
});

/** Alineado con KPI / urgency accents (skills: bespoke kpi-card) */
const HOME_STAT_ACCENTS = {
  active: '#0ca678',
  urgent: '#d97706',
  today: '#2d3fbf',
  overdue: '#dc2626',
} as const;

type HomeStatLabelKey =
  | 'home.statActiveMatters'
  | 'home.statUrgentTasks'
  | 'home.statTodayTasks'
  | 'home.statOverdueTasks';

interface HomeStatRow {
  labelKey: HomeStatLabelKey;
  value: string | number;
  accent: string;
  icon: string;
  /** Requiere atención inmediata (count > 0) */
  pulse: boolean;
  isPlaceholder: boolean;
}

const statsDisplay = computed((): HomeStatRow[] => {
  const p = payload.value;
  const dash = '—';
  const placeholder = loading.value || !!(loadError.value && !p);
  const urg = placeholder ? 0 : (p?.urgentTasks ?? 0);
  const ovd = placeholder ? 0 : (p?.overdueTasks ?? 0);
  return [
    {
      value: placeholder ? dash : (p?.activeTrackables ?? 0),
      labelKey: 'home.statActiveMatters',
      accent: HOME_STAT_ACCENTS.active,
      icon: 'pi pi-briefcase',
      pulse: false,
      isPlaceholder: placeholder,
    },
    {
      value: placeholder ? dash : urg,
      labelKey: 'home.statUrgentTasks',
      accent: HOME_STAT_ACCENTS.urgent,
      icon: 'pi pi-bolt',
      pulse: !placeholder && urg > 0,
      isPlaceholder: placeholder,
    },
    {
      value: placeholder ? dash : (p?.dueTodayTasks ?? 0),
      labelKey: 'home.statTodayTasks',
      accent: HOME_STAT_ACCENTS.today,
      icon: 'pi pi-calendar',
      pulse: false,
      isPlaceholder: placeholder,
    },
    {
      value: placeholder ? dash : ovd,
      labelKey: 'home.statOverdueTasks',
      accent: HOME_STAT_ACCENTS.overdue,
      icon: 'pi pi-exclamation-circle',
      pulse: !placeholder && ovd > 0,
      isPlaceholder: placeholder,
    },
  ];
});

const priorityTasks = computed(() => payload.value?.priorityTasks ?? []);
const recentTasks = computed(() => payload.value?.recentTasks ?? []);
const recentActivity = computed(() => payload.value?.recentActivity ?? []);

function extractApiErrorMessage(err: unknown, fallback: string): string {
  const ax = err as { response?: { data?: { message?: unknown; error?: string } } };
  const raw = ax.response?.data?.message;
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return raw.map(String).join(' ');
  if (typeof ax.response?.data?.error === 'string') return ax.response.data.error;
  return fallback;
}

async function loadHome() {
  loading.value = true;
  loadError.value = '';
  try {
    const { data } = await apiClient.get<HomePayload>('/dashboard/home');
    payload.value = data;
  } catch (e) {
    payload.value = null;
    loadError.value = extractApiErrorMessage(e, t('home.loadError'));
  } finally {
    loading.value = false;
  }
}

function taskLink(item: HomeTaskRow) {
  return {
    name: 'expediente' as const,
    params: { id: item.trackable_id },
    query: { workflowItemId: item.id },
  };
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isDueOverdue(iso: string | null): boolean {
  if (!iso) return false;
  const due = startOfDay(new Date(iso));
  const today = startOfDay(new Date());
  return due < today;
}

function formatDue(iso: string | null): string {
  if (!iso) return t('home.noDue');
  const loc = locale.value === 'en' ? 'en-GB' : 'es';
  return new Intl.DateTimeFormat(loc, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

function taskSubtitle(item: HomeTaskRow): string {
  const parts: string[] = [item.trackable_title];
  if (item.due_date) {
    parts.push(t('home.taskDue', { date: formatDue(item.due_date) }));
  } else {
    parts.push(t('home.noDue'));
  }
  return parts.join(' · ');
}

function formatActivityMeta(log: HomeActivityRow): string {
  const loc = locale.value === 'en' ? 'en-GB' : 'es';
  const when = new Intl.DateTimeFormat(loc, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(log.createdAt));
  const who = log.userLabel;
  return who ? `${who} · ${when}` : when;
}

onMounted(() => {
  void loadHome();
});
</script>

<style scoped>
.home-kpi-wrap .home-kpi-card {
  cursor: default;
  background: var(--surface-raised);
  border-color: var(--surface-border);
  animation: homeKpiFadeSlideUp 0.35s ease both;
  animation-delay: var(--stagger-delay, 0ms);
}

@media (hover: hover) and (prefers-reduced-motion: no-preference) {
  .home-kpi-wrap .home-kpi-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
}

@keyframes homeKpiFadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.home-kpi-icon-wrap {
  border: 1px solid color-mix(in srgb, var(--kpi-accent) 24%, var(--surface-border));
  background: color-mix(in srgb, var(--kpi-accent) 10%, var(--surface-raised));
  color: var(--kpi-accent);
  box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 28%, transparent);
}

:global(.dark) .home-kpi-icon-wrap {
  background: color-mix(in srgb, var(--kpi-accent) 18%, var(--surface-raised));
  box-shadow: none;
}

@media (prefers-reduced-motion: reduce) {
  .home-kpi-wrap .home-kpi-card {
    animation: none !important;
  }

  .home-kpi-wrap .home-kpi-card:hover {
    transform: none !important;
  }
}
</style>
