<template>
  <div
    class="rounded-xl border border-surface-border bg-surface-ground p-5 flex flex-col gap-3 shadow-sm"
    :class="{ 'ring-2 ring-[var(--accent)]': isCurrent }"
  >
    <div class="flex items-start justify-between gap-2">
      <div>
        <h3 class="text-base font-semibold text-fg">{{ plan.name }}</h3>
        <p class="text-xs text-fg-muted mt-0.5">{{ tierLabel }}</p>
      </div>
      <Tag v-if="isCurrent" severity="success" :value="t('settings.billingUi.planCurrent')" />
    </div>
    <ul class="text-sm text-fg-muted space-y-1 list-disc list-inside">
      <li v-for="(f, i) in plan.features" :key="i">{{ f }}</li>
    </ul>
    <div class="text-2xl font-semibold text-fg mt-auto">
      {{ priceLabel }}
    </div>
    <p class="text-xs text-fg-muted">
      {{ plan.creditsPerMonth.toLocaleString() }} {{ t('settings.billingUi.creditsPerMonth') }} ·
      {{ t('settings.billingUi.maxUsers', { n: plan.maxUsers }) }}
    </p>
    <Button
      v-if="!isCurrent && canManage"
      :label="actionLabel"
      :severity="isUpgrade ? 'primary' : 'secondary'"
      class="w-full"
      :disabled="loading"
      @click="$emit('select', plan.tier)"
    />
    <Button
      v-else-if="!isCurrent && !canManage"
      :label="t('settings.billingUi.planNoPerm')"
      class="w-full"
      severity="secondary"
      disabled
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import type { BillingPlan } from '@/api/billing';
import type { PlanTier } from '@tracker/shared';

const props = defineProps<{
  plan: BillingPlan;
  currentTier: PlanTier;
  tierOrder: (t: PlanTier) => number;
  canManage: boolean;
  loading?: boolean;
}>();

defineEmits<{ select: [tier: PlanTier] }>();

const { t } = useI18n();

const isCurrent = computed(() => props.plan.tier === props.currentTier);
const isUpgrade = computed(
  () => props.tierOrder(props.plan.tier) > props.tierOrder(props.currentTier),
);

const tierLabel = computed(() => props.plan.tier.toUpperCase());

const priceLabel = computed(() => {
  if (props.plan.priceCents === 0) return t('settings.billingUi.planFree');
  const major = (props.plan.priceCents / 100).toFixed(2);
  return `${props.plan.currency} ${major} / ${t('settings.billingUi.month')}`;
});

const actionLabel = computed(() =>
  isUpgrade.value ? t('settings.billingUi.planUpgrade') : t('settings.billingUi.planDowngrade'),
);
</script>
