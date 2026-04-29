<script setup lang="ts">
import { computed } from 'vue';

export interface PulseChip {
  key: string;
  label: string;
  count: number;
  variant: 'danger' | 'warn' | 'info' | 'mute' | 'ok';
  icon: string;
  hint?: string;
  forceShow?: boolean;
}

const props = defineProps<{
  chips: PulseChip[];
  active?: string | null;
}>();

const emit = defineEmits<{ (e: 'select', key: string | null): void }>();

const visible = computed(() => props.chips.filter((c) => c.count > 0 || c.forceShow));

function toggle(key: string) {
  emit('select', props.active === key ? null : key);
}
</script>

<template>
  <div class="pulse-chips" role="toolbar" aria-label="Resumen del día">
    <button
      v-for="chip in visible"
      :key="chip.key"
      type="button"
      class="pulse-chip"
      :class="[
        `pulse-chip--${chip.variant}`,
        { 'pulse-chip--active': active === chip.key },
      ]"
      :aria-pressed="active === chip.key"
      @click="toggle(chip.key)"
    >
      <span class="pulse-chip__dot" aria-hidden="true" />
      <i :class="chip.icon" class="pulse-chip__icon" aria-hidden="true" />
      <span class="pulse-chip__num">{{ chip.count }}</span>
      <span class="pulse-chip__label">{{ chip.label }}</span>
      <span v-if="chip.hint" class="pulse-chip__hint">· {{ chip.hint }}</span>
    </button>
    <span v-if="!visible.length" class="pulse-chips__empty">
      Sin alertas para hoy.
    </span>
  </div>
</template>

<style scoped>
.pulse-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.pulse-chips__empty {
  font-size: 12px;
  color: var(--fg-subtle);
  font-style: italic;
}
.pulse-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  background: var(--surface-raised);
  color: var(--fg-muted);
  transition: transform 0.1s ease, box-shadow 0.1s ease, border-color 0.1s ease;
  font-family: inherit;
}
.pulse-chip:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}
.pulse-chip:focus-visible {
  outline: 2px solid var(--accent-ring);
  outline-offset: 2px;
}
.pulse-chip__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
.pulse-chip__icon {
  font-size: 11px;
}
.pulse-chip__num {
  font-weight: 700;
  font-feature-settings: 'tnum' 1;
  font-variant-numeric: tabular-nums;
}
.pulse-chip__label {
  font-weight: 600;
}
.pulse-chip__hint {
  font-weight: 500;
  opacity: 0.8;
}

.pulse-chip--danger {
  background: rgba(220,38,38,0.10);
  color: #7a1f19;
  border-color: rgba(220,38,38,0.22);
}
.pulse-chip--danger .pulse-chip__dot { background: #dc2626; }

.pulse-chip--warn {
  background: rgba(217,119,6,0.12);
  color: #6d3f06;
  border-color: rgba(217,119,6,0.22);
}
.pulse-chip--warn .pulse-chip__dot { background: #d97706; }

.pulse-chip--info {
  background: color-mix(in srgb, var(--brand-zafiro) 12%, var(--surface-raised));
  color: var(--brand-zafiro);
  border-color: color-mix(in srgb, var(--brand-zafiro) 28%, var(--surface-border));
}
.pulse-chip--info .pulse-chip__dot { background: var(--brand-zafiro); }

.pulse-chip--ok {
  background: rgba(12,166,120,0.12);
  color: #1c4023;
  border-color: rgba(12,166,120,0.22);
}
.pulse-chip--ok .pulse-chip__dot { background: #0ca678; }

.pulse-chip--mute {
  background: var(--surface-sunken);
  color: var(--fg-muted);
  border-color: var(--surface-border);
}
.pulse-chip--mute .pulse-chip__dot { background: var(--fg-subtle); }

.pulse-chip--active {
  border-width: 1.5px;
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}
</style>
