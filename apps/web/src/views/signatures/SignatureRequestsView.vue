<template>
  <section class="flex min-h-0 flex-1 flex-col gap-6">
    <PageHeader
      :title="t('signatures.title')"
      :subtitle="t('signatures.subtitle')"
    />

    <SelectButton
      :model-value="tab"
      :options="tabOptions"
      option-label="label"
      option-value="value"
      :allow-empty="false"
      class="flex flex-wrap"
      @update:model-value="onSelectTab"
    />

    <div
      v-if="loading && !rows.length"
      class="rounded-xl border border-[var(--surface-border)] py-12 text-center text-sm text-[var(--fg-muted)]"
    >
      {{ t('app.loading') }}
    </div>

    <div
      v-else-if="!rows.length"
      class="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)]/30 py-12 text-center text-sm text-[var(--fg-muted)]"
    >
      {{ emptyMessage }}
    </div>

    <DataTable
      v-else
      :value="rows"
      :loading="loading"
      class="text-sm"
      striped-rows
      :pt="{
        root: { class: 'rounded-xl border border-[var(--surface-border)] overflow-hidden' },
      }"
    >
      <Column field="title" :header="t('signatures.colTitle')" />
      <Column field="status" :header="t('signatures.colStatus')">
        <template #body="{ data }">
          <Tag :value="data.status" :severity="statusSeverity(data.status)" />
        </template>
      </Column>
      <Column v-if="tab === 'completed'" :header="t('signatures.colDownload')">
        <template #body="{ data }">
          <Button
            v-if="data.documentSignedKey"
            size="small"
            :label="t('signatures.download')"
            icon="pi pi-download"
            @click="downloadSigned(data.id)"
          />
        </template>
      </Column>
      <Column v-if="tab === 'pending'">
        <template #header />
        <template #body="{ data }">
          <Button
            v-if="myPendingSignerId(data)"
            size="small"
            :label="t('signatures.signNow')"
            @click="$router.push({ name: 'signature-sign', params: { requestId: data.id } })"
          />
        </template>
      </Column>
    </DataTable>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import SelectButton from 'primevue/selectbutton';
import Tag from 'primevue/tag';
import { useAuthStore } from '@/stores/auth.store';
import { signaturesApi } from '@/api/signatures';
import PageHeader from '@/components/common/PageHeader.vue';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const tab = ref<'pending' | 'sent' | 'completed'>('pending');
const rows = ref<Record<string, unknown>[]>([]);
const loading = ref(false);

const tabOptions = computed(() => [
  { label: t('signatures.tabPending'), value: 'pending' as const },
  { label: t('signatures.tabSent'), value: 'sent' as const },
  { label: t('signatures.tabCompleted'), value: 'completed' as const },
]);

const emptyMessage = computed(() => {
  if (tab.value === 'pending') return t('signatures.listEmptyPending');
  if (tab.value === 'sent') return t('signatures.listEmptySent');
  return t('signatures.listEmptyCompleted');
});

function statusSeverity(
  s: string,
): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | undefined {
  const m: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
    completed: 'success',
    pending: 'info',
    draft: 'secondary',
    cancelled: 'danger',
    expired: 'warn',
  };
  return m[s] ?? 'secondary';
}

function myPendingSignerId(req: any): string | null {
  const uid = auth.user?.id;
  if (!uid || !req.signers) return null;
  const s = req.signers.find(
    (x: any) => x.user?.id === uid && ['pending', 'notified'].includes(x.status),
  );
  return s?.id ?? null;
}

function normalizeList(body: unknown): Record<string, unknown>[] {
  if (Array.isArray(body)) return body as Record<string, unknown>[];
  if (body && typeof body === 'object' && Array.isArray((body as { data?: unknown }).data)) {
    return (body as { data: Record<string, unknown>[] }).data;
  }
  return [];
}

async function load() {
  loading.value = true;
  try {
    const { data } = await signaturesApi.listRequests(tab.value);
    rows.value = normalizeList(data);
  } finally {
    loading.value = false;
  }
}

function onSelectTab(v: 'pending' | 'sent' | 'completed') {
  tab.value = v;
  void router.replace({ path: route.path, query: { ...route.query, tab: v } });
  void load();
}

onMounted(() => {
  const q = route.query.tab;
  if (q === 'sent' || q === 'completed' || q === 'pending') {
    tab.value = q;
  }
  void load();
});

async function downloadSigned(id: string) {
  const { data } = await signaturesApi.getSignedUrl(id);
  if (data?.url) window.open(data.url, '_blank');
}
</script>
