<template>
  <tr class="border-b border-surface-border">
    <td class="py-2 px-3 text-sm align-middle">{{ row.fullName }}</td>
    <td class="py-2 px-3 text-xs text-fg-muted align-middle break-all max-w-[12rem]">{{ row.email }}</td>
    <td class="py-2 px-3 align-middle">
      <div v-if="canManage" class="allocation-inline flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <InputNumber
          :model-value="modelValue.limit"
          :input-id="limitInputId"
          :min="0"
          :max="999999999"
          :disabled="modelValue.unlimited"
          :aria-label="t('settings.billingUi.allocationLimitLabel')"
          class="allocation-input shrink-0"
          input-class="allocation-input-field"
          :show-buttons="false"
          @update:model-value="onLimitInput"
        />
        <div class="flex items-center gap-2 shrink-0 border-l border-surface-border pl-3">
          <ToggleSwitch
            :model-value="modelValue.unlimited"
            :input-id="unlimitedToggleId"
            :aria-label="t('settings.billingUi.allocationUnlimitedShort')"
            @update:model-value="onUnlimitedInput"
          />
          <span class="text-xs text-fg-muted select-none">{{ t('settings.billingUi.allocationUnlimitedShort') }}</span>
        </div>
      </div>
      <span v-else class="text-sm text-fg-muted tabular-nums">
        {{ row.monthlyLimit == null ? '—' : row.monthlyLimit.toLocaleString() }}
      </span>
    </td>
    <td class="py-2 px-3 text-sm text-fg-muted whitespace-nowrap align-middle tabular-nums text-right">
      {{ row.monthConsumed.toLocaleString() }}
    </td>
  </tr>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import InputNumber from 'primevue/inputnumber';
import ToggleSwitch from 'primevue/toggleswitch';
import type { CreditAllocationDto } from '@/api/billing';

export type AllocationDraft = {
  unlimited: boolean;
  limit: number;
};

const props = defineProps<{
  row: CreditAllocationDto;
  canManage: boolean;
  modelValue: AllocationDraft;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: AllocationDraft];
}>();

const { t } = useI18n();

const limitInputId = computed(() => `credit-alloc-limit-${props.row.userId}`);
const unlimitedToggleId = computed(() => `credit-alloc-unl-${props.row.userId}`);

function onUnlimitedInput(u: boolean) {
  emit('update:modelValue', {
    unlimited: u,
    limit: u ? 0 : props.modelValue.limit,
  });
}

function onLimitInput(n: number | null) {
  emit('update:modelValue', {
    unlimited: false,
    limit: Math.max(0, Math.floor(Number(n ?? 0))),
  });
}
</script>

<style scoped>
.allocation-inline :deep(.p-inputnumber) {
  width: auto;
}
.allocation-inline :deep(.allocation-input-field) {
  width: 4.75rem;
  min-height: 2rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.8125rem;
  line-height: 1.25rem;
  text-align: right;
}
.allocation-inline :deep(.p-toggleswitch) {
  transform: scale(0.92);
  transform-origin: center left;
}
</style>
