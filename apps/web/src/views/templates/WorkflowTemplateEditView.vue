<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <Button icon="pi pi-arrow-left" text :label="$t('legal.backToCatalog')" @click="$router.push({ name: 'settings-workflow-templates' })" />
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-2">
          {{ meta?.name || '…' }}
        </h1>
        <p v-if="meta?.description" class="text-sm text-gray-600 dark:text-gray-400">{{ meta.description }}</p>
      </div>
      <Tag v-if="meta?.isSystem" severity="info" :value="$t('legal.systemReadOnly')" />
    </div>

    <div v-if="loading" class="py-12 text-center text-gray-500">{{ $t('app.loading') }}</div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <template #title>{{ $t('legal.templateTree') }}</template>
        <template #content>
          <Tree
            :value="primeNodes"
            selection-mode="single"
            @node-select="onSelect"
          />
          <p v-if="!primeNodes.length" class="text-sm text-gray-500 py-4">{{ $t('legal.emptyTemplate') }}</p>
          <div v-if="meta && !meta.isSystem" class="mt-4 flex flex-wrap gap-2">
            <Button
              size="small"
              icon="pi pi-plus"
              :label="$t('legal.addRootItem')"
              outlined
              @click="startAdd(null)"
            />
          </div>
        </template>
      </Card>

      <Card>
        <template #title>{{ $t('legal.itemDetails') }}</template>
        <template #content>
          <div v-if="meta?.isSystem" class="text-sm text-gray-600 dark:text-gray-400">
            {{ $t('legal.systemTemplateHint') }}
          </div>

          <div v-else-if="selected" class="space-y-3">
            <div>
              <label class="text-xs font-medium">{{ $t('legal.itemTitle') }}</label>
              <InputText v-model="edit.title" class="w-full mt-1" />
            </div>
            <div>
              <label class="text-xs font-medium">{{ $t('legal.kind') }}</label>
              <InputText v-model="edit.kind" class="w-full mt-1" :placeholder="$t('legal.kindPlaceholder')" />
            </div>
            <div>
              <label class="text-xs font-medium">{{ $t('legal.offsetDays') }}</label>
              <InputNumber v-model="edit.offsetDays" class="w-full mt-1" :min="0" :max="3650" show-buttons />
            </div>
            <div>
              <label class="text-xs font-medium">{{ $t('legal.actionType') }}</label>
              <Dropdown
                v-model="edit.actionType"
                :options="actionTypeOptions"
                option-label="label"
                option-value="value"
                show-clear
                class="w-full mt-1"
                :placeholder="$t('legal.optional')"
              />
            </div>
            <div v-if="selectedIsLeaf" class="space-y-1">
              <label class="text-xs font-medium">{{ $t('legal.workflowDefinitionLeaf') }}</label>
              <Dropdown
                v-model="edit.workflowId"
                :options="workflowOptions"
                option-label="label"
                option-value="value"
                show-clear
                class="w-full mt-1"
                :placeholder="$t('legal.optional')"
              />
            </div>
            <div class="flex items-center gap-2">
              <Checkbox v-model="edit.requiresDocument" binary input-id="req-doc" />
              <label for="req-doc" class="text-sm">{{ $t('legal.requiresDocument') }}</label>
            </div>
            <div>
              <label class="text-xs font-medium">{{ $t('legal.templateTriggers') }}</label>
              <Textarea
                v-model="edit.triggersRaw"
                rows="4"
                class="w-full mt-1 font-mono text-xs"
                :placeholder="$t('legal.templateTriggersPlaceholder')"
              />
            </div>
            <div class="flex flex-wrap gap-2 pt-2">
              <Button :label="$t('common.save')" icon="pi pi-check" size="small" :loading="saving" @click="saveItem" />
              <Button
                :label="$t('legal.addChildItem')"
                icon="pi pi-plus"
                size="small"
                outlined
                @click="startAdd(selected.id)"
              />
              <Button
                :label="$t('common.delete')"
                icon="pi pi-trash"
                size="small"
                severity="danger"
                outlined
                :loading="deleting"
                @click="removeItem"
              />
            </div>
          </div>

          <div v-else-if="adding" class="space-y-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
            <p class="text-sm font-medium">{{ addParentId ? $t('legal.addChildItem') : $t('legal.addRootItem') }}</p>
            <InputText v-model="addForm.title" class="w-full" :placeholder="$t('legal.itemTitle')" />
            <div class="flex gap-2">
              <Button :label="$t('common.create')" size="small" :loading="addSaving" @click="submitAdd" />
              <Button :label="$t('common.cancel')" text size="small" @click="cancelAdd" />
            </div>
          </div>

          <p v-else class="text-sm text-gray-500">{{ $t('legal.selectNode') }}</p>
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Dropdown from 'primevue/dropdown';
import Tree from 'primevue/tree';
import type { TreeNode } from 'primevue/treenode';
import Card from 'primevue/card';
import Tag from 'primevue/tag';
import Checkbox from 'primevue/checkbox';
import Textarea from 'primevue/textarea';
import { useToast } from 'primevue/usetoast';
import { apiClient } from '@/api/client';

