<template>
  <Dialog
    v-model:visible="open"
    :modal="true"
    :draggable="false"
    :dismissable-mask="!loading"
    :closable="!loading"
    :close-on-escape="!loading"
    :style="{ width: dialogWidth }"
    :pt="{
      mask: { class: 'alega-confirm-mask' },
      root: { class: ['alega-confirm-panel overflow-hidden', panelVariantClass] },
      header: { class: ['border-0 p-0 items-start gap-2', variantStyles.header] },
      content: { class: 'pt-0 pb-4' },
    }"
    @hide="onDialogHide"
  >
    <template #header>
      <div class="flex min-w-0 flex-1 items-start gap-3 pr-2">
        <div
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
          :class="[variantStyles.iconDisc]"
        >
          <i :class="[iconClass, 'text-xl', variantStyles.iconText]" />
        </div>
        <div class="flex min-w-0 flex-1 flex-col gap-0.5">
          <span class="block truncate text-lg font-semibold leading-tight text-[var(--fg-default)]">
            {{ title }}
          </span>
          <p
            v-if="subject"
            class="m-0 truncate text-sm font-medium leading-snug text-[var(--fg-muted)]"
            :title="subject"
          >
            «{{ subject }}»
          </p>
        </div>
      </div>
    </template>

    <div class="flex flex-col gap-3 pt-1">
      <p class="m-0 text-sm leading-relaxed text-[var(--fg-muted)]">
        {{ message }}
      </p>

      <div v-if="consequences?.length" class="flex flex-col gap-2">
        <p
          v-if="consequencesTitle"
          class="m-0 text-xs font-semibold uppercase tracking-wide text-[var(--fg-subtle)]"
        >
          {{ consequencesTitle }}
        </p>
        <ul class="m-0 list-none space-y-1.5 pl-0">
          <li
            v-for="(line, i) in consequences"
            :key="i"
            class="flex gap-2 text-sm leading-snug text-[var(--fg-muted)]"
          >
            <span class="mt-0.5 shrink-0 text-accent" aria-hidden>·</span>
            <span>{{ line }}</span>
          </li>
        </ul>
      </div>

      <div v-if="needsTypedPhrase" class="flex flex-col gap-2">
        <p v-if="typedConfirmHint" class="m-0 text-sm leading-relaxed text-[var(--fg-muted)]">
          {{ typedConfirmHint }}
        </p>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-[var(--fg-default)]" :for="typedInputId">
            {{ typedConfirmLabel }}
          </label>
          <InputText
            :id="typedInputId"
            v-model="phraseInput"
            :placeholder="typedConfirmPlaceholder || typedPhraseExpected"
            autocomplete="off"
            :disabled="loading"
            class="w-full"
            @keyup.enter="onConfirmClick"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex w-full flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          :label="cancelLabel"
          severity="secondary"
          outlined
          :disabled="loading"
          @click="onCancelLocal"
        />
        <Button
          type="button"
          :label="confirmLabel"
          :severity="variantStyles.buttonSeverity"
          :loading="loading"
          :disabled="loading || !canSubmit"
          @click="onConfirmClick"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';

export type ConfirmDialogBaseVariant = 'danger' | 'warning' | 'info' | 'success';

const props = withDefaults(
  defineProps<{
    /** Use v-model:visible from parent. */
    visible: boolean;
    title: string;
    message: string;
    variant?: ConfirmDialogBaseVariant;
    /** Expediente, documento u otra entidad (línea bajo el título). */
    subject?: string;
    /** Viñetas de consecuencias (“Qué pasará”). */
    consequences?: string[];
    consequencesTitle?: string;
    /**
     * Frase exacta que el usuario debe escribir (trim, sin distinguir mayúsculas).
     * Si se omite, no hay campo de confirmación por texto.
     */
    typedConfirmPhrase?: string;
    /** Texto de ayuda encima del campo (p. ej. “Esto no se puede deshacer…”). */
    typedConfirmHint?: string;
    /** Etiqueta del campo de texto. */
    typedConfirmLabel?: string;
    /** Placeholder del input; por defecto la frase esperada. */
    typedConfirmPlaceholder?: string;
    /** Default: "Confirmar" (override in parent or i18n at call site). */
    confirmLabel?: string;
    /** Default: "Cancelar" */
    cancelLabel?: string;
    loading?: boolean;
    /** Optional callback when cancel (after closing). */
    onCancel?: () => void;
  }>(),
  {
    variant: 'info',
    subject: '',
    consequences: () => [],
    consequencesTitle: '',
    typedConfirmPhrase: '',
    typedConfirmHint: '',
    typedConfirmLabel: 'Confirmación',
    typedConfirmPlaceholder: '',
    confirmLabel: 'Confirmar',
    cancelLabel: 'Cancelar',
    loading: false,
  },
);

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void;
  (e: 'hide'): void;
  (e: 'confirm'): void;
}>();

