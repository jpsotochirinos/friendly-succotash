<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between gap-2">
      <span class="text-[11px] font-medium uppercase tracking-wide text-[var(--fg-muted)]">Acciones rápidas</span>
    </div>
    <div class="flex flex-wrap gap-1.5">
      <Button
        v-for="chip in chips"
        :key="chip.id"
        type="button"
        size="small"
        outlined
        class="text-xs !py-1 !px-2"
        :disabled="disabled"
        :label="chip.label"
        :icon="chip.icon"
        @click="chip.action()"
      />
    </div>

    <Dialog
      v-model:visible="actuacionOpen"
      header="Nueva actuación / tarea"
      modal
      :style="{ width: 'min(440px, 96vw)' }"
      :closable="!submitting"
      class="assistant-quick-dialog"
      @show="onActuacionDialogShow"
    >
      <div class="flex flex-col gap-3 pt-1 max-h-[min(70vh,520px)] overflow-y-auto pr-1">
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-[var(--fg-default)]">Expediente</label>
          <Dropdown
            v-model="form.trackableId"
            :options="trackableOptions"
            option-label="label"
            option-value="value"
            placeholder="Selecciona expediente"
            filter
            show-clear
            class="w-full text-sm"
            :loading="trackablesLoading"
            :disabled="submitting"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-[var(--fg-default)]">Título de la tarea</label>
          <InputText v-model="form.title" class="w-full text-sm" placeholder="Ej. Presentar escrito de prescripción" :disabled="submitting" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-[var(--fg-default)]">Tipo</label>
          <Dropdown
            v-model="form.kind"
            :options="kindOptions"
            option-label="label"
            option-value="value"
            placeholder="Tipo"
            class="w-full text-sm"
            :disabled="submitting"
          />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-[var(--fg-default)]" for="qa-start-date">Inicio</label>
            <Calendar
              id="qa-start-date"
              v-model="form.startDate"
              date-format="dd/mm/yy"
              show-icon
              show-button-bar
              append-to="body"
              class="w-full text-sm assistant-qa-calendar"
              :disabled="submitting"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-[var(--fg-default)]" for="qa-due-date">Vencimiento</label>
            <Calendar
              id="qa-due-date"
              v-model="form.dueDate"
              date-format="dd/mm/yy"
              show-icon
              show-button-bar
              append-to="body"
              class="w-full text-sm assistant-qa-calendar"
              :disabled="submitting"
            />
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <Checkbox
              v-model="form.createWithDocument"
              binary
              input-id="qa-doc-from-template"
              :disabled="submitting"
              @update:model-value="onCreateWithDocumentChange"
            />
            <label for="qa-doc-from-template" class="text-xs cursor-pointer">Crear documento (plantilla opcional)</label>
          </div>
          <template v-if="form.createWithDocument">
            <Dropdown
              v-model="form.documentTemplateId"
              :options="documentTemplateOptions"
              option-label="label"
              option-value="value"
              placeholder="Sin plantilla (documento en blanco) o elige una"
              filter
              show-clear
              class="w-full text-sm"
              :loading="templatesLoading"
              :disabled="submitting"
            />
            <p v-if="form.documentTemplateId?.trim()" class="m-0 text-[10px] text-[var(--fg-muted)] space-y-0.5">
              <span class="block">Plantilla: {{ selectedDocumentTemplateLabel }}</span>
              <span class="block font-mono text-[9px] opacity-90 break-all">ID: {{ form.documentTemplateId }}</span>
            </p>
            <p
              v-else-if="templatesLoading || documentTemplateOptions.length"
              class="m-0 text-[10px] text-[var(--fg-muted)]"
            >
              Sin plantilla: se creará un documento en blanco vinculado a la tarea.
            </p>
            <p v-if="!templatesLoading && !documentTemplateOptions.length" class="m-0 text-[10px] text-amber-600 dark:text-amber-400">
              No hay plantillas en la organización; puedes crear el documento en blanco o añadir plantillas en Documentos.
            </p>
          </template>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-[var(--fg-default)]">Asignar a</label>
          <Dropdown
            v-model="form.assignedToId"
            :options="userOptions"
            option-label="label"
            option-value="value"
            placeholder="Sin asignar"
            filter
            show-clear
            class="w-full text-sm"
            :loading="usersLoading"
            :disabled="submitting"
          />
          <p v-if="!usersLoading && !userOptions.length" class="m-0 text-[10px] text-[var(--fg-muted)]">
            No se pudieron cargar usuarios (¿permiso de lectura de usuarios?). Puedes dejar sin asignar.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <Checkbox v-model="form.isLegalDeadline" binary input-id="qa-legal" :disabled="submitting" />
          <label for="qa-legal" class="text-xs cursor-pointer">Plazo legal procesal</label>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-[var(--fg-default)]">Contexto e instrucciones</label>
          <Textarea
            v-model="form.context"
            class="w-full text-sm"
            rows="6"
            auto-resize
            placeholder="Describe el fondo del asunto, plazos judiciales, partes involucradas, documentos de referencia, etc."
            :disabled="submitting"
          />
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" text size="small" type="button" :disabled="submitting" @click="actuacionOpen = false" />
        <Button
          label="Enviar al asistente"
          icon="pi pi-send"
          size="small"
          type="button"
          :loading="submitting"
          :disabled="!canSubmitActuacion"
          @click="submitActuacion"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import Button from 'primevue/button';
