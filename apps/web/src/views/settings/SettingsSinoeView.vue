<template>
  <div class="max-w-xl flex flex-col gap-6">
    <PageHeader :title="t('settings.sections.sinoe')" :subtitle="t('settings.sinoeSubtitle')" />

    <div v-if="loadError" class="text-sm mb-4 p-3 rounded-lg" :style="{ background: 'var(--surface-sunken)', color: 'var(--fg-muted)' }">
      {{ t('settings.sinoeLoadError') }}
    </div>

    <form v-else class="space-y-4" @submit.prevent="save">
      <div
        v-if="status?.configured"
        class="text-sm rounded-lg px-3 py-2 border"
        :style="{
          borderColor: 'var(--border-subtle)',
          background: 'var(--surface-raised)',
          color: 'var(--fg-muted)',
        }"
      >
        <span class="font-medium" :style="{ color: 'var(--fg-default)' }">{{ t('settings.sinoeMaskedUser') }}:</span>
        {{ status.usernameMasked }}
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="sinoe-user" class="text-sm font-medium" :style="{ color: 'var(--fg-default)' }">
          {{ t('settings.sinoeUsername') }}
        </label>
        <InputText
          id="sinoe-user"
          v-model="username"
          class="w-full"
          :disabled="loading || saving"
          autocomplete="username"
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="sinoe-pass" class="text-sm font-medium" :style="{ color: 'var(--fg-default)' }">
          {{ t('settings.sinoePassword') }}
        </label>
        <Password
          id="sinoe-pass"
          v-model="password"
          class="w-full"
          input-class="w-full"
          :disabled="loading || saving"
          :feedback="false"
          toggle-mask
          autocomplete="off"
        />
      </div>

      <div
        v-if="status?.configured && (status.lastScrapeAt || status.lastScrapeError)"
        class="text-xs space-y-1"
        :style="{ color: 'var(--fg-muted)' }"
      >
        <p v-if="status.lastScrapeAt">
          {{ t('settings.sinoeLastSync') }}:
          {{ formatDate(status.lastScrapeAt) }}
        </p>
        <p v-if="status.lastScrapeError" class="text-red-600 dark:text-red-400">
          {{ t('settings.sinoeLastError') }}: {{ status.lastScrapeError }}
        </p>
      </div>

      <div class="flex flex-wrap gap-2 pt-2">
        <Button
          type="submit"
          :loading="saving"
          :label="t('settings.sinoeSave')"
          icon="pi pi-check"
          :disabled="loading"
        />
        <Button
          type="button"
          severity="secondary"
          outlined
          :loading="syncing"
          :label="t('settings.sinoeSyncNow')"
          icon="pi pi-refresh"
          :disabled="loading || !status?.configured"
          @click="triggerSync"
        />
        <Button
          type="button"
          severity="danger"
          outlined
          :loading="removing"
          :label="t('settings.sinoeRemove')"
          icon="pi pi-trash"
          :disabled="loading || !status?.configured"
          @click="confirmRemove"
        />
      </div>
    </form>

    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import ConfirmDialog from 'primevue/confirmdialog';
import { apiClient } from '@/api/client';
import PageHeader from '@/components/common/PageHeader.vue';

const { t } = useI18n();
const toast = useToast();
const confirm = useConfirm();

interface SinoeStatus {
  configured: boolean;
  usernameMasked: string | null;
  lastScrapeAt?: string | null;
  lastScrapeError?: string | null;
}

const status = ref<SinoeStatus | null>(null);
const username = ref('');
const password = ref('');
const loading = ref(true);
const loadError = ref(false);
const saving = ref(false);
const removing = ref(false);
const syncing = ref(false);

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

async function load() {
  loading.value = true;
  loadError.value = false;
  try {
    const { data } = await apiClient.get<SinoeStatus>('/integrations/sinoe/credentials');
    status.value = data;
    username.value = '';
    password.value = '';
  } catch {
    loadError.value = true;
    status.value = null;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  load();
});

async function save() {
  const u = username.value.trim();
  const p = password.value;
  if (!u || !p) {
    toast.add({ severity: 'warn', summary: t('common.fillRequired'), life: 3000 });
    return;
  }
  saving.value = true;
  try {
    await apiClient.put('/integrations/sinoe/credentials', { username: u, password: p });
    toast.add({ severity: 'success', summary: t('settings.sinoeSaved'), life: 3000 });
    username.value = '';
    password.value = '';
    await load();
  } catch {
    toast.add({ severity: 'error', summary: t('settings.sinoeSaveError'), life: 4000 });
  } finally {
    saving.value = false;
  }
}

function confirmRemove() {
  confirm.require({
    message: t('settings.sinoeRemoveConfirm'),
    header: t('settings.sinoeRemove'),
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: t('common.yes'),
    rejectLabel: t('common.cancel'),
    accept: async () => {
      removing.value = true;
      try {
        await apiClient.delete('/integrations/sinoe/credentials');
        toast.add({ severity: 'success', summary: t('settings.sinoeRemoved'), life: 3000 });
        await load();
      } catch {
        toast.add({ severity: 'error', summary: t('settings.sinoeRemoveError'), life: 4000 });
      } finally {
        removing.value = false;
      }
    },
  });
}

async function triggerSync() {
  syncing.value = true;
  try {
    await apiClient.post('/integrations/sinoe/credentials/trigger-scrape');
    toast.add({ severity: 'success', summary: t('settings.sinoeSyncQueued'), life: 3000 });
  } catch {
    toast.add({ severity: 'error', summary: t('settings.sinoeSyncError'), life: 4000 });
  } finally {
    syncing.value = false;
  }
}
</script>
