<template>
  <section class="flex flex-col gap-6 sm:gap-8">
    <!-- Cabecera (hero alineado con landing: gradiente Zafiro → Real) -->
    <div
      class="bg-brand-gradient flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 p-5 sm:p-6 rounded-2xl border border-white/15 shadow-brand-lg text-brand-papel"
    >
      <div class="min-w-0">
        <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight text-brand-papel">
          {{ headline }}
        </h1>
        <p class="mt-2 text-sm text-brand-papel/85">
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

    <!-- Métricas -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <div
        v-for="stat in statsDisplay"
        :key="stat.labelKey"
        class="app-card p-4 sm:p-5 flex flex-col gap-1 min-h-[5.5rem] justify-center"
      >
        <span class="text-2xl sm:text-3xl font-semibold tabular-nums tracking-tight text-fg">
          {{ stat.value }}
        </span>
        <span class="text-xs sm:text-sm leading-snug text-fg-muted">
          {{ $t(stat.labelKey) }}
        </span>
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
          <ul
            v-else-if="priorityTasks.length === 0"
            class="px-4 py-6 sm:px-5 text-sm text-fg-subtle"
          >
            {{ $t('home.emptyPriority') }}
          </ul>
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
                  :class="isDueOverdue(item.due_date) ? 'text-accent-hover' : 'text-fg-subtle'"
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
                  :class="isDueOverdue(item.due_date) ? 'text-accent-hover' : 'text-fg-subtle'"
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
          <ul
            v-else-if="recentTasks.length === 0"
            class="px-4 py-6 sm:px-5 text-sm text-fg-subtle"
          >
            {{ $t('home.emptyRecent') }}
          </ul>
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
                  :class="isDueOverdue(item.due_date) ? 'text-accent-hover' : 'text-fg-subtle'"
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
                  :class="isDueOverdue(item.due_date) ? 'text-accent-hover' : 'text-fg-subtle'"
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
          class="p-4 sm:p-5 text-sm text-fg-subtle"
        >
          {{ $t('home.emptyActivity') }}
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

const statsDisplay = computed(() => {
  const p = payload.value;
  const dash = '—';
  const placeholder = loading.value || (loadError.value && !p);
  return [
    {
      value: placeholder ? dash : (p?.activeTrackables ?? 0),
      labelKey: 'home.statActiveMatters' as const,
    },
    {
      value: placeholder ? dash : (p?.urgentTasks ?? 0),
      labelKey: 'home.statUrgentTasks' as const,
    },
    {
      value: placeholder ? dash : (p?.dueTodayTasks ?? 0),
      labelKey: 'home.statTodayTasks' as const,
    },
    {
      value: placeholder ? dash : (p?.overdueTasks ?? 0),
      labelKey: 'home.statOverdueTasks' as const,
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
