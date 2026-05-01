<template>
  <div class="cal-frame-head">
    <div class="cal-frame-head__copy">
      <p class="cal-frame-head__primary">{{ primary }}</p>
      <p
        v-if="secondary"
        class="cal-frame-head__secondary"
      >
        {{ secondary }}
      </p>
    </div>
    <CalendarNavButtons
      class="cal-frame-head__nav"
      :prev-label="navPrevLabel"
      :next-label="navNextLabel"
      @prev="$emit('prev')"
      @next="$emit('next')"
    />
  </div>
</template>

<script setup lang="ts">
import CalendarNavButtons from './CalendarNavButtons.vue';

defineProps<{
  primary: string;
  secondary?: string | null;
  navPrevLabel: string;
  navNextLabel: string;
}>();

defineEmits<{
  (e: 'prev'): void;
  (e: 'next'): void;
}>();
</script>

<style scoped>
.cal-frame-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
  width: 100%;
}
.cal-frame-head__copy {
  min-width: 0;
}
.cal-frame-head__primary {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.25;
  color: var(--fg-default);
  text-wrap: balance;
}
.cal-frame-head__secondary {
  margin: 0.125rem 0 0;
  font-size: 0.75rem;
  line-height: 1.25;
  color: var(--fg-muted);
  font-feature-settings: 'tnum' 1, 'lnum' 1;
  font-variant-numeric: tabular-nums lining-nums;
}
.cal-frame-head__nav {
  justify-self: end;
}

@media (max-width: 520px) {
  .cal-frame-head {
    grid-template-columns: 1fr;
    align-items: start;
  }
  .cal-frame-head__nav {
    justify-self: start;
  }
}
</style>
