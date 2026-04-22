<template>
  <div class="flex flex-col gap-6 max-w-6xl">
    <div class="flex flex-wrap items-center gap-3">
      <Button
        icon="pi pi-arrow-left"
        text
        :label="t('settings.workflowDefinitionsTitle')"
        @click="$router.push({ name: 'settings-workflows' })"
      />
    </div>
    <PageHeader :title="detail?.name || '…'" :subtitle="detail?.slug || ''" />

    <div v-if="loading" class="text-fg-muted">{{ t('app.loading') }}</div>

    <template v-else-if="detail">
      <div
        v-if="isSystemWorkflow"
        class="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <p class="m-0 text-sm text-amber-900 dark:text-amber-100">
          {{ t('settings.workflowSystemForkNotice') }}
        </p>
        <Button
          :label="t('settings.workflowForkToEdit')"
          icon="pi pi-copy"
          size="small"
          :loading="forkLoading"
          @click="duplicateSystemWorkflow"
        />
      </div>

      <div class="flex flex-wrap gap-3">
        <RouterLink
          v-if="canRules"
          :to="{ name: 'settings-workflow-rules' }"
          class="text-sm underline text-primary-600"
        >
          {{ t('settings.sections.workflowRules') }} →
        </RouterLink>
      </div>

      <TabView v-model:activeIndex="workflowEditTab" class="workflow-edit-tabs">
        <TabPanel :value="0" header="Metadatos">
          <div class="max-w-md space-y-3 pt-2">
            <div>
              <label class="text-xs font-medium">{{ t('settings.workflowColName') }}</label>
              <InputText v-model="editName" class="w-full mt-1" :disabled="!canEditWorkflow" />
            </div>
            <div>
              <label class="text-xs font-medium">{{ t('legal.actionType') }}</label>
              <Dropdown
                v-model="editActionType"
                :options="actionTypeOptions"
                option-label="label"
                option-value="value"
                show-clear
                class="w-full mt-1"
                :placeholder="t('legal.optional')"
                :disabled="!canEditWorkflow"
              />
            </div>
            <div class="flex items-center gap-2">
              <Checkbox
                v-model="editAppliesToAllTypes"
                binary
                input-id="wf-all-types"
                :disabled="!canEditWorkflow"
              />
              <label for="wf-all-types" class="text-sm">{{ t('settings.workflowAppliesToAllTypes') }}</label>
            </div>
            <Button
              v-if="canEditWorkflow"
              :label="t('common.save')"
              icon="pi pi-check"
              size="small"
              :loading="savingMeta"
              @click="saveMeta"
            />
          </div>
        </TabPanel>

        <TabPanel :value="1" header="Estados">
          <div v-if="canEditWorkflow" class="flex justify-end mb-2">
            <Button label="Nuevo estado" icon="pi pi-plus" size="small" @click="openStateDialog()" />
          </div>
          <DataTable :value="detail.states" data-key="id" striped-rows size="small">
            <Column field="key" header="Key" />
            <Column field="name" :header="t('settings.workflowColName')" />
            <Column field="category" header="Category" />
            <Column field="sortOrder" header="#" />
            <Column field="isInitial" header="Inicial">
              <template #body="{ data }">
                <Tag v-if="data.isInitial" severity="success" value="Sí" />
                <span v-else class="text-fg-muted">—</span>
              </template>
            </Column>
            <Column v-if="canEditWorkflow" :header="t('common.actions')" style="width: 8rem">
              <template #body="{ data }">
                <Button icon="pi pi-pencil" text rounded @click="openStateDialog(data)" />
                <Button icon="pi pi-trash" text rounded severity="danger" @click="confirmDeleteState(data)" />
              </template>
            </Column>
          </DataTable>
        </TabPanel>

        <TabPanel :value="2" header="Transiciones">
          <div v-if="canEditWorkflow" class="flex justify-end mb-2">
            <Button label="Nueva transición" icon="pi pi-plus" size="small" @click="openTransitionDialog()" />
          </div>
          <DataTable :value="detail.transitions" data-key="id" striped-rows size="small">
            <Column field="name" :header="t('settings.workflowColName')" />
            <Column field="fromKey" :header="t('settings.workflowFrom')" />
            <Column field="toKey" :header="t('settings.workflowTo')" />
            <Column field="requiredPermission" :header="t('settings.workflowPerm')" />
            <Column v-if="canEditWorkflow" :header="t('common.actions')" style="width: 8rem">
              <template #body="{ data }">
                <Button icon="pi pi-pencil" text rounded @click="openTransitionDialog(data)" />
                <Button icon="pi pi-trash" text rounded severity="danger" @click="confirmDeleteTransition(data)" />
              </template>
            </Column>
          </DataTable>
          <p class="mt-3 text-xs text-fg-muted">
            {{ t('settings.workflowRolesHint') }}
            <RouterLink :to="{ name: 'settings-roles' }" class="underline text-primary-600">{{
              t('settings.sections.roles')
            }}</RouterLink>
          </p>
        </TabPanel>

        <TabPanel :value="3" header="Grafo">
          <div class="h-[28rem] w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-ground)]">
            <VueFlow
              v-if="previewNodes.length"
              :nodes="previewNodes"
              :edges="previewEdges"
              :fit-view-on-init="true"
              :nodes-draggable="false"
              :nodes-connectable="false"
              :elements-selectable="false"
              :zoom-on-scroll="true"
              :pan-on-drag="true"
              class="h-full"
            >
              <Background pattern-color="#aaa" :gap="16" />
              <Controls />
            </VueFlow>
            <div v-else class="flex h-full items-center justify-center text-fg-muted text-sm">Sin estados</div>
          </div>
        </TabPanel>

        <TabPanel :value="4" header="Permisos (resumen)">
          <DataTable :value="detail.transitions" data-key="id" striped-rows size="small">
            <Column field="name" header="Transición" />
            <Column field="requiredPermission" :header="t('settings.workflowPerm')">
              <template #body="{ data }">
                <span class="font-mono text-xs">{{ data.requiredPermission || '—' }}</span>
              </template>
            </Column>
          </DataTable>
        </TabPanel>
      </TabView>
    </template>

    <Dialog
      v-model:visible="stateDialogVisible"
      :header="stateEditId ? 'Editar estado' : 'Nuevo estado'"
      modal
      class="w-full max-w-md"
    >
      <div v-if="detail?.organizationId" class="space-y-3 py-2">
        <div>
          <label class="text-xs font-medium">Key</label>
          <InputText v-model="stateForm.key" class="w-full mt-1" placeholder="ej. in_progress" />
        </div>
        <div>
          <label class="text-xs font-medium">Nombre</label>
          <InputText v-model="stateForm.name" class="w-full mt-1" />
        </div>
        <div>
          <label class="text-xs font-medium">Category</label>
          <Dropdown
            v-model="stateForm.category"
            :options="categoryOptions"
            option-label="label"
            option-value="value"
            class="w-full mt-1"
          />
        </div>
        <div>
          <label class="text-xs font-medium">Orden</label>
          <InputNumber v-model="stateForm.sortOrder" class="w-full mt-1" :min="0" />
        </div>
        <div>
          <label class="text-xs font-medium">Color (opcional)</label>
          <InputText v-model="stateForm.color" class="w-full mt-1" placeholder="#RRGGBB" />
        </div>
        <div class="flex items-center gap-2">
          <Checkbox v-model="stateForm.isInitial" binary input-id="st-init" />
          <label for="st-init" class="text-sm">Estado inicial</label>
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" text @click="stateDialogVisible = false" />
        <Button label="Guardar" icon="pi pi-check" :loading="stateSaving" @click="saveState" />
      </template>
    </Dialog>

    <Dialog
      v-model:visible="transitionDialogVisible"
      :header="transitionEditId ? 'Editar transición' : 'Nueva transición'"
      modal
      class="w-full max-w-md"
    >
      <div v-if="detail?.organizationId" class="space-y-3 py-2">
        <div v-if="!transitionEditId">
          <label class="text-xs font-medium">Desde estado</label>
          <Dropdown
            v-model="transitionForm.fromStateId"
            :options="stateOptions"
            option-label="label"
            option-value="value"
            class="w-full mt-1"
            placeholder="Estado origen"
          />
        </div>
        <div v-if="!transitionEditId">
          <label class="text-xs font-medium">Hacia estado</label>
          <Dropdown
            v-model="transitionForm.toStateId"
            :options="stateOptions"
            option-label="label"
            option-value="value"
            class="w-full mt-1"
            placeholder="Estado destino"
          />
        </div>
        <div>
          <label class="text-xs font-medium">Nombre de la transición</label>
          <InputText v-model="transitionForm.name" class="w-full mt-1" />
        </div>
        <div>
          <label class="text-xs font-medium">Permiso requerido</label>
          <Dropdown
            v-model="transitionForm.requiredPermission"
            :options="permissionOptions"
            option-label="label"
            option-value="value"
            show-clear
            class="w-full mt-1"
            placeholder="Opcional"
          />
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" text @click="transitionDialogVisible = false" />
        <Button label="Guardar" icon="pi pi-check" :loading="transitionSaving" @click="saveTransition" />
      </template>
    </Dialog>

    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Dropdown from 'primevue/dropdown';
