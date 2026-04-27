<template>
  <Dialog
    v-model:visible="open"
    :header="t('processTrack.reopenDialog.title')"
    class="w-[min(100vw,26rem)]"
    :modal="true"
    @hide="onHide"
  >
    <p class="text-sm text-amber-800 dark:text-amber-200/90 m-0 mb-3">
      {{ t('processTrack.reopenDialog.warning') }}
    </p>
    <div class="flex flex-col gap-3">
      <label class="text-xs font-medium text-fg-muted">{{ t('processTrack.reopenDialog.pickStage') }}</label>
      <Select
        v-model="selectedStageId"
        :options="options"
        option-label="label"
        option-value="value"
        class="w-full"
        :placeholder="t('processTrack.reopenDialog.pickStage')"
      />
      <label class="text-xs font-medium text-fg-muted">{{ t('processTrack.reopenDialog.reason') }}</label>
      <Textarea v-model="reason" rows="4" class="w-full" autocomplete="off" />
    </div>
    <template #footer>
      <Button :label="t('common.cancel')" severity="secondary" @click="open = false" />
      <Button
        :label="t('processTrack.reopenDialog.confirm')"
        severity="danger"
        :disabled="!canSubmit"
        @click="submit"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';

const props = defineProps<{
  stages: { id: string; label: string }[];
}>();

const emit = defineEmits<{
  (e: 'confirm', payload: { stageId: string; reason: string }): void;
}>();

const { t } = useI18n();
const open = ref(false);
const selectedStageId = ref<string | null>(null);
const reason = ref('');

const options = computed(() =>
  props.stages.map((s) => ({ label: s.label, value: s.id })),
);

const canSubmit = computed(() => !!selectedStageId.value && reason.value.trim().length > 0);

function onHide() {
  reason.value = '';
  selectedStageId.value = null;
}

watch(
  () => props.stages,
  (s) => {
    if (s.length && !selectedStageId.value) {
      selectedStageId.value = s[0]!.id;
    }
  },
  { immediate: true },
);

function show() {
  open.value = true;
  if (props.stages.length) {
    selectedStageId.value = props.stages[0]!.id;
  }
}

function close() {
  open.value = false;
  onHide();
}

function submit() {
  if (!canSubmit.value || !selectedStageId.value) return;
  emit('confirm', { stageId: selectedStageId.value, reason: reason.value.trim() });
}

defineExpose({ show, close });
</script>
