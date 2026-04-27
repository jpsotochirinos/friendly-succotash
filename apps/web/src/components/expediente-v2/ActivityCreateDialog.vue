<template>
  <Dialog
    v-model:visible="visible"
    :header="t('processTrack.activity.create.title')"
    class="w-[min(100vw,30rem)]"
    :modal="true"
    @hide="reset"
  >
    <div class="flex flex-col gap-3 pt-1">
      <div class="flex flex-col gap-1">
        <label class="text-xs font-medium text-fg-muted">{{ t('processTrack.activity.create.stage') }}</label>
        <Select
          v-model="form.stageInstanceId"
          :options="stageOptions"
          option-label="label"
          option-value="value"
          class="w-full"
          :placeholder="t('processTrack.activity.create.stage')"
        />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs font-medium text-fg-muted">{{ t('processTrack.activity.create.titleLabel') }}</label>
        <InputText v-model="form.title" class="w-full" :placeholder="t('processTrack.activity.titlePlaceholder')" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs font-medium text-fg-muted">{{ t('processTrack.activity.create.description') }}</label>
        <Textarea v-model="form.description" rows="2" class="w-full" />
      </div>
      <div class="flex items-center gap-2">
        <Checkbox v-model="form.isMandatory" binary input-id="act-mand" />
        <label for="act-mand" class="cursor-pointer text-sm text-fg">{{ t('processTrack.activity.create.mandatory') }}</label>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs font-medium text-fg-muted">{{ t('processTrack.activity.create.dueDate') }}</label>
        <Calendar
          v-model="form.dueDate"
          date-format="dd/mm/yy"
          show-icon
          class="w-full"
          :show-button-bar="true"
        />
      </div>
    </div>
    <template #footer>
      <Button :label="t('common.cancel')" severity="secondary" @click="visible = false" />
      <Button
        :label="t('common.create')"
        :disabled="!form.title.trim() || !form.stageInstanceId"
        :loading="submitting"
        @click="submit"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import Checkbox from 'primevue/checkbox';
import Calendar from 'primevue/calendar';
import { createCustomActivity } from '@/api/process-tracks';

const props = defineProps<{
  processTrackId: string;
  stages: { id: string; label: string }[];
}>();

const emit = defineEmits<{
  (e: 'created'): void;
}>();

const { t } = useI18n();
const toast = useToast();
const visible = ref(false);
const submitting = ref(false);
const form = ref({
  stageInstanceId: null as string | null,
  title: '',
  description: '',
  isMandatory: false,
  dueDate: null as Date | null,
});

const stageOptions = computed(() =>
  props.stages.map((s) => ({ label: s.label, value: s.id })),
);

function reset() {
  form.value = {
    stageInstanceId: null,
    title: '',
    description: '',
    isMandatory: false,
    dueDate: null,
  };
}

function open(defaultStageId?: string | null) {
  reset();
  form.value.stageInstanceId = defaultStageId ?? props.stages[0]?.id ?? null;
  visible.value = true;
}

async function submit() {
  if (!form.value.stageInstanceId || !form.value.title.trim()) return;
  submitting.value = true;
  try {
    await createCustomActivity(props.processTrackId, {
      stageInstanceId: form.value.stageInstanceId,
      title: form.value.title.trim(),
      description: form.value.description.trim() || undefined,
      isMandatory: form.value.isMandatory,
      dueDate: form.value.dueDate ? form.value.dueDate.toISOString() : undefined,
    });
    visible.value = false;
    emit('created');
  } catch (e) {
    toast.add({ severity: 'error', summary: t('processTrack.activity.create.error'), life: 4000 });
    console.warn(e);
  } finally {
    submitting.value = false;
  }
}

defineExpose({ open, close: () => { visible.value = false; } });
</script>