const open = computed({
  get: () => props.visible,
  set: (v: boolean) => emit('update:visible', v),
});

const phraseInput = ref('');
const typedInputId = useId();

const typedPhraseExpected = computed(() => props.typedConfirmPhrase?.trim() ?? '');

const needsTypedPhrase = computed(() => typedPhraseExpected.value.length > 0);

const canSubmit = computed(() => {
  if (!needsTypedPhrase.value) return true;
  return phraseInput.value.trim().toLowerCase() === typedPhraseExpected.value.toLowerCase();
});

const dialogWidth = computed(() => {
  const wide =
    (props.consequences?.length ?? 0) > 0 ||
    needsTypedPhrase.value ||
    (props.subject?.length ?? 0) > 48;
  return wide ? 'min(520px, 96vw)' : 'min(440px, 96vw)';
});

watch(
  () => props.visible,
  (v) => {
    if (v) phraseInput.value = '';
  },
);

const variantMap: Record<
  ConfirmDialogBaseVariant,
  {
    icon: string;
    iconDisc: string;
    iconText: string;
    header: string;
    buttonSeverity: 'danger' | 'warn' | 'info' | 'success';
  }
> = {
  danger: {
    icon: 'pi pi-exclamation-triangle',
    iconDisc: 'bg-red-100/95 dark:bg-red-900/50',
    iconText: 'text-red-600 dark:text-red-400',
    header: 'bg-gradient-to-b from-red-50/95 to-[var(--p-dialog-header-background,transparent)] dark:from-red-950/50',
    buttonSeverity: 'danger',
  },
  warning: {
    icon: 'pi pi-exclamation-circle',
    iconDisc: 'bg-amber-100/95 dark:bg-amber-900/45',
    iconText: 'text-amber-700 dark:text-amber-300',
    header:
      'bg-gradient-to-b from-amber-50/95 to-[var(--p-dialog-header-background,transparent)] dark:from-amber-950/40',
    buttonSeverity: 'warn',
  },
  info: {
    icon: 'pi pi-info-circle',
    iconDisc: 'bg-[var(--accent-soft)] dark:bg-[color-mix(in_srgb,var(--accent)_28%,transparent)]',
    iconText: 'text-accent',
    header:
      'bg-gradient-to-b from-[var(--accent-soft)] to-[var(--p-dialog-header-background,transparent)] dark:from-[color-mix(in_srgb,var(--accent)_22%,transparent)]',
    buttonSeverity: 'info',
  },
  success: {
    icon: 'pi pi-check-circle',
    iconDisc: 'bg-emerald-100/95 dark:bg-emerald-900/50',
    iconText: 'text-emerald-600 dark:text-emerald-300',
    header:
      'bg-gradient-to-b from-emerald-50/95 to-[var(--p-dialog-header-background,transparent)] dark:from-emerald-950/40',
    buttonSeverity: 'success',
  },
};

const variantStyles = computed(() => variantMap[props.variant]);

const panelVariantClass = computed(() => `alega-confirm-panel--${props.variant}`);

const iconClass = computed(() => variantMap[props.variant].icon);

function onCancelLocal() {
  if (props.loading) return;
  emit('update:visible', false);
  props.onCancel?.();
}

function onDialogHide() {
  phraseInput.value = '';
  emit('hide');
}

function onConfirmClick() {
  if (props.loading || !canSubmit.value) return;
  emit('confirm');
}
</script>