import Calendar from 'primevue/calendar';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Checkbox from 'primevue/checkbox';
import { apiClient } from '@/api/client';

type ApiUser = { id: string; email: string; firstName?: string; lastName?: string };
type ApiDocTemplate = { id: string; title?: string };

const props = defineProps<{
  disabled?: boolean;
}>();

const emit = defineEmits<{
  /** Full message to send as user turn */
  send: [text: string];
}>();

const route = useRoute();

const actuacionOpen = ref(false);
const submitting = ref(false);
const trackablesLoading = ref(false);
const trackableOptions = ref<Array<{ label: string; value: string }>>([]);
const usersLoading = ref(false);
const usersList = ref<ApiUser[]>([]);
const templatesLoading = ref(false);
const documentTemplates = ref<ApiDocTemplate[]>([]);

const form = ref({
  trackableId: '' as string,
  title: '',
  kind: 'Actuacion',
  startDate: null as Date | null,
  dueDate: null as Date | null,
  createWithDocument: false,
  documentTemplateId: '' as string,
  assignedToId: '' as string,
  isLegalDeadline: false,
  context: '',
});

const userOptions = computed(() =>
  usersList.value.map((u) => ({
    value: u.id,
    label: formatUserLabel(u),
  })),
);

const documentTemplateOptions = computed(() =>
  documentTemplates.value.map((d) => ({
    value: d.id,
    label: d.title?.trim() || d.id,
  })),
);

const selectedDocumentTemplateLabel = computed(() => {
  const id = form.value.documentTemplateId?.trim();
  if (!id) return '';
  const row = documentTemplates.value.find((d) => d.id === id);
  return row?.title?.trim() || id;
});

const kindOptions = [
  { label: 'Actuación', value: 'Actuacion' },
  { label: 'Escrito', value: 'Escrito' },
  { label: 'Plazo', value: 'Plazo' },
  { label: 'Audiencia', value: 'Audiencia' },
  { label: 'Fase', value: 'Fase' },
];

const canSubmitActuacion = computed(() => {
  const f = form.value;
  if (!f.trackableId?.trim() || !f.title?.trim()) return false;
  return true;
});

