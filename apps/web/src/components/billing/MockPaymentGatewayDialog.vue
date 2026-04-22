<template>
  <Dialog
    v-model:visible="visibleProxy"
    modal
    :header="title"
    :style="{ width: 'min(440px, 96vw)' }"
    :closable="!submitting"
    @hide="$emit('close')"
  >
    <Message severity="info" class="mb-4" :closable="false">
      {{ t('settings.billingUi.gatewayTestEnv') }}
      <span class="block mt-1 text-xs opacity-90">{{ t('settings.billingUi.gatewayDeclineHint') }}</span>
    </Message>

    <div v-if="paymentMethods.length" class="mb-4 space-y-2">
      <label class="text-sm font-medium text-fg">{{ t('settings.billingUi.gatewaySavedMethods') }}</label>
      <div class="flex flex-col gap-2">
        <label
          class="flex items-center gap-2 cursor-pointer rounded-lg border border-surface-border px-3 py-2"
          :class="selectedPmId === null ? 'ring-1 ring-[var(--accent)]' : ''"
        >
          <RadioButton v-model="selectedPmId" :value="null" name="pm" />
          <span class="text-sm">{{ t('settings.billingUi.gatewayNewCard') }}</span>
        </label>
        <label
          v-for="pm in paymentMethods"
          :key="pm.id"
          class="flex items-center gap-2 cursor-pointer rounded-lg border border-surface-border px-3 py-2"
          :class="selectedPmId === pm.id ? 'ring-1 ring-[var(--accent)]' : ''"
        >
          <RadioButton v-model="selectedPmId" :value="pm.id" name="pm" />
          <span class="text-sm">{{ pm.brand }} ···· {{ pm.last4 }}</span>
        </label>
      </div>
      <Divider />
    </div>

    <p v-if="amountHint" class="text-sm text-fg-muted mb-3">{{ amountHint }}</p>

    <div class="space-y-3">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">{{ t('settings.billingUi.gatewayHolder') }}</label>
        <InputText v-model="form.holderName" class="w-full" :disabled="useSaved" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">{{ t('settings.billingUi.gatewayCardNumber') }}</label>
        <InputText
          v-model="form.number"
          class="w-full font-mono"
          maxlength="23"
          :disabled="useSaved"
          placeholder="4242 4242 4242 4242"
          @update:model-value="onCardInput"
        />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('settings.billingUi.gatewayExpiry') }}</label>
          <InputText
            v-model="form.expiry"
            class="w-full font-mono"
            placeholder="MM/AA"
            maxlength="5"
            :disabled="useSaved"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('settings.billingUi.gatewayCvv') }}</label>
          <InputText
            v-model="form.cvv"
            class="w-full font-mono"
            maxlength="4"
            :disabled="useSaved"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <Button :label="t('common.cancel')" severity="secondary" text :disabled="submitting" @click="close" />
      <Button
        :label="t('settings.billingUi.gatewayConfirm')"
        :loading="submitting"
        :disabled="submitting"
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
import InputText from 'primevue/inputtext';
import RadioButton from 'primevue/radiobutton';
import Message from 'primevue/message';
import Divider from 'primevue/divider';
import type { PaymentMethodDto } from '@/api/billing';

const props = withDefaults(
  defineProps<{
    visible: boolean;
    title: string;
    paymentMethods: PaymentMethodDto[];
    amountHint?: string;
    submitting?: boolean;
  }>(),
  { amountHint: undefined, submitting: false },
);

const emit = defineEmits<{
  close: [];
  confirm: [
    payload:
      | { type: 'existing'; paymentMethodId: string }
      | {
          type: 'new';
          number: string;
          holderName: string;
          expMonth: number;
          expYear: number;
          cvv: string;
        },
  ];
}>();

const { t } = useI18n();

const visibleProxy = computed({
  get: () => props.visible,
  set: (v: boolean) => {
    if (!v) emit('close');
  },
});

const selectedPmId = ref<string | null>(null);
/** Saved card selected (not "new card"). */
const useSaved = computed(() => selectedPmId.value != null);

const form = ref({
  holderName: '',
  number: '',
  expiry: '',
  cvv: '',
});

watch(
  () => props.visible,
  (v) => {
    if (v) {
      form.value = { holderName: '', number: '', expiry: '', cvv: '' };
      selectedPmId.value =
        props.paymentMethods.find((p) => p.isDefault)?.id ?? props.paymentMethods[0]?.id ?? null;
      if (!props.paymentMethods.length) selectedPmId.value = null;
    }
  },
);

function onCardInput(val: string | undefined) {
  const d = (val ?? '').replace(/\D/g, '').slice(0, 16);
  const parts = d.match(/.{1,4}/g) ?? [];
  form.value.number = parts.join(' ');
}

function parseExpiry(): { expMonth: number; expYear: number } | null {
  const m = form.value.expiry.trim().match(/^(\d{2})\/(\d{2})$/);
  if (!m) return null;
  const mm = parseInt(m[1]!, 10);
  const yy = parseInt(m[2]!, 10);
  if (mm < 1 || mm > 12) return null;
  const year = yy < 100 ? 2000 + yy : yy;
  return { expMonth: mm, expYear: year };
}

function close() {
  emit('close');
}

function submit() {
  if (selectedPmId.value && useSaved.value) {
    emit('confirm', { type: 'existing', paymentMethodId: selectedPmId.value });
    return;
  }
  const digits = form.value.number.replace(/\D/g, '');
  if (digits.length < 13) return;
  const exp = parseExpiry();
  if (!exp) return;
  emit('confirm', {
    type: 'new',
    number: digits,
    holderName: form.value.holderName.trim() || 'Cardholder',
    expMonth: exp.expMonth,
    expYear: exp.expYear,
    cvv: form.value.cvv.replace(/\D/g, '').slice(0, 4),
  });
}
</script>
