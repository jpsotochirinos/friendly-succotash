<template>
  <span
    v-if="variant === 'mark'"
    class="inline-flex shrink-0 select-none text-fg [&>svg]:block"
    :class="[markSizeClass, props.class]"
    v-html="markSvgHtml"
    role="img"
    aria-label="Alega"
  />
  <span
    v-else
    :class="['inline-flex items-center gap-2.5 select-none text-fg', props.class]"
  >
    <span
      class="inline-flex shrink-0 [&>svg]:block"
      :class="markSizeClass"
      v-html="markSvgHtml"
      aria-hidden="true"
    />
    <span :class="['font-semibold tracking-tight leading-none', wordmarkSizeClass]">Alega</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import logoMarkSvgRaw from '@/assets/brand/logo-mark.svg?raw';

/** Inline SVG; strip baked-in hex fills so `fill: currentColor` tracks `color` / theme tokens. */
function prepareLogoMarkSvg(raw: string): string {
  let trimmed = raw
    .replace(/<\?xml[^?]*\?>\s*/i, '')
    .replace(/<!--[\s\S]*?-->\s*/, '');
  trimmed = trimmed.replace(/fill:\s*#[0-9a-fA-F]{3,8}/gi, 'fill:currentColor');
  trimmed = trimmed.replace(/\bfill="#[0-9a-fA-F]{3,8}"/gi, 'fill="currentColor"');
  return trimmed.replace(
    /<svg([^>]*)>/i,
    '<svg class="block h-full w-full max-h-full max-w-full" focusable="false"$1>',
  );
}

const markSvgHtml = prepareLogoMarkSvg(logoMarkSvgRaw);

const props = withDefaults(
  defineProps<{
    /** `wordmark` = símbolo + texto "Alega"; `mark` = solo símbolo */
    variant?: 'wordmark' | 'mark';
    size?: 'sm' | 'md' | 'lg';
    class?: string;
  }>(),
  { variant: 'wordmark', size: 'md' },
);

const markSizeClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'h-7 w-7';
    case 'lg':
      return 'h-11 w-11';
    default:
      return 'h-8 w-8';
  }
});

const wordmarkSizeClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'text-base';
    case 'lg':
      return 'text-2xl';
    default:
      return 'text-lg';
  }
});
</script>