import Checkbox from 'primevue/checkbox';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import ConfirmDialog from 'primevue/confirmdialog';
import { VueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import PageHeader from '@/components/common/PageHeader.vue';
import { apiClient } from '@/api/client';
import { usePermissions } from '@/composables/usePermissions';
import { MarkerType, type Node, type Edge } from '@vue-flow/core';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const toast = useToast();
const confirm = useConfirm();
const { permissions } = usePermissions();
const canRules = computed(() => permissions.value?.includes('workflow:update'));

const id = computed(() => route.params.id as string);
const loading = ref(true);
type WfState = {
  id: string;
  key: string;
  name: string;
  category: string;
  sortOrder: number;
  isInitial?: boolean;
  color?: string | null;
};
type WfTransition = {
  id: string;
  name: string;
  fromKey: string | null;
  toKey: string;
  fromStateId: string | null;
  toStateId: string;
  requiredPermission: string | null;
};
const detail = ref<{
  id: string;
  name: string;
  slug: string;
  organizationId?: string | null;
  states: WfState[];
  transitions: WfTransition[];
} | null>(null);
const editName = ref('');
const editActionType = ref<string | null>(null);
const editAppliesToAllTypes = ref(false);
const savingMeta = ref(false);
const workflowEditTab = ref(0);
const forkLoading = ref(false);

const canEditWorkflow = computed(() => !!detail.value?.organizationId);
const isSystemWorkflow = computed(() => !!detail.value && !detail.value.organizationId);

function syncTabFromRoute() {
  if (route.query.tab === 'preview') workflowEditTab.value = 3;
}

watch(
  () => route.query.tab,
  () => syncTabFromRoute(),
);

async function duplicateSystemWorkflow() {
  if (!detail.value?.id || detail.value.organizationId) return;
  forkLoading.value = true;
  try {
    const baseSlug = (detail.value.slug || 'workflow').replace(/-copy\d*$/i, '');
    const { data } = await apiClient.post<{ id: string } & Record<string, unknown>>('/workflow-definitions/duplicate', {
      sourceWorkflowId: detail.value.id,
      slug: `${baseSlug}-copy`,
      name: `Copia de ${detail.value.name}`,
    });
    const newId = (data as { id: string }).id;
    toast.add({ severity: 'success', summary: t('settings.workflowDuplicated'), life: 3000 });
    await router.push({ name: 'settings-workflow-edit', params: { id: newId } });
  } catch {
    toast.add({ severity: 'error', summary: t('settings.workflowDuplicateError'), life: 4000 });
  } finally {
    forkLoading.value = false;
  }
}

const actionTypeOptions = [
  { label: 'Creación de documento', value: 'doc_creation' },
  { label: 'Carga de documento', value: 'doc_upload' },
  { label: 'Aprobación', value: 'approval' },
  { label: 'Ingreso de datos', value: 'data_entry' },
  { label: 'Verificación externa', value: 'external_check' },
  { label: 'Notificación', value: 'notification' },
  { label: 'Presentar escrito', value: 'file_brief' },
  { label: 'Audiencia / vista', value: 'schedule_hearing' },
  { label: 'Pago de tasa judicial', value: 'pay_court_fee' },
  { label: 'Notificar partes', value: 'notify_party' },
  { label: 'Genérico', value: 'generic' },
];

const categoryOptions = [
  { label: 'Por hacer (todo)', value: 'todo' },
  { label: 'En curso', value: 'in_progress' },
  { label: 'En revisión', value: 'in_review' },
  { label: 'Hecho', value: 'done' },
  { label: 'Cancelado', value: 'cancelled' },
];

const permissionOptions = [
  { label: '(ninguno)', value: '' },
  { label: 'workflow:update', value: 'workflow:update' },
  { label: 'workflow:review', value: 'workflow:review' },
  { label: 'workflow:validate', value: 'workflow:validate' },
  { label: 'workflow:close', value: 'workflow:close' },
  { label: 'workflow:reject', value: 'workflow:reject' },
  { label: 'workflow:skip', value: 'workflow:skip' },
  { label: 'workflow:assign', value: 'workflow:assign' },
];

const stateDialogVisible = ref(false);
const stateEditId = ref<string | null>(null);
const stateSaving = ref(false);
const stateForm = ref({
  key: '',
  name: '',
  category: 'todo',
  sortOrder: 0,
  color: '',
  isInitial: false,
});

const transitionDialogVisible = ref(false);
const transitionEditId = ref<string | null>(null);
const transitionSaving = ref(false);
const transitionForm = ref({
  fromStateId: '' as string,
  toStateId: '' as string,
  name: '',
  requiredPermission: '' as string | null,
});

const stateOptions = computed(() =>
  (detail.value?.states ?? []).map((s) => ({
    label: `${s.key} — ${s.name}`,
    value: s.id,
  })),
);

const CATEGORY_ORDER = ['todo', 'in_progress', 'in_review', 'done', 'cancelled'] as const;
const COL_W = 260;
const ROW_H = 110;

function categoryFallbackBorder(cat: string): string {
  switch (cat) {
    case 'todo':
      return '#64748b';
    case 'in_progress':
      return '#6366f1';
    case 'in_review':
      return '#d97706';
    case 'done':
      return '#16a34a';
    case 'cancelled':
      return '#dc2626';
    default:
      return '#94a3b8';
  }
}

function columnIndexForCategory(cat: string): number {
  const i = (CATEGORY_ORDER as readonly string[]).indexOf(cat);
  return i >= 0 ? i : 0;
}

const previewNodes = computed<Node[]>(() => {
  const states = detail.value?.states ?? [];
  const byCat = new Map<string, WfState[]>();
  for (const s of states) {
    const cat = s.category || 'todo';
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat)!.push(s);
  }
  const nodes: Node[] = [];
  for (const cat of CATEGORY_ORDER) {
    const list = (byCat.get(cat) ?? []).sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.key.localeCompare(b.key),
    );
    const col = columnIndexForCategory(cat);
    list.forEach((s, idx) => {
      const border = s.color?.trim() ? s.color.trim() : categoryFallbackBorder(cat);
      nodes.push({
        id: s.id,
        position: { x: col * COL_W + 24, y: idx * ROW_H + 24 },
        data: { label: `${s.key}\n${s.name}` },
        style: {
          border: `2px solid ${border}`,
          borderRadius: '8px',
          padding: '8px 12px',
          background: 'var(--surface-ground)',
          color: 'var(--fg-default)',
          fontSize: '12px',
          minWidth: '140px',
          textAlign: 'center',
        },
      });
    });
    byCat.delete(cat);
  }
  // Any remaining categories (unknown keys)
  let extraCol = CATEGORY_ORDER.length;
  for (const [cat, list] of byCat) {
    const sorted = [...list].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.key.localeCompare(b.key),
    );
    sorted.forEach((s, idx) => {
      const border = s.color?.trim() ? s.color.trim() : categoryFallbackBorder(cat);
      nodes.push({
        id: s.id,
        position: { x: extraCol * COL_W + 24, y: idx * ROW_H + 24 },
        data: { label: `${s.key}\n${s.name}` },
        style: {
          border: `2px solid ${border}`,
          borderRadius: '8px',
          padding: '8px 12px',
          background: 'var(--surface-ground)',
          color: 'var(--fg-default)',
          fontSize: '12px',
          minWidth: '140px',
          textAlign: 'center',
        },
      });
    });
    extraCol += 1;
  }
  return nodes;
});

