<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    name: string | null;
    size?: number;
    showLabel?: boolean;
  }>(),
  { size: 22, showLabel: false },
);

const PALETTE = [
  '#3b5bdb',
  '#0ca678',
  '#e67700',
  '#862e9c',
  '#1971c2',
  '#c92a2a',
  '#2f9e44',
  '#5f3dc4',
];

function hashColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  }
  return PALETTE[hash % PALETTE.length];
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .filter(Boolean)
    .join('')
    .toUpperCase();
}

const isAssigned = computed(() => !!props.name);
const bg = computed(() => (props.name ? hashColor(props.name) : 'transparent'));
const label = computed(() => (props.name ? initials(props.name) : ''));
const fontSize = computed(() => `${Math.max(9, Math.round(props.size * 0.42))}px`);
</script>

<template>
  <span class="assignee-wrap" :class="{ 'assignee-wrap--inline': showLabel }">
    <span
      v-if="isAssigned"
      class="assignee-avatar"
      :style="{
        background: bg,
        width: `${size}px`,
        height: `${size}px`,
        fontSize,
      }"
      :aria-label="name ?? 'Asignado'"
      :title="name ?? ''"
    >{{ label }}</span>
    <span
      v-else
      class="assignee-avatar assignee-avatar--empty"
      :style="{ width: `${size}px`, height: `${size}px` }"
      aria-label="Sin asignar"
      title="Sin asignar"
    >
      <i class="pi pi-user-plus" :style="{ fontSize }" />
    </span>
    <span v-if="showLabel" class="assignee-label">{{ name ?? 'Sin asignar' }}</span>
  </span>
</template>

<style scoped>
.assignee-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.assignee-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  color: #fff;
  font-weight: 700;
  flex-shrink: 0;
  letter-spacing: 0.02em;
}
.assignee-avatar--empty {
  background: var(--surface-sunken);
  border: 1.5px dashed var(--surface-border-strong);
  color: var(--fg-subtle);
}
.assignee-label {
  font-size: 11px;
  color: var(--fg-muted);
  white-space: nowrap;
}
</style>