function toYmd(d: Date | null | undefined): string {
  if (!d || Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function onCreateWithDocumentChange(checked: boolean) {
  if (!checked) {
    form.value.documentTemplateId = '';
  }
}

function insertDraft(text: string) {
  emit('send', text);
}

const chips = computed(() => {
  const rid = typeof route.params.id === 'string' ? route.params.id : '';
  const base = [
    {
      id: 'actuacion',
      label: 'Crear actuación',
      icon: 'pi pi-plus-circle',
      action: () => {
        actuacionOpen.value = true;
      },
    },
    {
      id: 'cal',
      label: 'Calendario',
      icon: 'pi pi-calendar',
      action: () =>
        insertDraft(
          '¿Qué actividades o tareas tengo en el rango del calendario que estoy viendo? Resume fechas relevantes.',
        ),
    },
    {
      id: 'pend',
      label: 'Mis pendientes',
      icon: 'pi pi-inbox',
      action: () =>
        insertDraft(
          'Muéstrame mis pendientes de acciones (bandeja global), con prioridad a vencidas si las hay.',
        ),
    },
    {
      id: 'daily',
      label: 'Resumen diario',
      icon: 'pi pi-sun',
      action: () =>
        insertDraft(
          'Dame un resumen diario: calendario de hoy, mis pendientes urgentes y notificaciones recientes.',
        ),
    },
    {
      id: 'docs',
      label: 'Buscar docs',
      icon: 'pi pi-search',
      action: () =>
        insertDraft(
          'Quiero buscar documentos en la organización. Pregúntame brevemente por qué términos o carpeta priorizar.',
        ),
    },
  ];
  if (rid) {
    base.splice(1, 0, {
      id: 'exp',
      label: 'Este expediente',
      icon: 'pi pi-folder-open',
      action: () =>
        insertDraft(
          `Resume el estado del expediente con id ${rid}: tareas abiertas, próximos plazos y documentos recientes.`,
        ),
    });
  }
  return base;
});

function formatUserLabel(u: ApiUser): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return name ? `${name} (${u.email})` : u.email;
}

async function loadTrackables() {
  trackablesLoading.value = true;
  try {
    const { data } = await apiClient.get<{ data: Array<{ id: string; title: string }> }>('/trackables', {
      params: { page: 1, limit: 100, sortBy: 'updatedAt', sortOrder: 'DESC' },
    });
    const rows = data.data ?? [];
    trackableOptions.value = rows.map((t) => ({
      value: t.id,
      label: t.title?.trim() || t.id,
    }));
  } catch {
    trackableOptions.value = [];
  } finally {
    trackablesLoading.value = false;
  }
}

async function loadUsers() {
  usersLoading.value = true;
  try {
    const { data } = await apiClient.get<{ data: ApiUser[] }>('/users', { params: { page: 1, limit: 200 } });
    const rows = data.data ?? [];
    usersList.value = rows;
  } catch {
    usersList.value = [];
  } finally {
    usersLoading.value = false;
  }
}

async function loadDocumentTemplates() {
  templatesLoading.value = true;
  try {
    const { data } = await apiClient.get<{ data?: ApiDocTemplate[] }>('/documents', {
      params: { isTemplate: 'true', limit: 200 },
    });
    const raw = Array.isArray(data?.data) ? data.data : [];
    documentTemplates.value = raw.filter((d): d is ApiDocTemplate => Boolean(d?.id));
  } catch {
    documentTemplates.value = [];
  } finally {
    templatesLoading.value = false;
  }
}

async function onActuacionDialogShow() {
  const rid = typeof route.params.id === 'string' ? route.params.id : '';
  form.value = {
    trackableId: rid,
    title: '',
    kind: 'Actuacion',
    startDate: null,
    dueDate: null,
    createWithDocument: false,
    documentTemplateId: '',
    assignedToId: '',
    isLegalDeadline: false,
    context: '',
  };
  await Promise.all([loadTrackables(), loadUsers(), loadDocumentTemplates()]);
  if (rid && trackableOptions.value.some((o) => o.value === rid)) {
    form.value.trackableId = rid;
  }
}

function buildActuacionMessage(): string {
  const f = form.value;
  const startYmd = toYmd(f.startDate);
  const dueYmd = toYmd(f.dueDate);
  const trackLabel = trackableOptions.value.find((o) => o.value === f.trackableId)?.label ?? 'expediente';
  const lines = [
    'Quiero crear una tarea/actuación en el expediente indicado abajo.',
    '',
    `Expediente: ${trackLabel}`,
    `ID expediente (UUID): ${f.trackableId}`,
    `Título de la tarea: ${f.title.trim()}`,
    `Tipo (kind): ${f.kind}`,
  ];
  if (startYmd) lines.push(`Fecha de inicio (YYYY-MM-DD): ${startYmd}`);
  else lines.push('Fecha de inicio: (usa la de hoy del contexto si no dije otra)');
  if (dueYmd) lines.push(`Fecha de vencimiento (YYYY-MM-DD): ${dueYmd}`);
  else lines.push('Fecha de vencimiento: (indica si falta o propón según contexto)');
  lines.push(`Plazo legal procesal: ${f.isLegalDeadline ? 'sí' : 'no'}`);
  if (f.createWithDocument) {
    lines.push('requiresDocument: true');
    if (f.documentTemplateId?.trim()) {
      lines.push(`Plantilla de documento (título): ${selectedDocumentTemplateLabel.value}`);
      lines.push(`documentTemplateId (UUID para create_workflow_item): ${f.documentTemplateId.trim()}`);
    } else {
      lines.push(
        'Documento sin plantilla: crear documento en blanco vinculado a la tarea (no pasar documentTemplateId o vacío según acepte create_workflow_item).',
      );
    }
  } else {
    lines.push('requiresDocument: false');
    lines.push('Sin documento desde este formulario (no establecer documentTemplateId).');
  }
  if (f.assignedToId?.trim()) {
    const label = userOptions.value.find((o) => o.value === f.assignedToId)?.label ?? f.assignedToId;
    lines.push(`Asignar a: ${label}`);
    lines.push(`assignedToId (UUID para la herramienta): ${f.assignedToId}`);
  } else {
    lines.push('Asignar a: sin asignar');
  }
  lines.push('', 'Contexto e instrucciones:', f.context.trim() || '(sin texto adicional)');
  lines.push(
    '',
    'Por favor crea la tarea con create_workflow_item usando exactamente los UUID y flags anteriores (startDate/dueDate como ISO o YYYY-MM-DD según acepte la herramienta). Si falta algo imprescindible, pregúntame antes de confirmar mutaciones.',
  );
  return lines.join('\n');
}

async function submitActuacion() {
  if (!canSubmitActuacion.value) return;
  submitting.value = true;
  try {
    const msg = buildActuacionMessage();
    emit('send', msg);
    actuacionOpen.value = false;
  } finally {
    submitting.value = false;
  }
}
</script>
