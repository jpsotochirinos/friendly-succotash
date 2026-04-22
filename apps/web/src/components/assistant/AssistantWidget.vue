<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Dropdown from 'primevue/dropdown';
import Calendar from 'primevue/calendar';
import MultiSelect from 'primevue/multiselect';
import { makeAuthFetch } from '@/utils/makeAuthFetch';

const props = defineProps<{
  toolCallId: string;
  toolName: string;
  spec: Record<string, unknown>;
  disabled?: boolean;
  resolved?: boolean;
}>();

const emit = defineEmits<{
  submit: [payload: unknown];
}>();

const fetchAuth = makeAuthFetch();

const choiceId = ref<string | null>(null);
const multiIds = ref<string[]>([]);
const searchQ = ref('');
const searchLoading = ref(false);
const searchItems = ref<Array<{ id: string; label: string; description?: string | null }>>([]);
const searchSelected = ref<string | null>(null);
const formValues = ref<Record<string, unknown>>({});
const placementRows = ref<
  Array<{ attachmentId: string; trackableId: string | null; folderId: string | null; title: string }>
>([]);

const kind = computed(() => String(props.spec.kind ?? ''));

watch(
  () => props.spec,
  (s) => {
    if (kind.value === 'file_placement') {
      const ids = (s.attachmentIds as string[]) || [];
      placementRows.value = ids.map((id) => ({
        attachmentId: id,
        trackableId: null,
        folderId: null,
        title: '',
      }));
    }
    if (kind.value === 'form' && s.fields) {
      const fv: Record<string, unknown> = {};
      for (const f of s.fields as Array<{ id: string; type: string }>) {
        fv[f.id] = f.type === 'checkbox' ? false : '';
      }
      formValues.value = fv;
    }
  },
  { immediate: true },
);

let searchTimer: ReturnType<typeof setTimeout> | null = null;
watch(searchQ, () => {
  if (kind.value !== 'search') return;
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => void runSearch(), 280);
});

async function runSearch() {
  const source = String(props.spec.source ?? '');
  const trackableId = props.spec.trackableId as string | undefined;
  searchLoading.value = true;
  try {
    const params = new URLSearchParams({ source, q: searchQ.value });
    if (trackableId) params.set('trackableId', trackableId);
    const res = await fetchAuth(`/api/assistant/search?${params.toString()}`);
    const j = (await res.json()) as { items?: typeof searchItems.value };
    searchItems.value = j.items ?? [];
  } catch {
    searchItems.value = [];
  } finally {
    searchLoading.value = false;
  }
}

function submitChoice() {
  if (!choiceId.value) return;
  emit('submit', { selectedId: choiceId.value });
}

function submitMulti() {
  emit('submit', { selectedIds: [...multiIds.value] });
}

function submitSearch() {
  if (!searchSelected.value) return;
  emit('submit', { selectedId: searchSelected.value });
}

function submitForm() {
  emit('submit', { values: { ...formValues.value } });
}

function submitPlacement() {
  emit('submit', {
    entries: placementRows.value.map((r) => ({
      attachmentId: r.attachmentId,
      trackableId: r.trackableId,
      folderId: r.folderId,
      title: r.title || undefined,
    })),
  });
}

function onConfirmYes() {
  emit('submit', { confirmed: true });
}

function onConfirmNo() {
  emit('submit', { confirmed: false });
}

const choiceOptions = computed(() =>
  ((props.spec.options as Array<{ id: string; label: string }>) || []).map((o) => ({
    label: o.label,
    value: o.id,
  })),
);

const searchOptions = computed(() =>
  searchItems.value.map((o) => ({ label: o.label + (o.description ? ` — ${o.description}` : ''), value: o.id })),
);

function dropdownFieldOptions(f: { options?: Array<{ id: string; label: string }> }) {
  return (f.options || []).map((o) => ({ label: o.label, value: o.id }));
}
</script>

