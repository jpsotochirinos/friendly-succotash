<template>
  <Dialog
    v-model:visible="open"
    :header="t('processTrack.advance.dialog.title')"
    class="w-[min(100vw,28rem)]"
    :modal="true"
    @hide="onHide"
  >
    <p class="m-0 mb-2 text-sm text-fg-subtle">
      {{ t('processTrack.advance.dialog.subtitle') }}
    </p>
    <p class="m-0 mb-3 text-xs text-fg-muted leading-snug">
      {{ t('processTrack.advance.dialog.howItWorks') }}
    </p>
    <div class="flex max-h-[40vh] flex-col gap-2 overflow-y-auto pr-1">
      <div
        v-for="a in localPending"
        :key="a.id"
        class="rounded border border-surface-200/80 bg-surface-0 p-2 dark:border-surface-600 dark:bg-surface-800/60"
      >
        <p class="m-0 text-sm font-medium text-fg line-clamp-2">{{ a.title }}</p>
        <div class="mt-2 flex flex-wrap gap-2">
          <div class="flex items-center gap-2">
            <RadioButton
              v-model="choices[a.id]"
              :input-id="`inh-${a.id}`"
              value="inherit"
              :name="`advance-${a.id}`"
            />
            <label :for="`inh-${a.id}`" class="cursor-pointer text-xs text-fg-muted">
              {{ t('processTrack.advance.dialog.inherit') }}
            </label>
          </div>
          <div class="flex items-center gap-2">
            <RadioButton
              v-model="choices[a.id]"
              :input-id="`cl-${a.id}`"
              value="close"
              :name="`advance-${a.id}`"
            />
            <label :for="`cl-${a.id}`" class="cursor-pointer text-xs text-fg-muted">
              {{ t('processTrack.advance.dialog.markAsDone') }}
            </label>
          </div>
        </div>
      </div>
    </div>
    <div class="mt-3 flex flex-wrap gap-2">
      <Button
        type="button"
        size="small"
        :label="t('processTrack.advance.dialog.inheritAll')"
        severity="secondary"
        @click="setAll('inherit')"
      />
      <Button
        type="button"
        size="small"
        :label="t('processTrack.advance.dialog.markAllAsDone')"
        severity="secondary"
        @click="setAll('close')"
      />
    </div>
    <template #footer>
      <Button :label="t('common.cancel')" severity="secondary" @click="open = false" />
      <Button
        :label="t('processTrack.advance.dialog.closeStage')"
        :disabled="!canSubmit"
        :loading="submitting"
        @click="submit"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import RadioButton from 'primevue/radiobutton';
import { advanceStage } from '@/api/process-tracks';

const { t } = useI18n();
const open = ref(false);
const submitting = ref(false);
const processTrackId = ref('');
const stageInstanceId = ref('');
const localPending = ref<{ id: string; title: string }[]>([]);
const choices = ref<Record<string, 'inherit' | 'close'>>({});

const canSubmit = computed(
  () =>
    localPending.value.length > 0
    && localPending.value.every((p) => choices.value[p.id] === 'inherit' || choices.value[p.id] === 'close'),
);

const emit = defineEmits<{
  (e: 'done'): void;
}>();

function onHide() {
  localPending.value = [];
  choices.value = {};
}

function setAll(v: 'inherit' | 'close') {
  const next: Record<string, 'inherit' | 'close'> = { ...choices.value };
  for (const p of localPending.value) {
    next[p.id] = v;
  }
  choices.value = next;
}

function show(payload: { processTrackId: string; stageInstanceId: string; pending: { id: string; title: string }[] }) {
  processTrackId.value = payload.processTrackId;
  stageInstanceId.value = payload.stageInstanceId;
  localPending.value = payload.pending;
  const init: Record<string, 'inherit' | 'close'> = {};
  for (const p of payload.pending) {
    init[p.id] = 'inherit';
  }
  choices.value = init;
  open.value = true;
}

async function submit() {
  if (!canSubmit.value) return;
  submitting.value = true;
  try {
    const pendingActions = localPending.value.map((p) => ({
      activityId: p.id,
      action: choices.value[p.id]!,
    }));
    await advanceStage(processTrackId.value, stageInstanceId.value, { pendingActions });
    open.value = false;
    emit('done');
  } finally {
    submitting.value = false;
  }
}

defineExpose({ show });
</script>