const previewEdges = computed<Edge[]>(() => {
  const tr = detail.value?.transitions ?? [];
  return tr
    .filter((t) => t.fromStateId)
    .map((t) => ({
      id: t.id,
      source: t.fromStateId!,
      target: t.toStateId,
      label: t.name,
      type: 'smoothstep' as const,
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
    }));
});

function openStateDialog(row?: WfState) {
  stateEditId.value = row?.id ?? null;
  if (row) {
    stateForm.value = {
      key: row.key,
      name: row.name,
      category: row.category,
      sortOrder: row.sortOrder ?? 0,
      color: row.color ?? '',
      isInitial: !!row.isInitial,
    };
  } else {
    stateForm.value = {
      key: '',
      name: '',
      category: 'todo',
      sortOrder: (detail.value?.states?.length ?? 0) * 10,
      color: '',
      isInitial: false,
    };
  }
  stateDialogVisible.value = true;
}

async function saveState() {
  if (!detail.value?.organizationId) return;
  stateSaving.value = true;
  try {
    const body = {
      key: stateForm.value.key.trim(),
      name: stateForm.value.name.trim(),
      category: stateForm.value.category,
      sortOrder: stateForm.value.sortOrder,
      color: stateForm.value.color.trim() ? stateForm.value.color.trim() : null,
      isInitial: stateForm.value.isInitial,
    };
    if (stateEditId.value) {
      await apiClient.patch(`/workflow-definitions/${id.value}/states/${stateEditId.value}`, body);
    } else {
      await apiClient.post(`/workflow-definitions/${id.value}/states`, body);
    }
    stateDialogVisible.value = false;
    await load();
    toast.add({ severity: 'success', summary: 'Estado guardado', life: 3000 });
  } catch {
    toast.add({ severity: 'error', summary: 'No se pudo guardar el estado', life: 4000 });
  } finally {
    stateSaving.value = false;
  }
}

