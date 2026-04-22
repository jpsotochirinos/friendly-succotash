<template>
  <div class="flex flex-col gap-6 max-w-4xl">
    <PageHeader :title="t('settings.sections.feedSources')" :subtitle="t('feed.sourcesSubtitle')" />

    <div class="flex justify-end">
      <Button :label="t('feed.sourcesAdd')" icon="pi pi-plus" size="small" @click="openCreate" />
    </div>

    <div v-if="loading" class="py-12 text-center text-sm text-fg-muted">{{ t('app.loading') }}</div>

    <div
      v-else-if="!rows.length"
      class="py-12 text-center rounded-xl border border-surface-border text-sm text-fg-muted"
    >
      {{ t('feed.sourcesEmpty') }}
    </div>

    <DataTable v-else :value="rows" data-key="id" striped-rows class="text-sm">
      <Column field="name" :header="t('feed.sourcesName')" />
      <Column field="url" :header="t('feed.sourcesUrl')">
        <template #body="{ data }">
          <span class="line-clamp-2 break-all text-fg-muted">{{ data.url }}</span>
        </template>
      </Column>
      <Column field="kind" :header="t('feed.sourcesKind')">
        <template #body="{ data }">
          {{ kindLabel(data.kind) }}
        </template>
      </Column>
      <Column field="active" :header="t('feed.sourcesActive')">
        <template #body="{ data }">
          <InputSwitch
            :model-value="data.active"
            @update:model-value="(v: boolean) => onToggleActive(data, v)"
          />
        </template>
      </Column>
      <Column :header="t('feed.sourcesLastFetch')">
        <template #body="{ data }">
          {{ data.lastFetchedAt ? formatWhen(data.lastFetchedAt) : '—' }}
        </template>
      </Column>
      <Column :header="t('feed.sourcesError')">
        <template #body="{ data }">
          <span v-if="data.lastError" class="text-red-600 dark:text-red-400 line-clamp-2">{{
            data.lastError
          }}</span>
          <span v-else class="text-fg-muted">—</span>
        </template>
      </Column>
      <Column :header="t('common.actions')" class="w-28">
        <template #body="{ data }">
          <Button
            icon="pi pi-trash"
            severity="danger"
            text
            rounded
            :aria-label="t('common.delete')"
            @click="confirmDelete(data)"
          />
        </template>
      </Column>
    </DataTable>

    <Dialog
      v-model:visible="dialogOpen"
      modal
      :header="t('feed.sourcesNewTitle')"
      class="w-full max-w-lg"
      @hide="resetForm"
    >
      <form class="flex flex-col gap-4 pt-2" @submit.prevent="saveSource">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium" for="fs-name">{{ t('feed.sourcesName') }}</label>
          <InputText id="fs-name" v-model="form.name" class="w-full" required />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium" for="fs-url">{{ t('feed.sourcesUrl') }}</label>
          <InputText id="fs-url" v-model="form.url" type="url" class="w-full" required />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium" for="fs-kind">{{ t('feed.sourcesKind') }}</label>
          <Dropdown
            id="fs-kind"
            v-model="form.kind"
            :options="kindChoices"
            option-label="label"
            option-value="value"
            class="w-full"
          />
        </div>
        <div class="flex items-center gap-2">
          <Checkbox v-model="form.active" binary input-id="fs-active" />
          <label for="fs-active" class="text-sm cursor-pointer">{{ t('feed.sourcesActive') }}</label>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <Button type="button" :label="t('common.cancel')" severity="secondary" text @click="dialogOpen = false" />
          <Button type="submit" :label="t('common.save')" :loading="saving" />
        </div>
      </form>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import InputSwitch from 'primevue/inputswitch';
import Dropdown from 'primevue/dropdown';
import Checkbox from 'primevue/checkbox';
import PageHeader from '@/components/common/PageHeader.vue';
import {
  listFeedSources,
  createFeedSource,
  updateFeedSource,
  deleteFeedSource,
  type FeedSourceRow,
  type FeedItemKind,
} from '@/services/feed.service';

const { t, locale } = useI18n();

const rows = ref<FeedSourceRow[]>([]);
const loading = ref(false);
const dialogOpen = ref(false);
const saving = ref(false);
const form = ref({
  name: '',
  url: '',
  kind: 'LEGAL_NEWS' as FeedItemKind,
  active: true,
});

const kindChoices = computed(() => [
  { label: t('feed.kindNews'), value: 'LEGAL_NEWS' as const },
  { label: t('feed.kindLegislation'), value: 'LEGISLATION' as const },
  { label: t('feed.kindAlega'), value: 'ALEGA_UPDATE' as const },
]);

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
    return new Intl.DateTimeFormat(locale.value === 'en' ? 'en' : 'es', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

async function load() {
  loading.value = true;
  try {
    rows.value = await listFeedSources();
  } finally {
    loading.value = false;
  }
}

onMounted(() => void load());

function resetForm() {
  form.value = { name: '', url: '', kind: 'LEGAL_NEWS', active: true };
}

function openCreate() {
  resetForm();
  dialogOpen.value = true;
}

async function onToggleActive(row: FeedSourceRow, v: boolean) {
  const prev = row.active;
  row.active = v;
  try {
    await updateFeedSource(row.id, { active: v });
  } catch {
    row.active = prev;
    window.alert(t('feed.sourcesSaveError'));
  }
}

async function saveSource() {
  saving.value = true;
  try {
    await createFeedSource({
      name: form.value.name.trim(),
      url: form.value.url.trim(),
      kind: form.value.kind,
      active: form.value.active,
    });
    dialogOpen.value = false;
    resetForm();
    await load();
  } catch {
    window.alert(t('feed.sourcesSaveError'));
  } finally {
    saving.value = false;
  }
}

function confirmDelete(row: FeedSourceRow) {
  const msg = t('feed.sourcesDeleteConfirm', { name: row.name });
  if (!window.confirm(msg)) return;
  void (async () => {
    try {
      await deleteFeedSource(row.id);
      await load();
    } catch {
      window.alert(t('feed.sourcesSaveError'));
    }
  })();
}
</script>
