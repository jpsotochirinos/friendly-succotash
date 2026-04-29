<script setup lang="ts">
import { computed } from 'vue';
import { TIPO_LABEL, type ActuacionTipo, type UrgencyLevel, URGENCY_TOKENS } from '../urgency';

const props = defineProps<{
  tipo: ActuacionTipo;
  level: UrgencyLevel;
}>();

const bar = computed(() => URGENCY_TOKENS[props.level].bar);
</script>

<template>
  <span class="type-tag" :style="{ '--bar-color': bar }">
    <span class="type-tag__bar" />
    <span class="type-tag__text">{{ TIPO_LABEL[tipo] }}</span>
  </span>
</template>

<style scoped>
.type-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--fg-muted);
  background: var(--surface-sunken);
  border-radius: 3px;
  padding: 2px 7px 2px 4px;
}
.type-tag__bar {
  width: 3px;
  height: 10px;
  border-radius: 1px;
  background: var(--bar-color, var(--fg-subtle));
}
</style>
