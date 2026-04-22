<template>
  <div class="flex flex-col gap-6">
    <PageHeader :title="$t('legal.flowTemplatesTitle')" :subtitle="$t('legal.flowTemplatesSubtitle')">
      <template #actions>
        <Button icon="pi pi-plus" :label="$t('legal.newFlowTemplate')" size="small" @click="openCreate" />
      </template>
    </PageHeader>

    <div class="flex flex-wrap gap-3 items-end">
      <span class="p-input-icon-left flex-1 min-w-[200px]">
        <i class="pi pi-search" />
        <InputText v-model="q" class="w-full" :placeholder="$t('common.search')" @keyup.enter="load" />
      </span>
      <Dropdown
        v-model="matterType"
        :options="matterTypeOptions"
        option-label="label"
        option-value="value"
        :placeholder="$t('legal.matterTypeLabel')"
        show-clear
        class="w-56"
        @change="load"
      />
      <div class="flex items-center gap-2">
        <Checkbox v-model="includeSystem" binary input-id="inc-sys" @change="load" />
        <label for="inc-sys" class="text-sm">{{ $t('legal.includeSystemTemplates') }}</label>
      </div>
      <Button icon="pi pi-refresh" outlined :label="$t('common.search')" @click="load" />
    </div>

    <DataTable
      :value="rows"
      :loading="loading"
      data-key="id"
      striped-rows
      class="text-sm"
    >
      <Column field="name" :header="$t('legal.templateName')" />
      <Column field="matterType" :header="$t('legal.matterTypeLabel')">
        <template #body="{ data }">
          <Tag :value="data.matterType" severity="secondary" />
        </template>
      </Column>
      <Column field="category" :header="$t('legal.category')">
        <template #body="{ data }">
          {{ data.category || '—' }}
        </template>
      </Column>
      <Column :header="$t('legal.origin')">
        <template #body="{ data }">
          <Tag v-if="data.isSystem" severity="info" :value="$t('legal.system')" />
          <Tag v-else severity="success" :value="$t('legal.office')" />
        </template>
      </Column>
      <Column :header="$t('common.actions')" style="width: 8rem">
        <template #body="{ data }">
          <Button
            icon="pi pi-pencil"
            text
            rounded
            :aria-label="$t('common.edit')"
            @click="$router.push({ name: 'workflow-template-edit', params: { id: data.id } })"
          />
        </template>
      </Column>
    </DataTable>

    <Dialog
      v-model:visible="createVisible"
      :header="$t('legal.newFlowTemplate')"
      modal
      class="w-full max-w-md"
    >
      <div class="space-y-3 py-2">
        <div>
          <label class="text-xs font-medium text-gray-600 dark:text-gray-400">{{ $t('legal.templateName') }}</label>
          <InputText v-model="createForm.name" class="w-full mt-1" />
        </div>
        <div>
          <label class="text-xs font-medium text-gray-600 dark:text-gray-400">{{ $t('legal.matterTypeLabel') }}</label>
          <Dropdown
            v-model="createForm.matterType"
            :options="matterTypeOptions"
            option-label="label"
            option-value="value"
            class="w-full mt-1"
          />
        </div>
        <div>
          <label class="text-xs font-medium text-gray-600 dark:text-gray-400">{{ $t('legal.category') }}</label>
          <InputText v-model="createForm.category" class="w-full mt-1" />
        </div>
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" text @click="createVisible = false" />
        <Button :label="$t('common.create')" icon="pi pi-check" :loading="createLoading" @click="submitCreate" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import Checkbox from 'primevue/checkbox';
import { useToast } from 'primevue/usetoast';
import { apiClient } from '@/api/client';
import PageHeader from '@/components/common/PageHeader.vue';

const MATTER_TYPES = [
  'litigation',
  'corporate',
  'labor',
  'family',
  'tax',
  'criminal',
  'administrative',
  'advisory',
  'real_estate',
  'other',
] as const;
type MatterTypeValue = (typeof MATTER_TYPES)[number];

const { t } = useI18n();
const router = useRouter();
const toast = useToast();

const rows = ref<any[]>([]);
const loading = ref(false);
const q = ref('');
const matterType = ref<MatterTypeValue | null>(null);
const includeSystem = ref(true);

const matterTypeOptions = computed(() =>
  MATTER_TYPES.map((v) => ({
    value: v,
    label: t(`legal.matterType.${v}`),
  })),
);

const createVisible = ref(false);
const createLoading = ref(false);
const createForm = ref({
  name: '',
  matterType: 'other' as MatterTypeValue,
  category: '',
});

function openCreate() {
  createForm.value = { name: '', matterType: 'other', category: '' };
  createVisible.value = true;
}

async function load() {
  loading.value = true;
  try {
    const { data } = await apiClient.get('/workflow-templates', {
      params: {
        q: q.value || undefined,
        matterType: matterType.value || undefined,
        includeSystem: includeSystem.value,
      },
    });
    rows.value = Array.isArray(data) ? data : [];
  } catch {
    rows.value = [];
    toast.add({ severity: 'error', summary: t('legal.loadTemplatesError'), life: 4000 });
  } finally {
    loading.value = false;
  }
}

async function submitCreate() {
  if (!createForm.value.name.trim()) {
    toast.add({ severity: 'warn', summary: t('legal.nameRequired'), life: 3000 });
    return;
  }
  createLoading.value = true;
  try {
    const { data } = await apiClient.post('/workflow-templates', {
      name: createForm.value.name.trim(),
      matterType: createForm.value.matterType,
      category: createForm.value.category || undefined,
    });
    createVisible.value = false;
    await load();
    if (data?.id) {
      await router.push({ name: 'workflow-template-edit', params: { id: data.id } });
    }
    toast.add({ severity: 'success', summary: t('legal.templateCreated'), life: 3000 });
  } catch {
    toast.add({ severity: 'error', summary: t('legal.templateCreateError'), life: 4000 });
  } finally {
    createLoading.value = false;
  }
}

onMounted(() => void load());
</script>
