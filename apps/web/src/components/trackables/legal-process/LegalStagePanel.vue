<script setup lang="ts">
import { ref } from 'vue';
import Button from 'primevue/button';
import DatePicker from 'primevue/datepicker';
import { registerNotificationDate, advanceStage } from '@/api/legal-process';

const props = defineProps<{
  trackableId: string;
  stageId: string;
  deadlineType: string;
}>();

const emit = defineEmits<{ close: []; reload: [] }>();

const notificationDate = ref<Date | null>(null);
const loading = ref(false);
const err = ref<string | null>(null);

async function handleRegisterNotification() {
  if (!notificationDate.value) return;
  loading.value = true;
  err.value = null;
  try {
    const iso = notificationDate.value.toISOString().slice(0, 10);
    await registerNotificationDate({
      trackableId: props.trackableId,
      workflowStateId: props.stageId,
      notificationDate: iso,
    });
    emit('reload');
  } catch (e: unknown) {
    err.value = e instanceof Error ? e.message : 'Error';
  } finally {
    loading.value = false;
  }
}

async function handleAdvance() {
  loading.value = true;
  err.value = null;
  try {
    await advanceStage({
      trackableId: props.trackableId,
      targetStateId: props.stageId,
    });
    emit('reload');
  } catch (e: unknown) {
    err.value = e instanceof Error ? e.message : 'Error';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <aside
    class="legal-stage-panel rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-4 space-y-4"
  >
    <div class="flex justify-between items-center gap-2">
      <span class="text-sm font-medium text-[var(--fg-default)]">Etapa</span>
      <Button icon="pi pi-times" text rounded severity="secondary" @click="emit('close')" />
    </div>
    <p v-if="err" class="text-sm text-red-600 m-0">{{ err }}</p>
    <div v-if="deadlineType === 'from_notification'" class="space-y-2">
      <label class="text-xs text-[var(--fg-muted)]">Fecha de notificación</label>
      <DatePicker v-model="notificationDate" date-format="yy-mm-dd" class="w-full" />
      <Button
        label="Registrar y calcular plazo"
        size="small"
        :disabled="!notificationDate || loading"
        :loading="loading"
        @click="handleRegisterNotification"
      />
    </div>
    <Button
      label="Avanzar a esta etapa"
      class="w-full"
      severity="primary"
      :loading="loading"
      @click="handleAdvance"
    />
  </aside>
</template>
