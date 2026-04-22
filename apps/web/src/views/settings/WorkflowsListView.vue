<template>
  <div class="flex flex-col gap-6 max-w-5xl">
    <PageHeader :title="t('settings.workflowDefinitionsTitle')" :subtitle="t('settings.workflowDefinitionsSubtitle')" />

    <div class="flex justify-end gap-2 flex-wrap">
      <Button
        icon="pi pi-copy"
        :label="t('settings.workflowDuplicate')"
        size="small"
        outlined
        :disabled="!sourceId || duplicating"
        @click="openDup = true"
      />
    </div>

    <DataTable
      :value="rows"
      :loading="loading"
      data-key="id"
      striped-rows
      class="text-sm"
      :row-class="workflowRowClass"
    >
      <Column field="name" :header="t('settings.workflowColName')" />
      <Column field="slug" :header="t('settings.workflowColSlug')" />
      <Column field="actionType" :header="t('legal.actionType')">
        <template #body="{ data }">
          <span class="font-mono text-xs">{{ (data as any).actionType ?? '—' }}</span>
        </template>
      </Column>
      <Column :header="t('settings.workflowColOrigin')">
        <template #body="{ data }">
          <Tag v-if="(data as any).isSystem" severity="info" :value="t('legal.system')" />
          <Tag v-else severity="success" :value="t('legal.office')" />
        </template>
      </Column>
      <Column :header="t('common.actions')" style="width: 10rem">
        <template #body="{ data }">
          <Button
            icon="pi pi-pencil"
            text
            rounded
            :aria-label="t('common.edit')"
            @click="$router.push({ name: 'settings-workflow-edit', params: { id: (data as any).id } })"
          />
          <Button
            v-if="(data as any).isSystem"
            icon="pi pi-copy"
            text
            rounded
            :title="t('settings.workflowForkToEdit')"
            :aria-label="t('settings.workflowForkToEdit')"
            :loading="forkSystemId === (data as any).id"
            @click="forkSystemWorkflow(data as any)"
          />
          <Button
            v-if="!(data as any).isSystem"
            icon="pi pi-copy"
            text
            rounded
            title="Duplicar"
            aria-label="Duplicar"
            @click="openDupOrg(data as any)"
          />
          <Button
            v-if="!(data as any).isSystem"
            icon="pi pi-trash"
            text
            rounded
            severity="danger"
            title="Eliminar"
            aria-label="Eliminar"
            @click="confirmDeleteWorkflow(data as any)"
          />
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="openDup" :header="t('settings.workflowDuplicate')" modal class="w-full max-w-md">
      <div class="space-y-3 py-2">
        <div>
          <label class="text-xs font-medium">{{ t('settings.workflowSource') }}</label>
          <Dropdown
            v-model="sourceId"
            :options="systemRows"
            option-label="name"
            option-value="id"
            class="w-full mt-1"
            :placeholder="t('legal.optional')"
          />
        </div>
        <div>
          <label class="text-xs font-medium">{{ t('settings.workflowColSlug') }}</label>
          <InputText v-model="dupSlug" class="w-full mt-1" />
        </div>
        <div>
          <label class="text-xs font-medium">{{ t('settings.workflowColName') }}</label>
          <InputText v-model="dupName" class="w-full mt-1" />
        </div>
      </div>
      <template #footer>
        <Button :label="t('common.cancel')" text @click="openDup = false" />
        <Button :label="t('common.create')" icon="pi pi-check" :loading="duplicating" @click="doDuplicate" />
      </template>
    </Dialog>

    <Dialog v-model:visible="openDupOrgDialog" header="Duplicar flujo de la oficina" modal class="w-full max-w-md">
      <div class="space-y-3 py-2">
        <p class="text-sm text-fg-muted">Origen: {{ dupOrgSource?.name }}</p>
        <div>
          <label class="text-xs font-medium">{{ t('settings.workflowColSlug') }}</label>
          <InputText v-model="dupOrgSlug" class="w-full mt-1" />
        </div>
        <div>
          <label class="text-xs font-medium">{{ t('settings.workflowColName') }}</label>
          <InputText v-model="dupOrgName" class="w-full mt-1" />
        </div>
      </div>
      <template #footer>
        <Button :label="t('common.cancel')" text @click="openDupOrgDialog = false" />
        <Button label="Duplicar" icon="pi pi-check" :loading="dupOrgLoading" @click="doDuplicateOrg" />
      </template>
    </Dialog>

    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import InputText from 'primevue/inputtext';
import ConfirmDialog from 'primevue/confirmdialog';
import PageHeader from '@/components/common/PageHeader.vue';
import { apiClient } from '@/api/client';

const { t } = useI18n();
const toast = useToast();
const confirm = useConfirm();
const route = useRoute();
const router = useRouter();

const highlightWorkflowId = computed(() => {
  const q = route.query.workflowId ?? route.query.highlight;
  return typeof q === 'string' ? q : Array.isArray(q) ? q[0] : null;
});

