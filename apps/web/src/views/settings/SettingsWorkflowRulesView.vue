<template>
  <div class="flex flex-col gap-6 max-w-4xl">
    <PageHeader :title="$t('settings.workflowRulesTitle')" :subtitle="$t('settings.workflowRulesHint')" />

    <div v-if="!canManage" class="rounded-lg border p-4" :style="{ borderColor: 'var(--border-default)' }">
      {{ $t('settings.workflowRulesNoPerm') }}
    </div>

    <template v-else>
      <div class="flex justify-end">
        <Button :label="$t('settings.workflowRulesAdd')" icon="pi pi-plus" size="small" @click="openDialog()" />
      </div>

      <DataTable :value="rules" :loading="loading" striped-rows>
        <Column field="name" :header="$t('settings.workflowRulesColName')" />
        <Column field="event" :header="$t('settings.workflowRulesColEvent')" />
        <Column field="priority" :header="$t('settings.workflowRulesColPriority')" />
        <Column field="enabled" :header="$t('settings.workflowRulesColEnabled')">
          <template #body="{ data }">
            <Tag :severity="data.enabled ? 'success' : 'secondary'" :value="data.enabled ? $t('settings.yes') : $t('settings.no')" />
          </template>
        </Column>
        <Column :header="$t('common.actions')">
          <template #body="{ data }">
            <Button icon="pi pi-pencil" text rounded @click="openDialog(data)" />
            <Button icon="pi pi-trash" text rounded severity="danger" @click="removeRule(data)" />
          </template>
        </Column>
      </DataTable>

      <Dialog
        v-model:visible="dialogVisible"
        :header="editingId ? $t('settings.workflowRulesEdit') : $t('settings.workflowRulesAdd')"
        modal
        class="w-full max-w-2xl"
        @hide="editingId = null"
      >
        <div class="space-y-3 pt-2">
          <div>
            <label class="text-xs font-medium">{{ $t('settings.workflowRulesColName') }}</label>
            <InputText v-model="form.name" class="w-full mt-1" />
          </div>
          <div>
            <label class="text-xs font-medium">{{ $t('settings.workflowRulesColEvent') }}</label>
            <Dropdown
              v-model="form.event"
              :options="eventOptions"
              class="w-full mt-1"
              :placeholder="$t('legal.optional')"
            />
          </div>
          <div>
            <label class="text-xs font-medium">{{ $t('settings.workflowRulesConditionJson') }}</label>
            <Textarea v-model="form.conditionJson" rows="6" class="w-full mt-1 font-mono text-sm" />
          </div>
          <div>
            <label class="text-xs font-medium">{{ $t('settings.workflowRulesActionJson') }}</label>
            <Textarea v-model="form.actionJson" rows="4" class="w-full mt-1 font-mono text-sm" />
          </div>
          <div class="flex gap-4 items-center">
            <div>
              <label class="text-xs font-medium">{{ $t('settings.workflowRulesColPriority') }}</label>
              <InputNumber v-model="form.priority" class="w-full mt-1" :min="0" :max="1000" />
            </div>
            <div class="flex items-center gap-2 mt-6">
              <Checkbox v-model="form.enabled" binary input-id="rule-en" />
              <label for="rule-en" class="text-sm">{{ $t('settings.workflowRulesColEnabled') }}</label>
            </div>
          </div>
        </div>
        <template #footer>
          <Button :label="$t('common.cancel')" text @click="dialogVisible = false" />
          <Button :label="$t('common.save')" icon="pi pi-check" :loading="saving" @click="saveRule" />
        </template>
      </Dialog>
    </template>
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
import Textarea from 'primevue/textarea';
import InputNumber from 'primevue/inputnumber';
import Dropdown from 'primevue/dropdown';
import Checkbox from 'primevue/checkbox';
import Tag from 'primevue/tag';
import { useToast } from 'primevue/usetoast';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/api/client';
import PageHeader from '@/components/common/PageHeader.vue';

const { t } = useI18n();
const toast = useToast();
const auth = useAuthStore();

const canManage = computed(() => (auth.user?.permissions ?? []).includes('workflow:update'));

const loading = ref(false);
const rules = ref<any[]>([]);
const dialogVisible = ref(false);
const saving = ref(false);
const editingId = ref<string | null>(null);

const eventOptions = [
  'document.created',
  'document.updated',
  'document.uploaded',
  'document.submitted',
  'document.approved',
  'document.rejected',
  'workflow-item.status-changed',
  'time.hourly-tick',
  'sinoe.notification-received',
];

const form = ref({
  name: '',
  event: 'document.created',
  conditionJson: '{"all":[{"eq":["item.currentStateKey","pending"]}]}',
  actionJson: '{"type":"transition","to":"active"}',
  priority: 50,
  enabled: true,
});

async function load() {
  if (!canManage.value) return;
  loading.value = true;
  try {
    const { data } = await apiClient.get('/workflow-rules');
    rules.value = Array.isArray(data) ? data : [];
  } catch {
    rules.value = [];
    toast.add({ severity: 'error', summary: t('settings.workflowRulesLoadError'), life: 4000 });
  } finally {
    loading.value = false;
  }
}

function openDialog(row?: any) {
  if (row) {
    editingId.value = row.id;
    form.value = {
      name: row.name,
      event: row.event,
      conditionJson: JSON.stringify(row.condition ?? {}, null, 2),
      actionJson: JSON.stringify(row.action ?? {}, null, 2),
      priority: row.priority ?? 50,
      enabled: row.enabled !== false,
    };
  } else {
    editingId.value = null;
    resetForm();
  }
  dialogVisible.value = true;
}

function resetForm() {
  editingId.value = null;
  form.value = {
    name: '',
    event: 'document.created',
    conditionJson: '{"all":[{"eq":["item.currentStateKey","pending"]}]}',
    actionJson: '{"type":"transition","to":"active"}',
    priority: 50,
    enabled: true,
  };
}

async function saveRule() {
  let condition: Record<string, unknown>;
  let action: Record<string, unknown>;
  try {
    condition = JSON.parse(form.value.conditionJson);
    action = JSON.parse(form.value.actionJson);
  } catch {
    toast.add({ severity: 'warn', summary: t('settings.workflowRulesJsonError'), life: 4000 });
    return;
  }
  saving.value = true;
  try {
    const body = {
      name: form.value.name,
      event: form.value.event,
      condition,
      action,
      priority: form.value.priority,
      enabled: form.value.enabled,
    };
    if (editingId.value) {
      await apiClient.patch(`/workflow-rules/${editingId.value}`, body);
    } else {
      await apiClient.post('/workflow-rules', body);
    }
    dialogVisible.value = false;
    await load();
    toast.add({ severity: 'success', summary: t('settings.workflowRulesSaved'), life: 3000 });
  } catch {
    toast.add({ severity: 'error', summary: t('settings.workflowRulesSaveError'), life: 4000 });
  } finally {
    saving.value = false;
  }
}

async function removeRule(row: any) {
  if (!confirm(t('settings.workflowRulesDeleteConfirm'))) return;
  try {
    await apiClient.delete(`/workflow-rules/${row.id}`);
    await load();
    toast.add({ severity: 'success', summary: t('settings.workflowRulesDeleted'), life: 3000 });
  } catch {
    toast.add({ severity: 'error', summary: t('settings.workflowRulesDeleteError'), life: 4000 });
  }
}

onMounted(() => void load());
</script>
