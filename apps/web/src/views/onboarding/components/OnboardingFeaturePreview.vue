<template>
  <div
    class="onb-preview relative h-full min-h-0 overflow-hidden bg-[radial-gradient(circle_at_18%_18%,rgba(185,217,235,0.22),transparent_30%),linear-gradient(135deg,var(--brand-real)_0%,var(--brand-zafiro)_48%,var(--brand-abismo)_100%)]"
    :class="compact ? 'p-4' : 'p-6 sm:p-8'"
  >
    <div class="pointer-events-none absolute -right-20 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
    <div class="pointer-events-none absolute -bottom-24 left-6 h-64 w-64 rounded-full bg-brand-hielo/15 blur-3xl" aria-hidden="true" />

    <div class="relative z-[1] flex h-full min-h-0 flex-col">
      <header class="shrink-0 mb-5">
        <p class="text-[10px] font-semibold uppercase tracking-widest text-brand-hielo/90">
          {{ $t(`onboarding.previewEyebrow.${stepKey}`) }}
        </p>
        <h2 class="text-xl font-semibold text-white mt-1 leading-tight">
          {{ $t(`onboarding.previewTitle.${stepKey}`) }}
        </h2>
        <p class="text-sm mt-2 text-white/78 leading-relaxed max-w-sm">
          {{ $t(`onboarding.previewSubtitle.${stepKey}`) }}
        </p>
      </header>

      <div
        class="relative flex-1 min-h-0 rounded-[1.75rem] border border-white/15 bg-white/[0.06] p-4 shadow-2xl backdrop-blur-md"
        :class="compact ? 'min-h-[220px]' : 'min-h-[360px]'"
      >
        <div class="absolute inset-x-8 bottom-4 h-8 rounded-full bg-brand-abismo/35 blur-xl" aria-hidden="true" />

        <div
          class="relative mx-auto flex h-full max-w-[440px] items-center justify-center"
          :class="compact ? 'scale-[0.88]' : ''"
        >
          <!-- intent: designed matter board image -->
          <div v-if="stepKey === 'intent'" class="preview-illustration">
            <div class="preview-window rotate-[-2deg]">
              <div class="preview-window-top">
                <span />
                <span />
                <span />
              </div>
              <div class="grid grid-cols-3 gap-2 p-4">
                <div v-for="(col, index) in cols" :key="col" class="rounded-xl bg-brand-papel/95 p-2 shadow-sm">
                  <p class="mb-2 text-[10px] font-bold uppercase tracking-wide text-brand-real/70">{{ col }}</p>
                  <div
                    v-for="n in 2"
                    :key="`${col}-${n}`"
                    class="mb-2 rounded-lg border border-brand-hielo/60 bg-white p-2 last:mb-0"
                  >
                    <span class="mb-1 block h-1.5 rounded-full" :class="index === 0 ? 'bg-brand-zafiro/70' : index === 1 ? 'bg-amber-400/80' : 'bg-emerald-400/80'" />
                    <span class="block h-2 rounded-full bg-brand-real/15" />
                    <span class="mt-1 block h-2 w-2/3 rounded-full bg-brand-real/10" />
                  </div>
                </div>
              </div>
            </div>
            <div class="preview-float-card right-0 top-8">
              <i class="pi pi-clock text-brand-zafiro" aria-hidden="true" />
              <span>{{ previewCardLine }}</span>
            </div>
          </div>

          <!-- firm: identity card image -->
          <div v-else-if="stepKey === 'firm'" class="preview-illustration">
            <div class="preview-window">
              <div class="p-5">
                <div class="flex items-center gap-3">
                  <div class="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-hielo to-brand-zafiro shadow-lg" />
                  <div class="min-w-0">
                    <p class="truncate text-sm font-bold text-brand-medianoche">{{ firmNameOrPlaceholder }}</p>
                    <p class="text-[11px] text-brand-real/65">
                      {{ draft.firmType ? $t(`onboarding.firmTypes.${draft.firmType}`) : 'Legal ops' }}
                    </p>
                  </div>
                </div>
                <div class="mt-5 space-y-3">
                  <div v-for="(line, i) in setupLines" :key="line" class="flex items-center gap-3">
                    <span class="flex h-7 w-7 items-center justify-center rounded-full bg-brand-zafiro/10 text-[11px] font-bold text-brand-zafiro">{{ i + 1 }}</span>
                    <span class="h-2 flex-1 rounded-full bg-brand-real/12" />
                  </div>
                </div>
              </div>
            </div>
            <div class="preview-float-card -left-1 bottom-10">
              <i class="pi pi-shield text-brand-zafiro" aria-hidden="true" />
              <span>{{ draft.timezone || 'America/Lima' }}</span>
            </div>
          </div>

          <!-- practice: areas and template image -->
          <div v-else-if="stepKey === 'practice'" class="preview-illustration">
            <div class="preview-window rotate-[1.5deg]">
              <div class="p-5">
                <div class="mb-4 flex items-center justify-between">
                  <p class="text-sm font-bold text-brand-medianoche">{{ $t('onboarding.previewPracticeMap') }}</p>
                  <i class="pi pi-sitemap text-brand-zafiro" aria-hidden="true" />
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <span
                    v-for="a in practicePreviewKeys"
                    :key="a"
                    class="rounded-xl border border-brand-hielo/70 bg-brand-hielo/30 px-3 py-2 text-[11px] font-semibold text-brand-real"
                  >
                    {{ $t(`onboarding.practiceOptions.${a}`) }}
                  </span>
                </div>
                <div class="mt-5 rounded-2xl bg-brand-real/5 p-3">
                  <span class="block h-2 w-2/3 rounded-full bg-brand-zafiro/35" />
                  <span class="mt-2 block h-2 rounded-full bg-brand-real/12" />
                  <span class="mt-2 block h-2 w-4/5 rounded-full bg-brand-real/10" />
                </div>
              </div>
            </div>
          </div>

          <!-- workflow: calendar and document image -->
          <div v-else-if="stepKey === 'workflow'" class="preview-illustration">
            <div class="preview-window rotate-[-1deg]">
              <div class="grid grid-cols-[1fr_0.85fr] gap-3 p-4">
                <div class="rounded-2xl bg-brand-papel p-3">
                  <div class="mb-3 flex items-center justify-between">
                    <span class="h-2 w-16 rounded-full bg-brand-real/20" />
                    <i class="pi pi-calendar text-brand-zafiro" aria-hidden="true" />
                  </div>
                  <div class="grid grid-cols-4 gap-1.5">
                    <span
                      v-for="d in 16"
                      :key="d"
                      class="h-7 rounded-lg"
                      :class="d === 7 || d === 13 ? 'bg-brand-zafiro/70' : 'bg-brand-real/10'"
                    />
                  </div>
                </div>
                <div class="rounded-2xl bg-white p-3 shadow-sm">
                  <i class="pi pi-file text-brand-zafiro" aria-hidden="true" />
                  <p class="mt-3 text-[11px] font-bold text-brand-medianoche">{{ $t('onboarding.previewDocTitle') }}</p>
                  <span class="mt-2 block h-2 rounded-full bg-brand-real/15" />
                  <span class="mt-2 block h-2 w-2/3 rounded-full bg-brand-real/10" />
                </div>
              </div>
            </div>
            <div class="preview-float-card right-2 bottom-7">
              <i class="pi pi-bell text-amber-500" aria-hidden="true" />
              <span>{{ $t('onboarding.previewDocSub') }}</span>
            </div>
          </div>

          <!-- team: collaboration image -->
          <div v-else class="preview-illustration">
            <div class="preview-window">
              <div class="p-5">
                <div class="mb-5 flex -space-x-3">
                  <div
                    v-for="letter in ['A', 'L', 'E', 'G']"
                    :key="letter"
                    class="flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-brand-zafiro to-brand-medianoche text-sm font-bold text-white shadow"
                  >
                    {{ letter }}
                  </div>
                </div>
                <div class="space-y-2">
                  <div v-for="i in 3" :key="i" class="flex items-center gap-3 rounded-xl bg-brand-real/5 p-2">
                    <span class="h-8 w-8 rounded-full bg-brand-hielo" />
                    <span class="h-2 flex-1 rounded-full bg-brand-real/12" />
                    <span class="h-6 w-14 rounded-full bg-brand-zafiro/10" />
                  </div>
                </div>
              </div>
            </div>
            <div class="preview-float-card left-1 bottom-7">
              <i class="pi pi-send text-brand-zafiro" aria-hidden="true" />
              <span>{{ $t('onboarding.previewInviteMock') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { OnboardingDraft, OnboardingStepPreviewKey } from '../onboarding.types';
import { PRACTICE_AREA_KEYS } from '../onboarding.types';

const props = defineProps<{
  stepKey: OnboardingStepPreviewKey;
  draft: OnboardingDraft;
  compact?: boolean;
}>();

const { t } = useI18n();

const cols = computed(() => [
  t('onboarding.previewColTodo'),
  t('onboarding.previewColDoing'),
  t('onboarding.previewColDone'),
]);

const previewCardLine = computed(() => t('onboarding.previewCardBlurb'));

const firmNameOrPlaceholder = computed(() => props.draft.name.trim() || t('onboarding.previewFirmPlaceholder'));

const setupLines = computed(() => [
  t('onboarding.previewSetup1'),
  t('onboarding.previewSetup2'),
  t('onboarding.previewSetup3'),
]);

const practicePreviewKeys = computed(() => {
  const fromDraft = props.draft.practiceAreas.filter(Boolean);
  if (fromDraft.length) return fromDraft.slice(0, 6);
  return [...PRACTICE_AREA_KEYS].slice(0, 6);
});
</script>

<style scoped>
.preview-illustration {
  position: relative;
  width: min(100%, 25rem);
  min-height: 18rem;
}

.preview-window {
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 1.5rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(241, 247, 255, 0.92));
  box-shadow:
    0 28px 70px rgba(2, 8, 23, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.85);
}

.preview-window-top {
  display: flex;
  gap: 0.35rem;
  border-bottom: 1px solid rgba(42, 65, 94, 0.08);
  padding: 0.75rem 1rem;
}

.preview-window-top span {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
  background: rgba(74, 97, 130, 0.28);
}

.preview-float-card {
  position: absolute;
  display: flex;
  max-width: 13rem;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.92);
  padding: 0.65rem 0.8rem;
  color: var(--brand-medianoche);
  box-shadow: 0 18px 45px rgba(2, 8, 23, 0.24);
  font-size: 0.68rem;
  font-weight: 700;
}

@media (prefers-reduced-motion: no-preference) {
  .preview-window {
    animation: preview-float 6s ease-in-out infinite;
  }

  .preview-float-card {
    animation: preview-float 5s ease-in-out infinite reverse;
  }
}

@keyframes preview-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-0.35rem);
  }
}
</style>
