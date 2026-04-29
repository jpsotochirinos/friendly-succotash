<script setup lang="ts">
defineProps<{ value: string; size?: 'sm' | 'md' }>();
</script>

<template>
  <span
    class="case-key"
    :class="size === 'md' ? 'case-key--md' : 'case-key--sm'"
  >{{ value }}</span>
</template>

<style scoped>
.case-key {
  display: inline-flex;
  align-items: center;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-feature-settings: 'tnum' 1, 'lnum' 1;
  font-variant-numeric: tabular-nums lining-nums;
  letter-spacing: 0.04em;
  font-weight: 600;
  border: 1px solid var(--surface-border);
  background: color-mix(in srgb, var(--surface-raised) 88%, var(--accent-soft));
  color: var(--fg-muted);
  border-radius: 4px;
  text-transform: uppercase;
  white-space: nowrap;
}
.case-key--sm {
  font-size: 10px;
  padding: 1px 6px;
}
.case-key--md {
  font-size: 11px;
  padding: 2px 8px;
}
</style>
