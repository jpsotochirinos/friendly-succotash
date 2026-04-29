<script setup lang="ts">
import { computed } from 'vue';
import { URGENCY_TOKENS, type UrgencyLevel, type ActuacionTipo } from '../urgency';

const props = withDefaults(
  defineProps<{
    level: UrgencyLevel;
    tipo?: ActuacionTipo;
    label?: string;
    /** Letra opcional para micro-pill (P/A/N). */
    letter?: string;
  }>(),
  { letter: '' },
);

const t = computed(() => URGENCY_TOKENS[props.level]);

const fallbackLetter = computed(() => {
  if (props.letter) return props.letter;
  if (props.tipo === 'audiencia' || props.tipo === 'diligencia') return 'A';
  if (props.tipo === 'plazo') return 'P';
  if (props.tipo === 'notificacion_sinoe') return 'N';
  return '·';
});

const text = computed(() => props.label ?? t.value.label);
</script>

<template>
  <span
    class="urgency-pill"
    :style="{
      background: t.bg,
      color: t.text,
      borderColor: t.border,
    }"
  >
    <span class="urgency-pill__letter">{{ fallbackLetter }}</span>
    <span class="urgency-pill__text">{{ text }}</span>
  </span>
</template>

<style scoped>
.urgency-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 3px;
  border: 1px solid transparent;
  font-feature-settings: 'tnum' 1;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
  white-space: nowrap;
}
.urgency-pill__letter {
  font-weight: 800;
  opacity: 0.85;
}
.urgency-pill__text {
  font-weight: 600;
}
</style>
