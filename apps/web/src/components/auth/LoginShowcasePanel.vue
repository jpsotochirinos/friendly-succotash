<template>
  <div
    class="alega-showcase relative flex flex-1 flex-col justify-end"
    :class="rootClass"
    aria-hidden="true"
  >
    <!-- Product mock: browser frame + expediente-style UI (SVG, no generic KPI table) -->
    <div
      class="alega-showcase__frame relative z-[1] mx-auto w-full rounded-xl border shadow-lg"
      :class="frameClass"
      :style="frameStyle"
    >
      <!-- Browser chrome -->
      <div
        class="flex items-center gap-2 border-b px-3 py-2"
        :style="{ borderColor: 'var(--surface-border)', background: 'var(--surface-sunken)' }"
      >
        <span class="flex gap-1.5" aria-hidden="true">
          <span class="h-2.5 w-2.5 rounded-full opacity-80" style="background: #f87171" />
          <span class="h-2.5 w-2.5 rounded-full opacity-80" style="background: #fbbf24" />
          <span class="h-2.5 w-2.5 rounded-full opacity-80" style="background: #4ade80" />
        </span>
        <span
          class="ml-2 flex-1 truncate rounded-md px-2 py-0.5 text-[0.65rem] tabular-nums"
          :style="{
            background: 'color-mix(in srgb, var(--brand-zafiro) 8%, var(--surface-raised))',
            color: 'var(--fg-muted)',
          }"
          >app.alega · expediente</span
        >
      </div>

      <!-- App shell mock -->
      <div class="flex min-h-0 flex-1" :class="innerMinH">
        <!-- Sidebar -->
        <div
          class="hidden w-[22%] shrink-0 border-r sm:block"
          :style="{ borderColor: 'var(--surface-border)', background: 'var(--surface-sunken)' }"
        >
          <div class="space-y-2 p-2">
            <div
              v-for="n in 4"
              :key="n"
              class="h-2 rounded"
              :style="{
                width: n === 1 ? '88%' : `${70 + n * 4}%`,
                background:
                  n === 1
                    ? 'color-mix(in srgb, var(--brand-zafiro) 35%, var(--surface-raised))'
                    : 'var(--surface-border)',
              }"
            />
          </div>
        </div>
        <!-- Main -->
        <div class="min-w-0 flex-1 p-2 sm:p-3" :style="{ background: 'var(--surface-raised)' }">
          <!-- Stage bar -->
          <div class="mb-2 flex gap-1 overflow-hidden rounded-lg border p-1.5" :style="{ borderColor: 'var(--surface-border)' }">
            <span
              v-for="(lab, i) in stageLabels"
              :key="i"
              class="shrink-0 rounded px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-wide"
              :style="
                i === 0
                  ? {
                      background: 'color-mix(in srgb, var(--brand-zafiro) 18%, transparent)',
                      color: 'var(--brand-zafiro)',
                    }
                  : { color: 'var(--fg-subtle)', background: 'transparent' }
              "
              >{{ lab }}</span
            >
          </div>
          <!-- Title row -->
          <div class="mb-2 flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <div class="h-2.5 w-[75%] max-w-[12rem] rounded" :style="{ background: 'var(--fg-default)', opacity: 0.85 }" />
              <div class="mt-1.5 h-1.5 w-[50%] max-w-[8rem] rounded" :style="{ background: 'var(--fg-muted)', opacity: 0.5 }" />
            </div>
            <div
              class="hidden h-7 shrink-0 rounded-md border px-2 text-[0.55rem] font-semibold uppercase leading-7 sm:block"
              :style="{ borderColor: 'var(--surface-border)', color: 'var(--fg-muted)' }"
              >{{ t('auth.showcaseMockCta') }}</div
            >
          </div>
          <!-- Kanban-ish columns -->
          <div class="grid grid-cols-3 gap-1.5">
            <div
              v-for="col in 3"
              :key="col"
              class="rounded-lg border p-1.5"
              :style="{ borderColor: 'var(--surface-border)', background: 'var(--surface-app-soft)' }"
            >
              <div class="mb-1.5 h-1 w-10 rounded" :style="{ background: 'var(--fg-subtle)', opacity: 0.45 }" />
              <div
                v-for="card in colCards[col - 1]"
                :key="card"
                class="mb-1 rounded border px-1 py-1.5 last:mb-0"
                :style="{ borderColor: 'var(--surface-border)', background: 'var(--surface-raised)' }"
              >
                <div class="h-1 w-[90%] rounded" :style="{ background: 'var(--fg-muted)', opacity: 0.55 }" />
                <div class="mt-0.5 h-0.5 w-[66%] rounded" :style="{ background: 'var(--fg-subtle)', opacity: 0.4 }" />
              </div>
            </div>
          </div>
          <!-- Doc strip -->
          <div
            class="mt-2 flex items-center gap-2 rounded-lg border px-2 py-1.5"
            :style="{ borderColor: 'var(--surface-border)', background: 'color-mix(in srgb, var(--brand-hielo) 12%, var(--surface-raised))' }"
          >
            <i class="pi pi-file-pdf text-[0.85rem]" :style="{ color: 'var(--brand-zafiro)' }" />
            <div class="min-w-0 flex-1">
              <div class="h-1 w-32 max-w-full rounded" :style="{ background: 'var(--fg-default)', opacity: 0.7 }" />
              <div class="mt-0.5 h-0.5 w-20 rounded" :style="{ background: 'var(--fg-subtle)' }" />
            </div>
            <span class="hidden text-[0.55rem] font-medium uppercase text-fg-subtle sm:inline">{{ t('auth.showcaseMockSigned') }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Invite / magic: compact trust strip below frame -->
    <div
      v-if="variant === 'invite' || variant === 'magic'"
      class="relative z-[1] mx-auto mt-4 flex max-w-[min(100%,22rem)] items-center justify-center gap-2 rounded-lg border px-3 py-2"
      :style="{
        borderColor: 'color-mix(in srgb, #ffffff 22%, transparent)',
        background: 'color-mix(in srgb, #ffffff 10%, transparent)',
      }"
    >
      <i class="pi pi-shield text-sm" :style="{ color: 'var(--fg-on-brand)' }" />
      <span class="text-center text-[0.7rem] font-medium leading-snug" :style="{ color: 'color-mix(in srgb, var(--fg-on-brand) 90%, transparent)' }">
        {{ variant === 'magic' ? t('auth.showcaseTrustMagic') : t('auth.showcaseTrustInvite') }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = withDefaults(
  defineProps<{
    variant?: 'login' | 'register' | 'invite' | 'magic';
  }>(),
  { variant: 'login' },
);

const { t } = useI18n();

const stageLabels = computed(() => [
  t('auth.showcaseStage1'),
  t('auth.showcaseStage2'),
  t('auth.showcaseStage3'),
]);

const colCards = computed(() => {
  if (props.variant === 'register') return [[1, 2], [3], [4, 5]] as const;
  return [[1, 2], [3, 4], [5]] as const;
});

const rootClass = computed(() => {
  if (props.variant === 'register') return 'min-h-[min(24rem,50vh)] justify-center';
  if (props.variant === 'invite' || props.variant === 'magic') return 'min-h-[240px] justify-end';
  return 'min-h-[280px] justify-end';
});

const frameClass = computed(() => {
  if (props.variant === 'register') return 'max-w-[min(100%,30rem)] p-0 sm:scale-[1.02]';
  return 'max-w-[min(100%,26rem)]';
});

const innerMinH = computed(() => (props.variant === 'register' ? 'min-h-[14rem]' : 'min-h-[11rem]'));

const frameStyle = computed(() => ({
  borderColor: 'color-mix(in srgb, #ffffff 22%, transparent)',
  background:
    'linear-gradient(165deg, color-mix(in srgb, #ffffff 16%, transparent) 0%, color-mix(in srgb, var(--brand-hielo) 10%, transparent) 100%)',
  boxShadow: '0 24px 48px -12px rgba(13, 15, 43, 0.35)',
  backdropFilter: props.variant === 'register' ? 'blur(4px)' : 'blur(2px)',
}));
</script>

<style scoped>
.alega-showcase__frame {
  -webkit-backdrop-filter: blur(2px);
  backdrop-filter: blur(2px);
}
</style>
