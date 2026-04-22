<template>
  <div class="max-w-xl flex flex-col gap-6">
    <PageHeader :title="t('settings.sections.calendar')" :subtitle="t('settings.calendarSubtitle')" />

    <div
      class="rounded-xl border divide-y mb-6"
      :style="{ borderColor: 'var(--surface-border)', backgroundColor: 'var(--surface-raised)' }"
    >
      <div class="px-4 py-4 flex flex-col gap-3">
        <p class="text-sm font-medium m-0" :style="{ color: 'var(--fg-default)' }">{{ t('settings.calendarGoogleTitle') }}</p>
        <p class="text-xs m-0" :style="{ color: 'var(--fg-muted)' }">{{ t('settings.calendarGoogleHint') }}</p>
        <Button
          v-if="canIntegration"
          type="button"
          icon="pi pi-google"
          :label="t('settings.calendarConnectGoogle')"
          :loading="googleLoading"
          @click="connectGoogle"
        />
        <p v-else class="text-xs m-0 text-[var(--fg-muted)]">{{ t('settings.calendarNoIntegrationPerm') }}</p>
      </div>
      <div class="px-4 py-4 flex flex-col gap-3">
        <p class="text-sm font-medium m-0" :style="{ color: 'var(--fg-default)' }">{{ t('settings.calendarOutlookTitle') }}</p>
        <p class="text-xs m-0" :style="{ color: 'var(--fg-muted)' }">{{ t('settings.calendarOutlookHint') }}</p>
        <Button
          v-if="canIntegration"
          type="button"
          icon="pi pi-microsoft"
          outlined
          :label="t('settings.calendarConnectOutlook')"
          @click="connectOutlook"
        />
      </div>
    </div>

    <div
      class="rounded-xl border p-4 flex flex-col gap-3"
      :style="{ borderColor: 'var(--surface-border)', backgroundColor: 'var(--surface-raised)' }"
    >
      <p class="text-sm font-medium m-0" :style="{ color: 'var(--fg-default)' }">{{ t('settings.calendarIcsTitle') }}</p>
      <p class="text-xs m-0" :style="{ color: 'var(--fg-muted)' }">{{ t('settings.calendarIcsHint') }}</p>
      <div v-if="icsUrl" class="text-xs break-all font-mono p-2 rounded bg-[var(--surface-sunken)]">{{ icsUrl }}</div>
      <Button type="button" icon="pi pi-refresh" :label="t('settings.calendarRegenerateIcs')" :loading="icsLoading" @click="regenerateIcs" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import Button from 'primevue/button';
import { apiClient } from '@/api/client';
import { usePermissions } from '@/composables/usePermissions';
import PageHeader from '@/components/common/PageHeader.vue';

const { t } = useI18n();
const toast = useToast();
const { can } = usePermissions();

const canIntegration = can('calendar:integration:manage');
const googleLoading = ref(false);
const icsLoading = ref(false);
const icsUrl = ref('');

async function connectGoogle() {
  googleLoading.value = true;
  try {
    const { data } = await apiClient.get<{ url: string }>('/calendar/integrations/google/authorize');
    if (data?.url) window.location.href = data.url;
  } catch {
    toast.add({ severity: 'error', summary: t('settings.calendarOAuthError'), life: 4000 });
  } finally {
    googleLoading.value = false;
  }
}

function connectOutlook() {
  void apiClient.get('/calendar/integrations/outlook/authorize').then(({ data }) => {
    const url = (data as { url?: string })?.url;
    if (url) window.location.href = url;
  });
}

async function regenerateIcs() {
  icsLoading.value = true;
  try {
    const { data } = await apiClient.get<{ url?: string }>('/calendar/feed/regenerate');
    icsUrl.value = data?.url ?? '';
    toast.add({ severity: 'success', summary: t('settings.calendarIcsCopied'), life: 3000 });
  } catch {
    toast.add({ severity: 'error', summary: t('settings.calendarIcsError'), life: 4000 });
  } finally {
    icsLoading.value = false;
  }
}

onMounted(() => {
  icsUrl.value = '';
});
</script>