<template>
  <div
    class="rounded-xl border px-3 py-2 text-sm"
    :class="{ 'opacity-75': resolved }"
    :style="{ borderColor: 'var(--surface-border)', backgroundColor: 'var(--surface-sunken)' }"
  >
    <template v-if="kind === 'choice'">
      <p class="m-0 mb-2 font-medium">{{ spec.label }}</p>
      <p v-if="spec.hint" class="m-0 mb-2 text-xs text-[var(--fg-muted)]">{{ spec.hint }}</p>
      <Dropdown
        v-model="choiceId"
        :options="choiceOptions"
        option-label="label"
        option-value="value"
        class="w-full text-sm mb-2"
        placeholder="Elige una opción"
        :disabled="disabled || resolved"
      />
      <Button
        label="Enviar"
        size="small"
        :disabled="disabled || resolved || !choiceId"
        @click="submitChoice"
      />
    </template>

    <template v-else-if="kind === 'multi_choice'">
      <p class="m-0 mb-2 font-medium">{{ spec.label }}</p>
      <MultiSelect
        v-model="multiIds"
        :options="(spec.options as Array<{ id: string; label: string }>) || []"
        option-label="label"
        option-value="id"
        display="chip"
        class="w-full text-sm mb-2"
        placeholder="Elige una o más"
        :disabled="disabled || resolved"
      />
      <Button label="Enviar" size="small" :disabled="disabled || resolved" @click="submitMulti" />
    </template>

    <template v-else-if="kind === 'confirm'">
      <p class="m-0 mb-1 font-medium">{{ spec.label }}</p>
      <p class="m-0 mb-2 whitespace-pre-wrap text-xs">{{ spec.body }}</p>
      <div class="flex gap-2">
        <Button label="Sí" size="small" :disabled="disabled || resolved" @click="onConfirmYes" />
        <Button label="No" size="small" text :disabled="disabled || resolved" @click="onConfirmNo" />
      </div>
    </template>

    <template v-else-if="kind === 'search'">
      <p class="m-0 mb-2 font-medium">{{ spec.label }}</p>
      <InputText v-model="searchQ" class="w-full text-sm mb-2" placeholder="Buscar…" :disabled="disabled || resolved" />
      <Dropdown
        v-model="searchSelected"
        :options="searchOptions"
        option-label="label"
        option-value="value"
        class="w-full text-sm mb-2"
        placeholder="Resultados"
        :loading="searchLoading"
        filter
        :disabled="disabled || resolved"
      />
      <Button label="Elegir" size="small" :disabled="disabled || resolved || !searchSelected" @click="submitSearch" />
    </template>

    <template v-else-if="kind === 'form'">
      <p class="m-0 mb-2 font-medium">{{ spec.label }}</p>
      <div v-for="f in (spec.fields as any[]) || []" :key="f.id" class="mb-2">
        <label class="text-xs font-medium block mb-0.5">{{ f.label }}</label>
        <InputText
          v-if="f.type === 'text'"
          v-model="formValues[f.id] as string"
          class="w-full text-sm"
          :disabled="disabled || resolved"
        />
        <Textarea
          v-else-if="f.type === 'textarea'"
          v-model="formValues[f.id] as string"
          class="w-full text-sm"
          rows="3"
          :disabled="disabled || resolved"
        />
        <Calendar
          v-else-if="f.type === 'date'"
          v-model="formValues[f.id] as Date | null"
          date-format="dd/mm/yy"
          show-icon
          class="w-full text-sm"
          :disabled="disabled || resolved"
        />
        <InputText
          v-else-if="f.type === 'number'"
          v-model="formValues[f.id] as string"
          type="number"
          class="w-full text-sm"
          :disabled="disabled || resolved"
        />
        <div v-else-if="f.type === 'checkbox'" class="flex items-center gap-2">
          <input
            :id="`wf-${f.id}`"
            v-model="formValues[f.id] as boolean"
            type="checkbox"
            class="rounded border"
            :disabled="disabled || resolved"
          />
        </div>
        <Dropdown
          v-else-if="f.type === 'dropdown'"
          v-model="formValues[f.id]"
          :options="dropdownFieldOptions(f)"
          option-label="label"
          option-value="value"
          class="w-full text-sm"
          :disabled="disabled || resolved"
        />
      </div>
      <Button label="Enviar" size="small" :disabled="disabled || resolved" @click="submitForm" />
    </template>

    <template v-else-if="kind === 'file_placement'">
      <p class="m-0 mb-2 font-medium">{{ spec.label }}</p>
      <p class="m-0 mb-2 text-[11px] text-[var(--fg-muted)]">Indica UUID de expediente y carpeta por archivo (pega desde el buscador).</p>
      <div v-for="(row, idx) in placementRows" :key="row.attachmentId" class="mb-3 border-t pt-2 border-[var(--surface-border)]">
        <div class="text-[10px] font-mono truncate mb-1">{{ row.attachmentId }}</div>
        <InputText v-model="row.trackableId" placeholder="trackableId (UUID)" class="w-full text-xs mb-1" :disabled="resolved" />
        <InputText v-model="row.folderId" placeholder="folderId (UUID)" class="w-full text-xs mb-1" :disabled="resolved" />
        <InputText v-model="row.title" placeholder="Título opcional" class="w-full text-xs" :disabled="resolved" />
      </div>
      <Button label="Confirmar ubicación" size="small" :disabled="disabled || resolved" @click="submitPlacement" />
    </template>

    <template v-else>
      <p class="m-0 text-xs text-[var(--fg-muted)]">Widget «{{ kind }}» (sin UI específica)</p>
      <Button label="Cerrar" size="small" text :disabled="resolved" @click="emit('submit', {})" />
    </template>

    <p v-if="resolved" class="m-0 mt-2 text-[11px] text-[var(--fg-muted)]">Enviado.</p>
  </div>
</template>
