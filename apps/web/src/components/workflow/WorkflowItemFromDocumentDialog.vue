<template>
  <Dialog
    :visible="modelValue"
    :header="dialogHeader"
    modal
    class="w-full max-w-2xl"
    :style="{ width: 'min(640px, 96vw)' }"
    @update:visible="onVisible"
  >
    <div v-if="!document" class="text-sm text-gray-500">Sin documento.</div>

    <div v-else-if="!document.workflowItem?.id" class="space-y-4">
      <p class="text-sm text-gray-600 dark:text-gray-400">
        No hay actividad asociada a <strong>{{ document.title }}</strong>. Puedes crear una nueva actividad y vincularla a este u otro archivo del expediente.
      </p>
      <Button
        v-if="permissions.create"
        label="Nueva actividad vinculada"
        icon="pi pi-plus"
        @click="$emit('requestCreate')"
      />
    </div>

    <div v-else-if="!permissions.read" class="text-sm text-gray-500">
      No tienes permiso para ver actividades de este expediente.
    </div>

    <div v-else class="space-y-4">
      <TabView v-if="permissions.read">
        <TabPanel value="0" header="Actividad">
          <div v-if="detailLoading" class="py-8 text-center text-gray-500">
            <i class="pi pi-spin pi-spinner" />
          </div>
          <div v-else-if="detailError" class="text-sm text-red-600">{{ detailError }}</div>
          <div v-else-if="editing" class="flex flex-col gap-3 max-h-[55vh] overflow-y-auto pr-1">
            <div class="flex items-center gap-2 flex-wrap">
              <StatusBadge :status="editing.status" />
              <span v-if="editing.kind" class="text-xs text-gray-500">{{ editing.kind }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-medium">Título</label>
              <InputText v-model="editing.title" :disabled="!permissions.edit" class="w-full" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-medium">Tipo (kind)</label>
              <Dropdown
                v-model="editing.kind"
                :options="kindOptions"
                option-label="label"
                option-value="value"
                placeholder="Opcional"
                editable
                show-clear
                class="w-full"
                :disabled="!permissions.edit"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-medium">Descripción</label>
              <Textarea v-model="editing.description" rows="3" class="w-full" :disabled="!permissions.edit" auto-resize />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-medium">Asignado a</label>
              <Dropdown
                v-model="editing.assignedToId"
                :options="userOptions"
                option-label="label"
                option-value="value"
                placeholder="Opcional"
                filter
                show-clear
                class="w-full"
                :disabled="!permissions.edit"
              />
            </div>
            <div class="flex items-center gap-2">
              <Checkbox v-model="editing.isLegalDeadline" binary :disabled="!permissions.edit" input-id="wf-modal-legal" />
              <label for="wf-modal-legal" class="text-sm">Plazo legal procesal</label>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-medium">Inicio</label>
              <Calendar
                :model-value="dateFromIso(editing.startDate)"
                date-format="dd/mm/yy"
                show-icon
                class="w-full"
                :disabled="!permissions.edit"
                @update:model-value="onStartDate"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-medium">Límite</label>
              <Calendar
                :model-value="dateFromIso(editing.dueDate)"
                date-format="dd/mm/yy"
                show-icon
                class="w-full"
                :disabled="!permissions.edit"
                @update:model-value="onDueDate"
              />
            </div>

            <div class="border-t border-gray-200 dark:border-gray-600 pt-3">
              <p class="text-sm font-medium mb-2">Comentarios</p>
              <div v-if="commentsLoading" class="text-xs text-gray-500">Cargando…</div>
              <div v-else class="space-y-2 max-h-36 overflow-y-auto mb-2">
                <div
                  v-for="c in comments"
                  :key="c.id"
                  class="text-xs rounded-lg bg-gray-50 dark:bg-gray-800/80 p-2 border border-gray-100 dark:border-gray-700"
                >
                  <span class="font-medium text-gray-700 dark:text-gray-300">{{ commentAuthor(c) }}</span>
                  <span class="text-gray-400 ml-1">{{ formatShortDate(c.createdAt) }}</span>
                  <p class="mt-1 text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{{ c.body }}</p>
                </div>
                <p v-if="!comments.length" class="text-xs text-gray-400">Sin comentarios aún.</p>
              </div>
              <div v-if="permissions.comment || permissions.edit" class="flex gap-2">
                <Textarea
                  v-model="newCommentText"
                  rows="2"
                  class="flex-1"
                  placeholder="Escribe un comentario…"
                  @keydown.ctrl.enter.prevent="postComment"
                />
                <Button
                  icon="pi pi-send"
                  :disabled="!newCommentText.trim() || commentPosting"
                  :loading="commentPosting"
                  @click="postComment"
                />
              </div>
            </div>
          </div>
        </TabPanel>
        <TabPanel value="1" header="Historial">
          <div v-if="historyLoading" class="py-6 text-center text-gray-500">Cargando historial…</div>
          <ul v-else class="space-y-2 max-h-[50vh] overflow-y-auto text-sm">
            <li
              v-for="h in historyRows"
              :key="h.id"
              class="border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-gray-50/80 dark:bg-gray-800/50"
            >
              <div class="font-medium">{{ h.workflowItem?.title ?? '—' }}</div>
              <div class="text-xs text-gray-500 mt-1">
                <span v-if="h.workflowItem?.status">{{ h.workflowItem.status }}</span>
                <span v-if="h.workflowItem?.kind"> · {{ h.workflowItem.kind }}</span>
              </div>
              <div class="text-xs text-gray-500 mt-1">
                Desde {{ formatShortDate(h.startedAt) }}
                <template v-if="h.endedAt"> · hasta {{ formatShortDate(h.endedAt) }}</template>
                <template v-else> · <span class="text-primary-600">vigente</span></template>
              </div>
              <div v-if="h.versionAtStart != null" class="text-xs text-gray-400 mt-0.5">
                Versión al vincular: {{ h.versionAtStart }}
              </div>
            </li>
            <li v-if="!historyRows.length" class="text-gray-400 text-sm">Sin historial de actividades.</li>
          </ul>
        </TabPanel>
      </TabView>
    </div>

    <template #footer>
      <div class="flex justify-between w-full flex-wrap gap-2">
        <Button
          v-if="document?.workflowItem?.id && permissions.read"
          label="Abrir en flujo"
          icon="pi pi-external-link"
          text
          size="small"
          @click="goToFlow"
        />
        <div class="flex gap-2 ml-auto">
          <Button label="Cerrar" text @click="close" />
          <Button
            v-if="document?.workflowItem?.id && permissions.edit"
            label="Guardar"
            icon="pi pi-check"
            :loading="saving"
            :disabled="!editing"
            @click="save"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Dropdown from 'primevue/dropdown';
import Calendar from 'primevue/calendar';
import Checkbox from 'primevue/checkbox';
import StatusBadge from '@/components/common/StatusBadge.vue';
import { apiClient } from '@/api/client';

export interface DocRow {
  id: string;
  title: string;
  workflowItem?: { id: string; title?: string; kind?: string; status?: string } | null;
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    document: DocRow | null;
    trackableId: string;
    permissions: {
      read: boolean;
      edit: boolean;
      comment: boolean;
      create: boolean;
    };
  }>(),
  {},
);

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
  (e: 'saved'): void;
  (e: 'requestCreate'): void;
}>();

