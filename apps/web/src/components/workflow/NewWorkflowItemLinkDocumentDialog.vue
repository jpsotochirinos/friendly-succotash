<template>
  <Dialog
    :visible="modelValue"
    header="Nueva actividad vinculada a un archivo"
    modal
    class="w-full max-w-lg"
    :style="{ width: 'min(520px, 96vw)' }"
    @update:visible="emit('update:modelValue', $event)"
  >
    <p v-if="error" class="text-sm text-red-600 dark:text-red-400 mb-3">{{ error }}</p>
    <div class="flex flex-col gap-3 pt-1 max-h-[70vh] overflow-y-auto">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">Archivo a vincular *</label>
        <Dropdown
          v-model="linkDocumentId"
          :options="documentOptions"
          option-label="label"
          option-value="value"
          placeholder="Selecciona documento"
          filter
          class="w-full"
        />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">Título de la actividad *</label>
        <InputText v-model="form.title" placeholder="Ej. Revisión de escrito" class="w-full" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">Tipo (kind)</label>
        <Dropdown
          v-model="form.kind"
          :options="kindOptions"
          option-label="label"
          option-value="value"
          editable
          show-clear
          class="w-full"
        />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">Actuación padre (opcional)</label>
        <Dropdown
          v-model="form.parentId"
          :options="parentOptions"
          option-label="label"
          option-value="value"
          placeholder="Raíz del expediente"
          filter
          show-clear
          class="w-full"
        />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">Asignado a</label>
        <Dropdown
          v-model="form.assignedToId"
          :options="userOptions"
          option-label="label"
          option-value="value"
          placeholder="Opcional"
          filter
          show-clear
          class="w-full"
        />
      </div>
      <div class="flex items-center gap-2">
        <Checkbox v-model="form.isLegalDeadline" binary input-id="nw-legal" />
        <label for="nw-legal" class="text-sm">Plazo legal procesal</label>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">Inicio</label>
        <Calendar v-model="form.startDate" date-format="dd/mm/yy" show-icon class="w-full" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">Límite</label>
        <Calendar v-model="form.dueDate" date-format="dd/mm/yy" show-icon class="w-full" />
      </div>
    </div>
    <template #footer>
      <Button label="Cancelar" text @click="emit('update:modelValue', false)" />
      <Button
        label="Crear y vincular"
        icon="pi pi-check"
        :loading="saving"
        :disabled="!form.title?.trim() || !linkDocumentId"
        @click="submit"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import Calendar from 'primevue/calendar';
import Checkbox from 'primevue/checkbox';
import { apiClient } from '@/api/client';
import { flattenWorkflowTree } from '@/utils/flow-transformer';

const props = defineProps<{
  modelValue: boolean;
  trackableId: string;
  defaultDocumentId: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
  (e: 'created'): void;
}>();

const kindOptions = [
  { label: 'Actuación', value: 'Actuacion' },
  { label: 'Fase', value: 'Fase' },
  { label: 'Escrito', value: 'Escrito' },
  { label: 'Audiencia', value: 'Audiencia' },
  { label: 'Plazo', value: 'Plazo' },
];

const form = ref({
  title: '',
  kind: '',
  parentId: '' as string,
  assignedToId: '' as string,
  isLegalDeadline: false,
  startDate: null as Date | null,
  dueDate: null as Date | null,
});

const linkDocumentId = ref<string | null>(null);
const documentOptions = ref<{ label: string; value: string }[]>([]);
const parentOptions = ref<{ label: string; value: string }[]>([]);
const userOptions = ref<{ label: string; value: string }[]>([]);
const saving = ref(false);
const error = ref('');

async function loadDocuments() {
  const { data } = await apiClient.get('/documents', {
    params: { trackableId: props.trackableId, limit: 500, page: 1 },
  });
  const rows = data?.data ?? data ?? [];
  const list = Array.isArray(rows) ? rows : [];
  documentOptions.value = list.map((d: any) => ({
    label: d.title || d.id,
    value: d.id,
  }));
}

async function loadTree() {
  const { data } = await apiClient.get(`/trackables/${props.trackableId}/tree`);
  const tree = Array.isArray(data) ? data : [];
  const flat = flattenWorkflowTree(tree as any);
  parentOptions.value = flat.map((i: any) => ({
    label: `${'\u00A0'.repeat((i.depth ?? 0) * 2)}${i.title}${i.kind ? ` · ${i.kind}` : ''}`,
    value: i.id,
  }));
}

async function loadUsers() {
  const { data } = await apiClient.get('/users', { params: { limit: 200 } });
  const list = Array.isArray(data) ? data : data.data || [];
  userOptions.value = list.map((u: any) => ({
    label: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || u.id,
    value: u.id,
  }));
}

async function submit() {
  error.value = '';
  const title = form.value.title?.trim();
  if (!title || !linkDocumentId.value) return;
  saving.value = true;
  try {
    const payload: Record<string, unknown> = {
      title,
      trackableId: props.trackableId,
    };
    if (form.value.kind) payload.kind = form.value.kind;
    if (form.value.parentId) payload.parentId = form.value.parentId;
    if (form.value.assignedToId) payload.assignedToId = form.value.assignedToId;
    if (form.value.dueDate) payload.dueDate = form.value.dueDate.toISOString();
    if (form.value.startDate) payload.startDate = form.value.startDate.toISOString();
    if (form.value.isLegalDeadline) payload.isLegalDeadline = true;

    const { data: created } = await apiClient.post('/workflow-items', payload);
    const newId = created?.id;
    if (!newId) throw new Error('Sin id de actividad');

    await apiClient.post(`/documents/${linkDocumentId.value}/link-workflow-item`, {
      workflowItemId: newId,
    });

    emit('created');
    emit('update:modelValue', false);
    reset();
  } catch (e: any) {
    const msg = e?.response?.data?.message;
    error.value = Array.isArray(msg) ? msg.join(' ') : (msg || e?.message || 'Error al crear');
  } finally {
    saving.value = false;
  }
}

function reset() {
  form.value = {
    title: '',
    kind: '',
    parentId: '',
    assignedToId: '',
    isLegalDeadline: false,
    startDate: null,
    dueDate: null,
  };
  error.value = '';
}

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return;
    reset();
    linkDocumentId.value = props.defaultDocumentId;
    await Promise.all([loadDocuments(), loadTree(), loadUsers()]);
    if (!linkDocumentId.value && documentOptions.value.length === 1) {
      linkDocumentId.value = documentOptions.value[0].value;
    }
  },
);
</script>
