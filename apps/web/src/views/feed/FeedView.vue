<template>
  <div class="flex flex-col gap-6 min-h-0 flex-1">
    <PageHeader :title="t('feed.title')" :subtitle="t('feed.subtitle')">
      <template #actions>
        <RouterLink
          v-if="can('feed:manage')"
          to="/settings/feed-sources"
          class="text-sm font-medium underline underline-offset-2 text-[var(--accent)]"
        >
          {{ t('feed.settingsLink') }}
        </RouterLink>
        <Button
          v-if="can('feed:manage')"
          :label="t('feed.newPost')"
          icon="pi pi-plus"
          size="small"
          @click="openDialog"
        />
      </template>
    </PageHeader>

    <SelectButton
      v-model="kindFilter"
      :options="kindOptions"
      option-label="label"
      option-value="value"
      :allow-empty="false"
      class="flex flex-wrap"
    />

    <div v-if="loading && !items.length" class="py-12 text-center text-sm text-fg-muted">
      {{ t('app.loading') }}
    </div>

    <div
      v-else-if="!items.length"
      class="py-12 text-center rounded-xl border border-surface-border text-sm text-fg-muted"
    >
      {{ t('feed.empty') }}
    </div>

    <ul v-else class="space-y-3">
      <li
        v-for="item in items"
        :key="item.id"
        class="rounded-xl border border-surface-border p-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between bg-surface-raised/30"
      >
        <div class="min-w-0 flex-1 space-y-2">
          <div class="flex flex-wrap items-center gap-2">
            <Tag v-if="item.pinned" severity="warn" :value="t('feed.pinned')" class="text-xs" />
            <Tag :value="kindLabel(item.kind)" severity="secondary" class="text-xs" />
            <span class="text-xs text-fg-subtle">{{ formatWhen(item.publishedAt) }}</span>
            <span v-if="item.sourceLabel" class="text-xs text-fg-muted">{{ item.sourceLabel }}</span>
          </div>
          <h2 class="text-base font-semibold text-fg leading-snug">{{ item.title }}</h2>
          <p v-if="item.summary" class="text-sm text-fg-muted line-clamp-3">{{ item.summary }}</p>
        </div>
        <div class="shrink-0 flex items-center gap-2">
          <Button
            v-if="item.url"
            :label="t('feed.openLink')"
            icon="pi pi-external-link"
            size="small"
            severity="secondary"
            outlined
            @click="openExternal(item.url!)"
          />
        </div>
      </li>
    </ul>

    <div ref="sentinel" class="h-4 w-full shrink-0" aria-hidden="true" />

    <div v-if="loadingMore" class="py-4 text-center text-sm text-fg-muted">{{ t('app.loading') }}</div>

    <Dialog
      v-model:visible="dialogOpen"
      modal
      :header="t('feed.dialogTitle')"
      class="w-full max-w-lg"
      @hide="resetForm"
    >
      <form class="flex flex-col gap-4 pt-2" @submit.prevent="submitPost">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-fg" for="feed-title">{{ t('feed.fieldTitle') }}</label>
          <InputText id="feed-title" v-model="form.title" class="w-full" required />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-fg" for="feed-summary">{{ t('feed.fieldSummary') }}</label>
          <Textarea id="feed-summary" v-model="form.summary" rows="4" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-fg" for="feed-url">{{ t('feed.fieldUrl') }}</label>
          <InputText id="feed-url" v-model="form.url" type="url" class="w-full" />
        </div>
        <div class="flex items-center gap-2">
          <Checkbox v-model="form.pinned" binary input-id="feed-pin" />
          <label for="feed-pin" class="text-sm cursor-pointer text-fg">{{ t('feed.fieldPinned') }}</label>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <Button type="button" :label="t('common.cancel')" severity="secondary" text @click="dialogOpen = false" />
          <Button type="submit" :label="t('feed.publish')" :loading="submitting" />
        </div>
      </form>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import SelectButton from 'primevue/selectbutton';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Checkbox from 'primevue/checkbox';
import Tag from 'primevue/tag';
import PageHeader from '@/components/common/PageHeader.vue';
import { usePermissions } from '@/composables/usePermissions';
import { refreshFeedUnreadCount } from '@/composables/useFeedUnread';
import {
  listFeed,
  markFeedSeen,
  createFeedItem,
  type FeedItem,
  type FeedItemKind,
} from '@/services/feed.service';

const { t, locale } = useI18n();
const { can } = usePermissions();

const kindFilter = ref<FeedItemKind | 'ALL'>('ALL');
const kindOptions = computed(() => [
  { label: t('feed.tabAll'), value: 'ALL' as const },
  { label: t('feed.tabAlega'), value: 'ALEGA_UPDATE' as const },
  { label: t('feed.tabNews'), value: 'LEGAL_NEWS' as const },
  { label: t('feed.tabLegislation'), value: 'LEGISLATION' as const },
]);

const items = ref<FeedItem[]>([]);
const nextCursor = ref<string | null>(null);
const loading = ref(false);
const loadingMore = ref(false);
const sentinel = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

const dialogOpen = ref(false);
const submitting = ref(false);
const form = ref({ title: '', summary: '', url: '', pinned: false });

function kindLabel(kind: FeedItemKind) {
  switch (kind) {
    case 'ALEGA_UPDATE':
      return t('feed.kindAlega');
    case 'LEGAL_NEWS':
      return t('feed.kindNews');
    case 'LEGISLATION':
      return t('feed.kindLegislation');
    default:
      return kind;
  }
}

function formatWhen(iso: string) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(locale.value === 'en' ? 'en' : 'es', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  } catch {
    return iso;
  }
}

function openExternal(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

async function loadInitial() {
  loading.value = true;
  nextCursor.value = null;
  try {
    const kind = kindFilter.value === 'ALL' ? undefined : kindFilter.value;
    const res = await listFeed({ kind, limit: 20 });
    items.value = res.items;
    nextCursor.value = res.nextCursor;
  } finally {
    loading.value = false;
  }
}

async function loadMore() {
  if (!nextCursor.value || loadingMore.value || loading.value) return;
  loadingMore.value = true;
  try {
    const kind = kindFilter.value === 'ALL' ? undefined : kindFilter.value;
    const res = await listFeed({ kind, cursor: nextCursor.value, limit: 20 });
    items.value = [...items.value, ...res.items];
    nextCursor.value = res.nextCursor;
  } finally {
    loadingMore.value = false;
  }
}

watch(kindFilter, () => {
  void loadInitial();
});

function setupObserver() {
  observer?.disconnect();
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) void loadMore();
    },
    { root: null, rootMargin: '100px', threshold: 0 },
  );
  if (sentinel.value) observer.observe(sentinel.value);
}

onMounted(async () => {
  await markFeedSeen();
  await refreshFeedUnreadCount();
  await loadInitial();
  await nextTick();
  setupObserver();
});

onUnmounted(() => {
  observer?.disconnect();
});

function openDialog() {
  dialogOpen.value = true;
}

function resetForm() {
  form.value = { title: '', summary: '', url: '', pinned: false };
}

async function submitPost() {
  submitting.value = true;
  try {
    await createFeedItem({
      kind: 'ALEGA_UPDATE',
      title: form.value.title.trim(),
      summary: form.value.summary.trim() || undefined,
      url: form.value.url.trim() || undefined,
      pinned: form.value.pinned,
    });
    dialogOpen.value = false;
    resetForm();
    await loadInitial();
  } catch {
    window.alert(t('feed.publishError'));
  } finally {
    submitting.value = false;
  }
}
</script>