function workflowRowClass(row: { id?: string }) {
  if (highlightWorkflowId.value && row.id === highlightWorkflowId.value) {
    return 'bg-primary-50 dark:bg-primary-950/30';
  }
  return '';
}

const loading = ref(true);
const rows = ref<Array<Record<string, unknown>>>([]);
const openDup = ref(false);
const sourceId = ref<string | null>(null);
const dupSlug = ref('mi-flujo');
const dupName = ref('Mi flujo');
const duplicating = ref(false);

const openDupOrgDialog = ref(false);
const dupOrgSource = ref<{ id: string; name: string } | null>(null);
const dupOrgSlug = ref('copia-flujo');
const dupOrgName = ref('Copia');
const dupOrgLoading = ref(false);
const forkSystemId = ref<string | null>(null);

const systemRows = computed(() => rows.value.filter((r) => r.isSystem));

async function forkSystemWorkflow(row: { id: string; name: string; slug?: string }) {
  forkSystemId.value = row.id;
  try {
    const base = String(row.slug ?? 'workflow').replace(/-copy\d*$/i, '');
    const { data } = await apiClient.post<{ id: string }>('/workflow-definitions/duplicate', {
      sourceWorkflowId: row.id,
      slug: `${base}-copy`,
      name: `Copia de ${row.name}`,
    });
    const newId = (data as { id: string }).id;
    await router.push({ name: 'settings-workflow-edit', params: { id: newId } });
    toast.add({ severity: 'success', summary: t('settings.workflowDuplicated'), life: 3000 });
  } catch {
    toast.add({ severity: 'error', summary: t('settings.workflowDuplicateError'), life: 4000 });
  } finally {
    forkSystemId.value = null;
  }
}

async function load() {
  loading.value = true;
  try {
    const { data } = await apiClient.get('/workflow-definitions');
    rows.value = Array.isArray(data) ? data : [];
    if (!sourceId.value && systemRows.value.length) {
      sourceId.value = systemRows.value[0].id as string;
    }
  } catch {
    rows.value = [];
    toast.add({ severity: 'error', summary: t('settings.workflowLoadError'), life: 4000 });
  } finally {
    loading.value = false;
  }
}

async function doDuplicate() {
  if (!sourceId.value || !dupSlug.value.trim()) return;
  duplicating.value = true;
  try {
    await apiClient.post('/workflow-definitions/duplicate', {
      sourceWorkflowId: sourceId.value,
      slug: dupSlug.value.trim(),
      name: dupName.value.trim() || dupSlug.value.trim(),
    });
    openDup.value = false;
    await load();
    toast.add({ severity: 'success', summary: t('settings.workflowDuplicated'), life: 3000 });
  } catch {
    toast.add({ severity: 'error', summary: t('settings.workflowDuplicateError'), life: 4000 });
  } finally {
    duplicating.value = false;
  }
}

function openDupOrg(row: { id: string; name: string; slug?: string }) {
  dupOrgSource.value = row;
  dupOrgSlug.value = `${String(row.slug ?? 'flujo')}-copy`;
  dupOrgName.value = `Copia de ${row.name}`;
  openDupOrgDialog.value = true;
}

async function doDuplicateOrg() {
  if (!dupOrgSource.value || !dupOrgSlug.value.trim()) return;
  dupOrgLoading.value = true;
  try {
    await apiClient.post(`/workflow-definitions/${dupOrgSource.value.id}/duplicate`, {
      slug: dupOrgSlug.value.trim(),
      name: dupOrgName.value.trim() || dupOrgSlug.value.trim(),
    });
    openDupOrgDialog.value = false;
    await load();
    toast.add({ severity: 'success', summary: 'Flujo duplicado', life: 3000 });
  } catch {
    toast.add({ severity: 'error', summary: 'No se pudo duplicar', life: 4000 });
  } finally {
    dupOrgLoading.value = false;
  }
}

function confirmDeleteWorkflow(row: { id: string; name: string }) {
  confirm.require({
    message: `¿Eliminar el flujo «${row.name}»? No debe estar en uso por actuaciones ni plantillas.`,
    header: 'Confirmar',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Eliminar',
    rejectLabel: 'Cancelar',
    accept: async () => {
      try {
        await apiClient.delete(`/workflow-definitions/${row.id}`);
        await load();
        toast.add({ severity: 'success', summary: 'Flujo eliminado', life: 3000 });
      } catch (e: unknown) {
        const ax = e as { response?: { status?: number } };
        if (ax.response?.status === 409) {
          toast.add({
            severity: 'warn',
            summary: 'En uso',
            detail: 'Hay actuaciones o ítems de plantilla que usan este flujo.',
            life: 6000,
          });
        } else {
          toast.add({ severity: 'error', summary: 'No se pudo eliminar', life: 4000 });
        }
      }
    },
  });
}

onMounted(() => void load());
</script>