interface TplNode {
  id: string;
  title: string;
  description?: string;
  kind?: string | null;
  actionType?: string | null;
  sortOrder?: number;
  offsetDays?: number | null;
  requiresDocument?: boolean;
  parentId?: string | null;
  children?: TplNode[];
  triggers?: Record<string, unknown>[] | null;
  workflowId?: string | null;
  currentStateId?: string | null;
}

const route = useRoute();
const { t } = useI18n();
const toast = useToast();
const templateId = route.params.id as string;

const loading = ref(true);
const meta = ref<{
  id: string;
  name: string;
  description?: string;
  matterType: string;
  isSystem: boolean;
} | null>(null);
const tree = ref<TplNode[]>([]);

const selected = ref<TplNode | null>(null);
const edit = ref({
  title: '',
  kind: '' as string,
  offsetDays: null as number | null,
  actionType: null as string | null,
  requiresDocument: false,
  triggersRaw: '' as string,
  workflowId: null as string | null,
});
const workflowOptions = ref<Array<{ label: string; value: string }>>([]);

const selectedIsLeaf = computed(
  () => selected.value && (!selected.value.children || selected.value.children.length === 0),
);
const saving = ref(false);
const deleting = ref(false);

const adding = ref(false);
const addParentId = ref<string | null>(null);
const addForm = ref({ title: '' });
const addSaving = ref(false);

const actionTypeOptions = computed(() => [
  { value: 'doc_creation', label: t('legal.action.doc_creation') },
  { value: 'doc_upload', label: t('legal.action.doc_upload') },
  { value: 'approval', label: t('legal.action.approval') },
  { value: 'file_brief', label: t('legal.action.file_brief') },
  { value: 'schedule_hearing', label: t('legal.action.schedule_hearing') },
  { value: 'pay_court_fee', label: t('legal.action.pay_court_fee') },
  { value: 'notify_party', label: t('legal.action.notify_party') },
  { value: 'generic', label: t('legal.action.generic') },
]);

function buildPrime(nodes: TplNode[]): any[] {
  return nodes.map((n) => ({
    key: n.id,
    label: `${n.title}${n.kind ? ` · ${n.kind}` : ''}`,
    data: n,
    children: n.children?.length ? buildPrime(n.children) : undefined,
  }));
}

const primeNodes = computed(() => buildPrime(tree.value));

function onSelect(node: TreeNode) {
  adding.value = false;
  const d = node.data as TplNode | undefined;
  if (!d) return;
  selected.value = d;
  edit.value = {
    title: d.title,
    kind: d.kind || '',
    offsetDays: d.offsetDays ?? null,
    actionType: d.actionType ?? null,
    requiresDocument: !!d.requiresDocument,
    triggersRaw: d.triggers?.length ? JSON.stringify(d.triggers, null, 2) : '',
    workflowId: d.workflowId ?? null,
  };
}