function confirmDeleteState(row: WfState) {
  confirm.require({
    message: `¿Eliminar el estado «${row.key}»? Se borrarán las transiciones que lo usen.`,
    header: 'Confirmar',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Eliminar',
    rejectLabel: 'Cancelar',
    accept: async () => {
      try {
        await apiClient.delete(`/workflow-definitions/${id.value}/states/${row.id}`);
        await load();
        toast.add({ severity: 'success', summary: 'Estado eliminado', life: 3000 });
      } catch {
        toast.add({ severity: 'error', summary: 'No se pudo eliminar (¿hay actuaciones en ese estado?)', life: 5000 });
      }
    },
  });
}

function openTransitionDialog(row?: WfTransition) {
  transitionEditId.value = row?.id ?? null;
  if (row) {
    transitionForm.value = {
      fromStateId: row.fromStateId ?? '',
      toStateId: row.toStateId,
      name: row.name,
      requiredPermission: row.requiredPermission ?? '',
    };
  } else {
    transitionForm.value = {
      fromStateId: '',
      toStateId: '',
      name: '',
      requiredPermission: '',
    };
  }
  transitionDialogVisible.value = true;
}

async function saveTransition() {
  if (!detail.value?.organizationId) return;
  transitionSaving.value = true;
  try {
    if (transitionEditId.value) {
      await apiClient.patch(`/workflow-definitions/${id.value}/transitions/${transitionEditId.value}`, {
        name: transitionForm.value.name.trim(),
        requiredPermission: transitionForm.value.requiredPermission || null,
      });
    } else {
      if (!transitionForm.value.fromStateId || !transitionForm.value.toStateId) {
        toast.add({ severity: 'warn', summary: 'Elige origen y destino', life: 3000 });
        transitionSaving.value = false;
        return;
      }
      await apiClient.post(`/workflow-definitions/${id.value}/transitions`, {
        fromStateId: transitionForm.value.fromStateId,
        toStateId: transitionForm.value.toStateId,
        name: transitionForm.value.name.trim(),
        requiredPermission: transitionForm.value.requiredPermission || null,
      });
    }
    transitionDialogVisible.value = false;
    await load();
    toast.add({ severity: 'success', summary: 'Transición guardada', life: 3000 });
  } catch {
    toast.add({ severity: 'error', summary: 'No se pudo guardar la transición', life: 4000 });
  } finally {
    transitionSaving.value = false;
  }
}

