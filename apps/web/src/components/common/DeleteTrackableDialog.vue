<template>
  <Dialog
    v-model:visible="open"
    :modal="true"
    :draggable="false"
    :closable="phase !== 'running'"
    :close-on-escape="phase !== 'running'"
    :dismissable-mask="phase !== 'running'"
    :style="{ width: 'min(520px, 96vw)' }"
    :pt="{
      mask: { class: 'alega-confirm-mask' },
      root: { class: ['alega-confirm-panel overflow-hidden', deletePanelVariantClass] },
      header: { class: ['border-0 p-0 items-start gap-2', headerClass] },
      content: { class: 'pt-0 pb-4' },
    }"
    @hide="onHide"
  >
    <template #header>
      <div class="flex min-w-0 flex-1 items-start gap-3 pr-2">
        <div
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
          :class="iconDiscClass"
        >
          <i :class="[iconClass, 'text-xl', iconTextClass]" />
        </div>
        <div class="flex min-w-0 flex-1 flex-col gap-0.5">
          <span class="block truncate text-lg font-semibold leading-tight text-[var(--fg-default)]">
            {{ dialogTitle }}
          </span>
          <p
            v-if="(phase === 'confirmText' || phase === 'running') && trackable?.title"
            class="m-0 truncate text-sm font-medium leading-snug text-[var(--fg-muted)]"
            :title="trackable.title"
          >
            «{{ trackable.title }}»
          </p>
        </div>
      </div>
    </template>

    <div v-if="phase === 'confirmText'" class="flex flex-col gap-4 pt-1">
      <div class="flex flex-col gap-2">
        <p class="m-0 text-xs font-semibold uppercase tracking-wide text-[var(--fg-subtle)]">
          {{ t('trackables.deleteWizard.matterConsequencesTitle') }}
        </p>
        <ul class="m-0 list-none space-y-1.5 pl-0">
          <li
            v-for="(line, i) in matterConsequences"
            :key="i"
            class="flex gap-2 text-sm leading-snug text-[var(--fg-muted)]"
          >
            <span class="mt-0.5 shrink-0 text-accent" aria-hidden>·</span>
            <span>{{ line }}</span>
          </li>
        </ul>
      </div>
      <p class="m-0 text-sm leading-relaxed text-[var(--fg-muted)]">
        {{ t('trackables.deleteWizard.permanentInstruction') }}
        <strong class="text-[var(--fg-default)]">{{ t('trackables.deleteWizard.permanentTypeWord') }}</strong>
        {{ t('trackables.deleteWizard.permanentInstructionAfter') }}
      </p>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-[var(--fg-default)]" for="delete-trackable-confirm-input">
          {{ t('trackables.deleteWizard.permanentInputLabel') }}
        </label>
        <InputText
          id="delete-trackable-confirm-input"
          v-model="confirmText"
          :placeholder="t('trackables.deleteWizard.permanentTypeWord')"
          autocomplete="off"
          @keyup.enter="canSubmit && doDelete()"
        />
      </div>
    </div>

    <div v-else-if="phase === 'running' || phase === 'done'" class="flex flex-col gap-4 pt-1">
      <Steps
        v-model:active-step="progressStep"
        :model="progressModel"
        :readonly="true"
        class="w-full"
      />
      <div v-if="phase === 'running'" class="flex items-center gap-2 text-sm text-[var(--fg-muted)]">
        <ProgressSpinner style="width: 28px; height: 28px" stroke-width="4" />
        <span>{{ t('trackables.deleteWizard.statusDeleting') }}</span>
      </div>
      <div v-else class="flex items-center gap-2 text-sm text-[var(--fg-muted)]">
        <i class="pi pi-check-circle text-accent" />
        <span>{{ t('trackables.deleteWizard.statusDone') }}</span>
      </div>
    </div>

    <div v-else-if="phase === 'error'" class="flex flex-col gap-3 pt-1">
      <p class="m-0 text-sm text-red-600 dark:text-red-400">
        {{ t('trackables.deleteWizard.statusError') }}
      </p>
    </div>

    <template #footer>
      <div v-if="phase === 'confirmText'" class="flex w-full flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          :label="t('common.cancel')"
          severity="secondary"
          outlined
          @click="open = false"
        />
        <Button
          type="button"
          :label="t('trackables.deleteWizard.permanentContinue')"
          icon="pi pi-arrow-right"
          icon-pos="right"
          severity="danger"
          :disabled="!canSubmit"
          :loading="deleting"
          @click="doDelete"
        />
      </div>
      <div v-else-if="phase === 'done'" class="flex w-full justify-end">
        <Button
          :label="t('trackables.deleteWizard.close')"
          icon="pi pi-times"
          severity="secondary"
          outlined
          @click="open = false"
        />
      </div>
      <div v-else-if="phase === 'error'" class="flex w-full justify-end">
        <Button :label="t('trackables.deleteWizard.close')" @click="open = false" />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Steps from 'primevue/steps';