async function loadWorkflowDefs() {
  try {
    const { data } = await apiClient.get<Array<{ id: string; name: string; slug: string }>>('/workflow-definitions');
    const rows = Array.isArray(data) ? data : [];
    workflowOptions.value = rows.map((w) => ({
      value: w.id,
      label: `${w.name} (${w.slug})`,
    }));
  } catch {
    workflowOptions.value = [];
  }
}

async function load() {
  loading.value = true;
  try {
    await loadWorkflowDefs();
    const { data } = await apiClient.get(`/workflow-templates/${templateId}`);
    meta.value = data.template;
    tree.value = Array.isArray(data.tree) ? data.tree : [];
    selected.value = null;
  } catch {
    meta.value = null;
    tree.value = [];
    toast.add({ severity: 'error', summary: t('legal.loadTemplateError'), life: 4000 });
  } finally {
    loading.value = false;
  }
}

async function saveItem() {
  if (!selected.value || meta.value?.isSystem) return;
  let triggers: Record<string, unknown>[] | undefined;
  const raw = edit.value.triggersRaw?.trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      triggers = Array.isArray(parsed) ? parsed : undefined;
      if (!triggers) {
        toast.add({ severity: 'warn', summary: t('legal.templateTriggersInvalid'), life: 4000 });
        return;
      }
    } catch {
      toast.add({ severity: 'warn', summary: t('legal.templateTriggersInvalid'), life: 4000 });
      return;
    }
  }
  saving.value = true;
  try {
    const patch: Record<string, unknown> = {
      title: edit.value.title,
      kind: edit.value.kind || undefined,
      offsetDays: edit.value.offsetDays ?? undefined,
      actionType: edit.value.actionType || undefined,
      requiresDocument: edit.value.requiresDocument,
      triggers: raw ? triggers : undefined,
    };
    if (selectedIsLeaf.value) {
      patch.workflowId = edit.value.workflowId || null;
    }
    await apiClient.patch(`/workflow-templates/${templateId}/items/${selected.value.id}`, patch);
    await load();
    toast.add({ severity: 'success', summary: t('legal.itemSaved'), life: 3000 });
  } catch {
    toast.add({ severity: 'error', summary: t('legal.itemSaveError'), life: 4000 });
  } finally {
    saving.value = false;
  }
}

function startAdd(parentId: string | null) {
  if (meta.value?.isSystem) return;
  selected.value = null;
  adding.value = true;
  addParentId.value = parentId;
  addForm.value = { title: '' };
}

function cancelAdd() {
  adding.value = false;
  addParentId.value = null;
}

async function submitAdd() {
  if (!addForm.value.title.trim()) {
    toast.add({ severity: 'warn', summary: t('legal.nameRequired'), life: 3000 });
    return;
  }
  addSaving.value = true;
  try {
    await apiClient.post(`/workflow-templates/${templateId}/items`, {
      title: addForm.value.title.trim(),
      parentId: addParentId.value || undefined,
    });
    cancelAdd();
    await load();
    toast.add({ severity: 'success', summary: t('legal.itemCreated'), life: 3000 });
  } catch {
    toast.add({ severity: 'error', summary: t('legal.itemCreateError'), life: 4000 });
  } finally {
    addSaving.value = false;
  }
}

async function removeItem() {
  if (!selected.value || meta.value?.isSystem) return;
  deleting.value = true;
  try {
    await apiClient.delete(`/workflow-templates/${templateId}/items/${selected.value.id}`);
    selected.value = null;
    await load();
    toast.add({ severity: 'success', summary: t('legal.itemDeleted'), life: 3000 });
  } catch {
    toast.add({ severity: 'error', summary: t('legal.itemDeleteError'), life: 4000 });
  } finally {
    deleting.value = false;
  }
}

onMounted(() => void load());
</script>
