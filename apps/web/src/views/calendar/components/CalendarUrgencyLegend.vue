<template>
  <div class="cal-urgency-legend" :class="{ 'cal-urgency-legend--compact': compact }">
    <span
      v-for="item in items"
      :key="item.label"
      class="cal-urgency-legend__item"
    >
      <span
        v-if="item.tokens"
        class="cal-urgency-legend__pill"
        :style="{
          background: item.tokens.bg,
          color: item.tokens.text,
          borderColor: item.tokens.border,
        }"
        aria-hidden="true"
      />
      <i v-else :class="item.icon" :style="{ color: item.color }" aria-hidden="true" />
      <span class="cal-urgency-legend__label">{{ item.label }}</span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { URGENCY_TOKENS } from '@/sandbox/recipes/CalendarRedesign/urgency';

withDefaults(
  defineProps<{
    compact?: boolean;
  }>(),
  { compact: false },
);

const items = [
  { label: 'Vencido / 24h', tokens: URGENCY_TOKENS.urgent },
  { label: '2–5 días', tokens: URGENCY_TOKENS.warn },
  { label: '> 5 días', tokens: URGENCY_TOKENS.normal },
  { label: 'Audiencia', tokens: URGENCY_TOKENS.info },
  { label: 'Cumplido', tokens: URGENCY_TOKENS.done },
  { label: 'Feriado PE', icon: 'pi pi-flag-fill', color: '#d97706' },
];
</script>

<style scoped>
.cal-urgency-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem 0.85rem;
  font-size: 0.625rem;
  color: var(--fg-subtle);
  padding: 0.25rem 0.125rem;
}
.cal-urgency-legend--compact {
  gap: 0.375rem 0.625rem;
  padding: 0;
}
.cal-urgency-legend__item {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  gap: 0.375rem;
  line-height: 1.2;
}
.cal-urgency-legend__pill {
  display: inline-block;
  width: 1.125rem;
  height: 0.625rem;
  flex-shrink: 0;
  border-radius: 0.1875rem;
  border: 1px solid transparent;
}
.cal-urgency-legend__item i {
  flex-shrink: 0;
  font-size: 0.625rem;
}
.cal-urgency-legend__label {
  min-width: 0;
}
</style>