import ProgressSpinner from 'primevue/progressspinner';
import { useToast } from 'primevue/usetoast';
import { apiClient } from '@/api/client';

type Phase = 'confirmText' | 'running' | 'done' | 'error';

const props = defineProps<{
  visible: boolean;
  trackable: { id: string; title: string } | null;
}>();

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void;
  (e: 'deleted'): void;
}>();

const { t } = useI18n();
const toast = useToast();

const open = computed({
  get: () => props.visible,
  set: (v) => emit('update:visible', v),
});

const phase = ref<Phase>('confirmText');
const confirmText = ref('');
const progressStep = ref(0);
const deleting = ref(false);
let progressTimer: ReturnType<typeof setInterval> | null = null;

const progressModel = computed(() => [
  { label: t('trackables.deleteWizard.stepDocuments') },
  { label: t('trackables.deleteWizard.stepFolders') },
  { label: t('trackables.deleteWizard.stepActivities') },
  { label: t('trackables.deleteWizard.stepMatter') },
]);

const canSubmit = computed(() => {
  const word = t('trackables.deleteWizard.permanentTypeWord').trim().toLowerCase();
  return confirmText.value.trim().toLowerCase() === word;
});

const matterConsequences = computed(() => [
  t('trackables.deleteWizard.matterConsequence1'),
  t('trackables.deleteWizard.matterConsequence2'),
  t('trackables.deleteWizard.matterConsequence3'),
]);

const dialogTitle = computed(() => {
  if (phase.value === 'confirmText') return t('trackables.deleteWizard.wizardTitleConfirmDelete');
  if (phase.value === 'running' || phase.value === 'done') return t('trackables.deleteWizard.wizardTitleDeleting');
  if (phase.value === 'error') return t('trackables.deleteWizard.wizardTitleError');
  return t('trackables.deleteWizard.wizardTitleMatter');
});

const headerClass = computed(() => {
  if (phase.value === 'done') {
    return 'bg-gradient-to-b from-emerald-50/95 to-[var(--p-dialog-header-background,transparent)] dark:from-emerald-950/50';
  }
  if (phase.value === 'confirmText' || phase.value === 'running' || phase.value === 'error') {
    return 'bg-gradient-to-b from-red-50/95 to-[var(--p-dialog-header-background,transparent)] dark:from-red-950/50';
  }
  return 'bg-gradient-to-b from-amber-50/95 to-[var(--p-dialog-header-background,transparent)] dark:from-amber-950/40';
});

const iconDiscClass = computed(() => {
  if (phase.value === 'done') return 'bg-emerald-100/95 dark:bg-emerald-900/50';
  if (phase.value === 'confirmText' || phase.value === 'running' || phase.value === 'error') {
    return 'bg-red-100/95 dark:bg-red-900/50';
  }
  return 'bg-amber-100/95 dark:bg-amber-900/45';
});

const iconTextClass = computed(() => {
  if (phase.value === 'done') return 'text-emerald-600 dark:text-emerald-300';
  if (phase.value === 'confirmText' || phase.value === 'running' || phase.value === 'error') {
    return 'text-red-600 dark:text-red-400';
  }
  return 'text-amber-700 dark:text-amber-300';
});

const iconClass = computed(() => {
  if (phase.value === 'done') return 'pi pi-check-circle';
  if (phase.value === 'running') return 'pi pi-sync';
  if (phase.value === 'error') return 'pi pi-times-circle';
  if (phase.value === 'confirmText') return 'pi pi-exclamation-triangle';
  return 'pi pi-trash';
});

/** Sombra del panel: éxito al terminar, riesgo/peligro en el resto. */
const deletePanelVariantClass = computed(() => {
  if (phase.value === 'done') return 'alega-confirm-panel--success';
  return 'alega-confirm-panel--danger';
});

function clearTimer() {
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
}

function onHide() {
  clearTimer();
  phase.value = 'confirmText';
  confirmText.value = '';
  progressStep.value = 0;
}

async function doDelete() {
  if (!props.trackable || !canSubmit.value) return;
  deleting.value = true;
  phase.value = 'running';
  progressStep.value = 0;
  clearTimer();

  progressTimer = setInterval(() => {
    if (progressStep.value < progressModel.value.length - 1) {
      progressStep.value += 1;
    }
  }, 550);

  try {
    await apiClient.delete(`/trackables/${props.trackable.id}`);
    clearTimer();
    progressStep.value = progressModel.value.length - 1;
    phase.value = 'done';
    toast.add({ severity: 'success', summary: t('trackables.deleteWizard.toastDeleted'), life: 3000 });
    emit('deleted');
  } catch {
    clearTimer();
    phase.value = 'error';
    toast.add({ severity: 'error', summary: t('trackables.deleteWizard.toastDeleteError'), life: 4000 });
  } finally {
    deleting.value = false;
  }
}
</script>
