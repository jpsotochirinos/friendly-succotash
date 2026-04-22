<template>
  <span
    class="inline-flex shrink-0 items-center justify-center rounded-full font-semibold leading-none text-white ring-2 ring-white dark:ring-gray-800"
    :class="sizeClass"
    :style="{ backgroundColor: bgColor }"
    :title="title"
  >
    <img
      v-if="avatarUrl"
      :src="avatarUrl"
      :alt="title || 'Avatar'"
      class="h-full w-full rounded-full object-cover"
    />
    <span v-else class="select-none">{{ initials }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
    size?: 'sm' | 'md';
  }>(),
  { size: 'sm' },
);

const title = computed(() => {
  const n = [props.firstName, props.lastName].filter(Boolean).join(' ').trim();
  return n || props.email || '';
});

const initials = computed(() => {
  const fn = props.firstName?.trim();
  const ln = props.lastName?.trim();
  if (fn && ln) return (fn[0] + ln[0]).toUpperCase();
  if (fn) return fn.slice(0, 2).toUpperCase();
  const em = props.email?.trim();
  if (em) return em.slice(0, 2).toUpperCase();
  return '?';
});

function hashHue(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % 360;
}

const bgColor = computed(() => {
  const key = title.value || props.email || 'x';
  const h = hashHue(key);
  return `hsl(${h} 45% 42%)`;
});

const sizeClass = computed(() =>
  props.size === 'md' ? 'h-8 w-8 text-xs' : 'h-7 w-7 text-[10px]',
);
</script>
