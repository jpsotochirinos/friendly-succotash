<template>
  <div class="space-y-2">
    <div class="flex justify-between text-sm">
      <span class="text-fg-muted">{{ label }}</span>
      <span class="font-medium text-fg">
        {{ consumed.toLocaleString() }} / {{ total.toLocaleString() }}
        <span v-if="extraBalance > 0" class="text-fg-muted font-normal">
          (+{{ extraBalance.toLocaleString() }} {{ t('settings.billingUi.bonusBalance') }})
        </span>
      </span>
    </div>
    <ProgressBar :value="pct" :show-value="false" class="h-2" />
    <p v-if="hint" class="text-xs text-fg-muted">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import ProgressBar from 'primevue/progressbar';

const props = withDefaults(
  defineProps<{
    periodCredits: number;
    periodConsumed: number;
    balance: number;
    label?: string;
    hint?: string;
  }>(),
  { label: undefined, hint: undefined },
);

const { t } = useI18n();

const total = computed(() => Math.max(props.periodCredits, 1));
const consumed = computed(() => props.periodConsumed);
const extraBalance = computed(() => props.balance);

const pct = computed(() => {
  const p = (props.periodConsumed / total.value) * 100;
  return Math.min(100, Math.round(p));
});
</script>