function confirmDeleteTransition(row: WfTransition) {
  confirm.require({
    message: `¿Eliminar la transición «${row.name}»?`,
    header: 'Confirmar',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Eliminar',
    rejectLabel: 'Cancelar',
    accept: async () => {
      try {
        await apiClient.delete(`/workflow-definitions/${id.value}/transitions/${row.id}`);
        await load();
        toast.add({ severity: 'success', summary: 'Transición eliminada', life: 3000 });
      } catch {
        toast.add({ severity: 'error', summary: 'No se pudo eliminar', life: 4000 });
      }
    },
  });
}

async function load() {
  loading.value = true;
  try {
    const { data } = await apiClient.get(`/workflow-definitions/${id.value}`);
    detail.value = data as any;
    editName.value = (data as any).name ?? '';
    editActionType.value = (data as any).actionType ?? null;
    editAppliesToAllTypes.value = !!(data as any).appliesToAllTypes;
  } catch {
    detail.value = null;
    toast.add({ severity: 'error', summary: t('settings.workflowLoadError'), life: 4000 });
  } finally {
    loading.value = false;
  }
}

async function saveMeta() {
  if (!detail.value?.organizationId) return;
  savingMeta.value = true;
  try {
    await apiClient.patch(`/workflow-definitions/${id.value}`, {
      name: editName.value.trim(),
      actionType: editActionType.value,
      appliesToAllTypes: editAppliesToAllTypes.value,
    });
    await load();
    toast.add({ severity: 'success', summary: t('settings.orgSaved'), life: 3000 });
  } catch {
    toast.add({ severity: 'error', summary: t('settings.orgSaveError'), life: 4000 });
  } finally {
    savingMeta.value = false;
  }
}

onMounted(async () => {
  await load();
  syncTabFromRoute();
});
</script>
