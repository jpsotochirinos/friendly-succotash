<script setup lang="ts">
import { URGENCY_TOKENS } from '../urgency';

const items = [
  { label: 'Vencido / 24h', tokens: URGENCY_TOKENS.urgent },
  { label: '2–5 días', tokens: URGENCY_TOKENS.warn },
  { label: '> 5 días', tokens: URGENCY_TOKENS.normal },
  { label: 'Audiencia', tokens: URGENCY_TOKENS.info },
  { label: 'Cumplido', tokens: URGENCY_TOKENS.done },
];
</script>

<template>
  <div class="legend">
    <span
      v-for="(it, i) in items"
      :key="i"
      class="legend__item"
    >
      <span
        class="legend__pill"
        :style="{ background: it.tokens.bg, color: it.tokens.text, borderColor: it.tokens.border }"
      />
      {{ it.label }}
    </span>
    <span class="legend__item legend__item--muted">
      <i class="pi pi-flag-fill" style="color: #d97706;" /> Feriado PE
    </span>
  </div>
</template>

<style scoped>
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 10px;
  color: var(--fg-subtle);
  padding: 4px 2px;
}
.legend__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.legend__pill {
  display: inline-block;
  width: 18px;
  height: 10px;
  border-radius: 3px;
  border: 1px solid transparent;
}
.legend__item--muted i {
  font-size: 10px;
}
</style>
