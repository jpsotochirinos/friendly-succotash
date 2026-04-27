<template>
  <div class="sig-otp-delivery w-full text-[var(--fg-default)]">
    <div
      :class="[
        'rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] ring-1 ring-[var(--surface-border)]/60 dark:shadow-[0_1px_2px_rgba(0,0,0,0.25)]',
        compact
          ? 'p-3 shadow-sm'
          : 'p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] sm:p-5',
      ]"
    >
      <header
        :class="[
          'flex border-b border-[var(--surface-border)]/80',
          compact
            ? 'mb-2 flex-row items-center gap-2.5 pb-2'
            : 'mb-4 flex flex-col gap-3 pb-4 sm:mb-5 sm:flex-row sm:items-start sm:gap-4 sm:pb-5',
        ]"
      >
        <div
          :class="[
            'flex shrink-0 items-center justify-center bg-primary/10 text-primary ring-1 ring-inset ring-primary/20',
            compact ? 'h-9 w-9 rounded-lg' : 'h-12 w-12 rounded-2xl',
          ]"
          aria-hidden="true"
        >
          <i class="pi pi-shield" :style="{ fontSize: compact ? '1.1rem' : '1.35rem' }" />
        </div>
        <div class="min-w-0 flex-1">
          <h2
            :class="[
              'm-0 font-semibold leading-snug tracking-tight text-[var(--fg-default)]',
              compact ? 'text-sm' : 'text-base',
            ]"
          >
            {{ t('signatures.otpChannel') }}
          </h2>
          <p
            v-if="!compact"
            class="mt-1.5 m-0 max-w-prose text-sm leading-relaxed text-[var(--fg-muted)]"
          >
            {{ t('signatures.otpChannelIntro') }}
          </p>
        </div>
      </header>

      <div
        :class="['mb-3 grid grid-cols-1 gap-2', compact ? '' : 'sm:grid-cols-2']"
        role="radiogroup"
        :aria-label="t('signatures.otpChannel')"
      >
        <button
          v-for="opt in options"
          :key="opt.value"
          type="button"
          role="radio"
          :aria-checked="modelChannel === opt.value"
          :disabled="disabled"
          :class="buttonClass(modelChannel === opt.value)"
          :tabindex="disabled ? -1 : 0"
          @click="modelChannel = opt.value"
        >
          <i
            :class="[opt.icon, 'shrink-0', modelChannel === opt.value ? 'text-primary' : 'text-[var(--fg-muted)]']"
            :style="{ fontSize: compact ? '1rem' : '1.1rem' }"
          />
          <span
            :class="[
              'text-left font-medium leading-tight',
              compact ? 'text-xs' : 'text-sm',
              modelChannel === opt.value ? 'text-[var(--fg-default)]' : 'text-[var(--fg-muted)]',
            ]"
          >{{ opt.label }}</span
          >
        </button>
      </div>

      <div
        v-if="showPhoneField && modelChannel === 'whatsapp'"
        class="mb-3 rounded-xl border border-dashed border-[var(--surface-border)] bg-[var(--surface-ground)]/60 p-3 sm:p-4"
      >
        <label
          :for="phoneFieldId"
          class="m-0 mb-2 block text-xs font-medium uppercase tracking-wide text-[var(--fg-muted)]"
        >
          {{ t('signatures.otpPhoneLabel') }}
        </label>
        <InputText
          :id="phoneFieldId"
          v-model="modelPhone"
          :placeholder="t('signatures.otpPhonePlaceholder')"
          class="w-full"
          type="tel"
          autocomplete="tel"
          :invalid="!!(modelPhone && !phoneValid)"
          :disabled="disabled"
        />
        <Message
          v-if="modelPhone && !phoneValid"
          severity="warn"
          :closable="false"
          class="mt-2 text-sm"
        >
          {{ t('signatures.otpPhoneInvalid') }}
        </Message>
      </div>

      <Message
        v-if="error"
        severity="error"
        :closable="true"
        class="mb-3"
        @close="emit('clearError')"
        >{{ error }}</Message
      >

      <Button
        :label="t('signatures.getOtp')"
        class="w-full"
        :loading="loading"
        :disabled="sendDisabled"
        icon="pi pi-send"
        type="button"
        size="small"
        @click="emit('requestOtp')"
      />

      <div
        v-if="lastChannel"
        :class="[
          'mt-3 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 text-[var(--fg-default)]',
          compact ? 'px-2.5 py-2 text-xs' : 'px-3 py-2.5 text-sm',
        ]"
        role="status"
      >
        <i
          class="pi pi-check-circle mt-0.5 shrink-0 text-primary"
          :style="{ fontSize: compact ? '0.85rem' : '0.95rem' }"
          aria-hidden="true"
        />
        <span class="min-w-0 leading-snug">
          {{
            t('signatures.otpChannelHint', {
              channel:
                lastChannel === 'email' ? t('signatures.channelEmail') : t('signatures.channelWhatsapp'),
            })
          }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';

const { t } = useI18n();
const phoneFieldId = `sig-otp-wa-${useId()}`;

const modelChannel = defineModel<'email' | 'whatsapp'>('channel', { required: true });
const modelPhone = defineModel<string>('phone', { default: '' });

const props = withDefaults(
  defineProps<{
    showPhoneField?: boolean;
    phoneValid?: boolean;
    lastChannel?: 'email' | 'whatsapp' | null;
    error?: string;
    disabled?: boolean;
    loading?: boolean;
    /** Barra lateral u overlay: menos copy y apilado vertical. */
    compact?: boolean;
  }>(),
  {
    showPhoneField: true,
    phoneValid: true,
    compact: false,
  },
);

const emit = defineEmits<{
  requestOtp: [];
  clearError: [];
}>();

const options = computed(() => [
  { label: t('signatures.channelEmail'), value: 'email' as const, icon: 'pi pi-envelope' },
  { label: t('signatures.channelWhatsapp'), value: 'whatsapp' as const, icon: 'pi pi-whatsapp' },
]);

const sendDisabled = computed(
  () =>
    !!props.disabled ||
    (props.showPhoneField && modelChannel.value === 'whatsapp' && !props.phoneValid),
);

function buttonClass(on: boolean) {
  return [
    'flex cursor-pointer items-center rounded-xl border-2 text-left transition-all duration-200',
    props.compact ? 'gap-2 p-2.5' : 'gap-3 p-3',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/70',
    'disabled:cursor-not-allowed disabled:opacity-50',
    on
      ? 'border-primary/70 bg-primary/5 shadow-sm ring-1 ring-primary/15'
      : 'border-[var(--surface-border)] bg-[var(--surface-ground)]/40 hover:border-[var(--surface-border)] hover:bg-[var(--surface-ground)]/80',
  ];
}
</script>