const router = useRouter();

const kindOptions = [
  { label: 'Actuación', value: 'Actuacion' },
  { label: 'Fase', value: 'Fase' },
  { label: 'Escrito', value: 'Escrito' },
  { label: 'Audiencia', value: 'Audiencia' },
  { label: 'Plazo', value: 'Plazo' },
  { label: 'Diligencia', value: 'Diligencia' },
];

const dialogHeader = computed(() => {
  if (!props.document) return 'Actividad';
  return `Actividad · ${props.document.title}`;
});

const detailLoading = ref(false);
const detailError = ref<string | null>(null);
const editing = ref<any>(null);
const saving = ref(false);

const comments = ref<Array<{ id: string; body: string; createdAt: string; user: any }>>([]);
const commentsLoading = ref(false);
const newCommentText = ref('');
const commentPosting = ref(false);

const historyRows = ref<any[]>([]);
const historyLoading = ref(false);

const userOptions = ref<{ label: string; value: string }[]>([]);

function onVisible(v: boolean) {
  emit('update:modelValue', v);
}

function close() {
  emit('update:modelValue', false);
}

function dateFromIso(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function onStartDate(d: Date | Date[] | null) {
  if (!editing.value) return;
  const one = Array.isArray(d) ? d[0] : d;
  editing.value.startDate = one ? one.toISOString() : null;
}

function onDueDate(d: Date | Date[] | null) {
  if (!editing.value) return;
  const one = Array.isArray(d) ? d[0] : d;
  editing.value.dueDate = one ? one.toISOString() : null;
}

function formatShortDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function commentAuthor(c: { user?: { firstName?: string; lastName?: string; email?: string } }) {
  const u = c.user;
  if (!u) return 'Usuario';
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
  return name || u.email || 'Usuario';
}

async function loadUsers() {
  try {
    const { data } = await apiClient.get('/users', { params: { limit: 200 } });
    const list = Array.isArray(data) ? data : data.data || [];
    userOptions.value = list.map((u: any) => ({
      label: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || u.id,
      value: u.id,
    }));
  } catch {
    userOptions.value = [];
  }
}

async function loadDetail() {
  if (!props.document?.workflowItem?.id) return;
  detailLoading.value = true;
  detailError.value = null;
  try {
    const { data } = await apiClient.get(`/workflow-items/${props.document.workflowItem.id}`);
    editing.value = {
      id: data.id,
      title: data.title ?? '',
      kind: data.kind ?? '',
      description: data.description ?? '',
      status: data.status,
      startDate: data.startDate ?? null,
      dueDate: data.dueDate ?? null,
      isLegalDeadline: !!data.isLegalDeadline,
      assignedToId: data.assignedTo?.id ?? '',
    };
  } catch (e: any) {
    detailError.value = e?.response?.data?.message || 'No se pudo cargar la actividad.';
    editing.value = null;
  } finally {
    detailLoading.value = false;
  }
}

async function loadComments() {
  if (!props.document?.workflowItem?.id) return;
  commentsLoading.value = true;
  try {
    const { data } = await apiClient.get(`/workflow-items/${props.document.workflowItem.id}/comments`);
    comments.value = Array.isArray(data) ? data : [];
  } catch {
    comments.value = [];
  } finally {
    commentsLoading.value = false;
  }
}

async function loadHistory() {
  if (!props.document?.id) return;
  historyLoading.value = true;
  try {
    const { data } = await apiClient.get(`/documents/${props.document.id}/workflow-history`);
    historyRows.value = Array.isArray(data) ? data : [];
  } catch {
    historyRows.value = [];
  } finally {
    historyLoading.value = false;
  }
}

async function postComment() {
  const body = newCommentText.value.trim();
  if (!body || !props.document?.workflowItem?.id) return;
  commentPosting.value = true;
  try {
    const { data } = await apiClient.post(`/workflow-items/${props.document.workflowItem.id}/comments`, { body });
    comments.value = [...comments.value, data];
    newCommentText.value = '';
  } catch {
    /* toast optional */
  } finally {
    commentPosting.value = false;
  }
}

async function save() {
  if (!editing.value?.id) return;
  saving.value = true;
  try {
    await apiClient.patch(`/workflow-items/${editing.value.id}`, {
      title: editing.value.title,
      kind: editing.value.kind || undefined,
      description: editing.value.description,
      assignedToId: editing.value.assignedToId || undefined,
      startDate: editing.value.startDate,
      dueDate: editing.value.dueDate,
      isLegalDeadline: editing.value.isLegalDeadline,
    });
    emit('saved');
  } catch {
    /* handled by global or silent */
  } finally {
    saving.value = false;
  }
}

function goToFlow() {
  if (!props.document?.workflowItem?.id) return;
  router.push({
    name: 'expediente',
    params: { id: props.trackableId },
    query: { workflowItemId: props.document.workflowItem.id },
  });
  close();
}

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) {
      editing.value = null;
      comments.value = [];
      historyRows.value = [];
      newCommentText.value = '';
      return;
    }
    await loadUsers();
    if (props.document?.workflowItem?.id) {
      await Promise.all([loadDetail(), loadComments(), loadHistory()]);
    }
  },
);
</script>
