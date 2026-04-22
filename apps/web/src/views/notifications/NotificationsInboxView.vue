<template>
  <div class="flex flex-col gap-6">
    <PageHeader :title="t('notifications.title')" :subtitle="t('notifications.subtitle')">
      <template #actions>
        <Button
          :label="t('notifications.markAllRead')"
          severity="secondary"
          outlined
          size="small"
          :disabled="store.loading || store.unreadCount === 0"
          @click="onMarkAll"
        />
      </template>
    </PageHeader>

    <div class="flex flex-wrap gap-4 items-center">
      <div class="flex items-center gap-2">
        <Checkbox v-model="store.unreadOnly" binary input-id="unread-only" />
        <label for="unread-only" class="text-sm cursor-pointer text-[var(--fg-default)]">
          {{ t('notifications.unreadOnly') }}
        </label>
      </div>
      <div class="flex items-center gap-2">
        <Checkbox v-model="store.onlyDirect" binary input-id="only-direct" />
        <label for="only-direct" class="text-sm cursor-pointer text-[var(--fg-default)]">
          {{ t('notifications.onlyDirect') }}
        </label>
      </div>
    </div>

    <div v-if="store.loading" class="py-12 text-center text-sm" :style="{ color: 'var(--fg-muted)' }">
      {{ t('app.loading') }}
    </div>

    <div v-else-if="!store.items.length" class="py-12 text-center rounded-xl border" :style="{ borderColor: 'var(--surface-border)' }">
      <p class="text-sm" :style="{ color: 'var(--fg-muted)' }">{{ t('notifications.empty') }}</p>
    </div>

    <ul v-else class="space-y-2">
      <li
        v-for="item in store.items"
        :key="item.id"
        class="rounded-xl border p-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between transition-colors"
        :style="{
          borderColor: 'var(--surface-border)',
          backgroundColor: item.isRead ? 'transparent' : 'var(--surface-sunken)',
        }"
      >
        <div class="min-w-0 flex-1 space-y-1">
          <div class="flex flex-wrap items-center gap-2">
            <span
              v-if="item.isDirect"
              class="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded"
              :style="{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }"
            >
              {{ t('notifications.badgeDirect') }}
            </span>
            <span
              v-else-if="item.trackableTitle"
              class="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded"
              :style="{ backgroundColor: 'var(--surface-raised)', color: 'var(--fg-muted)' }"
            >
              {{ t('notifications.badgeOrg') }}
            </span>
            <span class="text-xs" :style="{ color: 'var(--fg-subtle)' }">{{ formatDate(item.createdAt) }}</span>
          </div>
          <h2 class="text-base font-medium leading-snug" :style="{ color: 'var(--fg-default)' }">
            {{ item.title }}
          </h2>
          <p v-if="item.message" class="text-sm" :style="{ color: 'var(--fg-muted)' }">{{ item.message }}</p>
          <p v-if="item.trackableTitle" class="text-sm">
            <RouterLink
              v-if="item.trackableId"
              :to="{ name: 'expediente', params: { id: item.trackableId } }"
              class="underline underline-offset-2"
              :style="{ color: 'var(--accent)' }"
            >
              {{ item.trackableTitle }}
            </RouterLink>
            <span v-else>{{ item.trackableTitle }}</span>
          </p>
        </div>
        <div class="flex shrink-0 gap-2 sm:flex-col sm:items-end">
          <Button
            v-if="!item.isRead"
            :label="t('notifications.markRead')"
            size="small"
            severity="secondary"
            @click="store.markRead(item.id)"
          />
        </div>
      </li>
    </ul>

    <div v-if="store.total > store.limit" class="flex justify-center gap-2 pt-2">
      <Button
        :disabled="store.page <= 1 || store.loading"
        icon="pi pi-angle-left"
        severity="secondary"
        text
        @click="store.loadPage(store.page - 1)"
      />
      <span class="text-sm self-center" :style="{ color: 'var(--fg-muted)' }">
        {{ store.page }} / {{ Math.max(1, Math.ceil(store.total / store.limit)) }}
      </span>
      <Button
        :disabled="store.page * store.limit >= store.total || store.loading"
        icon="pi pi-angle-right"
        severity="secondary"
        text
        @click="store.loadPage(store.page + 1)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import PageHeader from '@/components/common/PageHeader.vue';
import { useNotificationsStore } from '@/stores/notifications.store';

const { t } = useI18n();
const store = useNotificationsStore();

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

async function onMarkAll() {
  await store.markAllRead();
}

watch(
  () => [store.unreadOnly, store.onlyDirect] as const,
  () => {
    void store.loadPage(1);
  },
);

onMounted(async () => {
  await store.loadPage(1);
  await store.refreshUnread();
});
</script>
