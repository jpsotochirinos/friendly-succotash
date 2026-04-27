<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import Button from 'primevue/button';
import RadioButton from 'primevue/radiobutton';
import Message from 'primevue/message';
import {
  listLegalProcessTemplates,
  initializeLegalProcess,
  type LegalProcessTemplateRow,
} from '@/api/legal-process';

const props = defineProps<{ trackableId: string }>();
const emit = defineEmits<{ initialized: [] }>();

const templates = ref<LegalProcessTemplateRow[]>([]);
const selectedId = ref<string>('');
const loading = ref(false);
const error = ref<string | null>(null);

const byLaw = computed(() => {
  const grouped: Record<string, LegalProcessTemplateRow[]> = {};
  for (const t of templates.value) {
    const k = t.applicableLaw ?? '—';
    grouped[k] ??= [];
    grouped[k].push(t);
  }
  return grouped;
});

onMounted(async () => {
  try {
    templates.value = await listLegalProcessTemplates();
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'No se pudieron cargar las plantillas';
  }
});

async function confirm() {
  if (!selectedId.value) return;
  loading.value = true;
  error.value = null;
  try {
    await initializeLegalProcess(props.trackableId, selectedId.value);
    emit('initialized');
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Error al inicializar';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="legal-process-selector max-w-lg space-y-4">
    <h3 class="text-lg font-semibold text-[var(--fg-default)] m-0">Proceso legal</h3>
    <p class="text-sm text-[var(--fg-muted)] m-0">
      Inicializa el flujo procesal sobre este expediente (ítem raíz «Proceso»).
    </p>
    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
    <div v-if="!templates.length && !error" class="text-sm text-[var(--fg-muted)]">
      No hay plantillas disponibles. Ejecuta la migración y <code class="text-xs">pnpm db:seed</code>.
    </div>
    <div v-for="(items, law) in byLaw" :key="law" class="space-y-2">
      <h4 class="text-sm font-medium text-[var(--fg-muted)] m-0">{{ law }}</h4>
      <div v-for="t in items" :key="t.id" class="flex items-center gap-2">
        <RadioButton v-model="selectedId" :input-id="`tpl-${t.id}`" :value="t.id" />
        <label :for="`tpl-${t.id}`" class="cursor-pointer text-sm text-[var(--fg-default)]">
          {{ t.name }}
          <span class="text-[var(--fg-muted)]">({{ t.legalProcessCode }})</span>
        </label>
      </div>
    </div>
    <Button
      label="Inicializar proceso"
      icon="pi pi-check"
      :disabled="!selectedId || loading"
      :loading="loading"
      @click="confirm"
    />
  </div>
</template>
