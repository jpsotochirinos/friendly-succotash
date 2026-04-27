<template>
  <div class="min-h-screen brand-gradient-soft flex flex-col items-center justify-center px-3 py-8 sm:px-6 sm:py-12">
    <div
      class="w-full max-w-[1180px] mx-auto rounded-3xl border overflow-hidden shadow-2xl min-h-[min(680px,92vh)] flex flex-col"
      :style="{
        backgroundColor: 'var(--surface-raised)',
        borderColor: 'var(--surface-border)',
        boxShadow: 'var(--shadow-lg)',
      }"
    >
      <div class="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(320px,40%)]">
        <!-- Left: questions -->
        <div
          class="flex flex-col min-h-0 min-w-0 border-b lg:border-b-0 lg:border-r"
          :style="{ borderColor: 'var(--surface-border)' }"
        >
          <div class="shrink-0 px-5 pt-6 sm:px-9 sm:pt-8 pb-2">
            <div class="flex items-center gap-3 mb-6">
              <AppLogo variant="wordmark" size="md" class="drop-shadow-sm" />
            </div>
            <h1 class="text-2xl sm:text-3xl font-bold tracking-tight leading-tight" :style="{ color: 'var(--fg-default)' }">
              {{ pageTitle }}
            </h1>
            <p class="text-sm sm:text-[15px] mt-2 leading-relaxed max-w-xl" :style="{ color: 'var(--fg-muted)' }">
              {{ pageHint }}
            </p>
          </div>

          <div class="flex-1 min-h-0 flex flex-col px-5 sm:px-9 pb-5 sm:pb-7 overflow-hidden">
            <div class="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1">
              <Transition name="onb-fade" mode="out-in">
                <div :key="currentStep" class="pb-2">
                  <StepIntent v-if="currentStep === 0" v-model="intentSlice" />
                  <StepFirmCombined
                    v-else-if="currentStep === 1"
                    :org="{ name: draft.name, description: draft.description }"
                    :firm="{
                      firmType: draft.firmType,
                      firmSize: draft.firmSize,
                      country: draft.country,
                      timezone: draft.timezone,
                      language: draft.language,
                    }"
                    :logo-file="logoFile"
                    @update:org="onOrgUpdate"
                    @update:firm="(v) => Object.assign(draft, v)"
                    @update:logo-file="(f) => (logoFile = f)"
                  />
                  <StepPracticeInterests v-else-if="currentStep === 2" v-model="practiceInterestsSlice" />
                  <StepWorkflow v-else-if="currentStep === 3" v-model="workflowSlice" />
                  <StepTeamClose
                    v-else
                    :invites="draft.invites"
                    :referral-source="draft.referralSource"
                    :show-celebration="false"
                    @update:invites="(v) => (draft.invites = v)"
                    @update:referral-source="(v) => (draft.referralSource = v)"
                  />
                </div>
              </Transition>
            </div>

            <Message v-if="validationMessage" severity="warn" class="w-full text-sm mt-3 shrink-0" :closable="false">
              {{ validationMessage }}
            </Message>

            <div
              class="shrink-0 pt-5 mt-auto border-t space-y-4"
              :style="{ borderColor: 'var(--surface-border)' }"
            >
              <OnboardingStepperRail :steps="steps" :current-step="currentStep" @update:current-step="onRailStep" />

              <div class="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3">
                <Button
                  v-if="currentStep > 0"
                  type="button"
                  :label="$t('onboarding.back')"
                  severity="secondary"
                  text
                  icon="pi pi-arrow-left"
                  @click="goBack"
                />
                <span v-else />

                <div class="flex flex-wrap gap-2 justify-end">
                  <Button
                    v-if="currentStep < lastStepIndex"
                    type="button"
                    :label="$t('onboarding.next')"
                    icon="pi pi-arrow-right"
                    icon-pos="right"
                    :disabled="!canGoNext"
                    @click="goNext"
                  />
                  <Button
                    v-else
                    type="button"
                    :label="$t('onboarding.finish')"
                    icon="pi pi-arrow-right"
                    icon-pos="right"
                    :loading="finishing"
                    :disabled="!canFinish"
                    @click="finish"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: product preview -->
        <div class="hidden lg:flex flex-col min-h-0 min-w-0 overflow-hidden">
          <OnboardingFeaturePreview :step-key="previewKey" :draft="draft" />
        </div>
      </div>
    </div>

    <div
      class="lg:hidden w-full max-w-[1180px] mx-auto mt-4 rounded-2xl border overflow-hidden shadow-md"
      :style="{ borderColor: 'var(--surface-border)' }"
    >
      <OnboardingFeaturePreview :step-key="previewKey" :draft="draft" compact />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import Message from 'primevue/message';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/stores/auth.store';
import AppLogo from '@/components/brand/AppLogo.vue';
import OnboardingStepperRail from './components/OnboardingStepperRail.vue';
import type { OnboardingRailStep } from './components/OnboardingStepperRail.vue';
import OnboardingFeaturePreview from './components/OnboardingFeaturePreview.vue';
import StepIntent from './steps/StepIntent.vue';
import StepFirmCombined from './steps/StepFirmCombined.vue';
import StepPracticeInterests from './steps/StepPracticeInterests.vue';
import StepWorkflow from './steps/StepWorkflow.vue';
import StepTeamClose from './steps/StepTeamClose.vue';
import {
  loadOnboardingDraft,
  saveOnboardingDraft,
  clearOnboardingDraft,
  defaultOnboardingDraft,
  type OnboardingDraft,
  type OnboardingStepPreviewKey,
} from './onboarding.types';

const STEP_PREVIEW_KEYS: OnboardingStepPreviewKey[] = ['intent', 'firm', 'practice', 'workflow', 'team'];

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const authStore = useAuthStore();

const currentStep = ref(0);
const finishing = ref(false);
const validationMessage = ref('');
const logoFile = ref<File | null>(null);

const draft = reactive<OnboardingDraft>(loadOnboardingDraft());

const lastStepIndex = 4;

const steps = computed<OnboardingRailStep[]>(() => [
  { key: 'intent', label: t('onboarding.stepIntentTitle'), hint: t('onboarding.stepIntentHint') },
  { key: 'firm', label: t('onboarding.stepFirmWizardTitle'), hint: t('onboarding.stepFirmWizardHint') },
  { key: 'practice', label: t('onboarding.stepPracticeWizardTitle'), hint: t('onboarding.stepPracticeWizardHint') },
  { key: 'workflow', label: t('onboarding.stepWorkflowTitle'), hint: t('onboarding.stepWorkflowHint') },
  { key: 'team', label: t('onboarding.stepTeamTitle'), hint: t('onboarding.stepTeamHint') },
]);

const pageTitle = computed(() =>
  currentStep.value === 0 ? t('onboarding.intentStepTitle') : steps.value[currentStep.value]?.label ?? '',
);

const pageHint = computed(() =>
  currentStep.value === 0 ? t('onboarding.intentStepHint') : steps.value[currentStep.value]?.hint ?? '',
);

const previewKey = computed<OnboardingStepPreviewKey>(() => STEP_PREVIEW_KEYS[currentStep.value] ?? 'intent');

const intentSlice = computed({
  get: () => ({
    primaryIntent: draft.primaryIntent,
    goals: draft.goals,
    useCases: draft.useCases,
    painPoints: draft.painPoints,
    setupPriority: draft.setupPriority,
  }),
  set: (v) => {
    draft.primaryIntent = v.primaryIntent;
    draft.goals = v.goals;
    draft.useCases = v.useCases;
    draft.painPoints = v.painPoints;
    draft.setupPriority = v.setupPriority;
  },
});

const practiceInterestsSlice = computed({
  get: () => ({
    practiceAreas: draft.practiceAreas,
    practiceAreasOther: draft.practiceAreasOther,
    interestsFreeform: draft.interestsFreeform,
  }),
  set: (v) => {
    draft.practiceAreas = v.practiceAreas;
    draft.practiceAreasOther = v.practiceAreasOther;
    draft.interestsFreeform = v.interestsFreeform;
  },
});

const workflowSlice = computed({
  get: () => ({
    role: draft.role,
    currentTool: draft.currentTool,
    volume: draft.volume,
  }),
  set: (v) => {
    draft.role = v.role;
    draft.currentTool = v.currentTool;
    draft.volume = v.volume;
  },
});

function onOrgUpdate(v: { name: string; description: string }) {
  draft.name = v.name;
  draft.description = v.description;
}

function stepValid(stepIndex: number): boolean {
  switch (stepIndex) {
    case 0:
      return !!draft.primaryIntent && draft.goals.length > 0 && draft.useCases.length > 0;
    case 1:
      return !!(draft.name.trim() && draft.firmType && draft.firmSize && draft.country && draft.timezone && draft.language);
    case 2: {
      if (draft.firmType === 'legal' || draft.firmType === 'mixed') {
        const areasOk = draft.practiceAreas.length > 0 || draft.practiceAreasOther.trim().length > 0;
        return areasOk && draft.interestsFreeform.trim().length >= 8;
      }
      return draft.interestsFreeform.trim().length >= 8;
    }
    case 3:
      return !!draft.volume;
    case 4:
      return true;
    default:
      return false;
  }
}

const canGoNext = computed(() => stepValid(currentStep.value));

const canFinish = computed(() => [0, 1, 2, 3].every((i) => stepValid(i)));

watch(
  draft,
  () => {
    saveOnboardingDraft({ ...draft });
  },
  { deep: true },
);

watch(currentStep, (n) => {
  validationMessage.value = '';
  if (import.meta.env.DEV) {
    console.debug('[onboarding] step_viewed', { step: n, key: steps.value[n]?.key });
  }
});

onMounted(async () => {
  await authStore.ensureOrganizationLoaded();
  const existing = authStore.organization?.name;
  if (existing && !draft.name.trim()) {
    draft.name = existing;
  }
});

function goBack() {
  if (currentStep.value > 0) currentStep.value -= 1;
}

function onRailStep(i: number) {
  if (i < currentStep.value) currentStep.value = i;
}

function goNext() {
  if (!stepValid(currentStep.value)) {
    validationMessage.value = validationHint(currentStep.value);
    return;
  }
  validationMessage.value = '';
  if (currentStep.value < lastStepIndex) currentStep.value += 1;
  if (import.meta.env.DEV) {
    console.debug('[onboarding] step_completed', { step: currentStep.value - 1 });
  }
}

function validationHint(stepIndex: number): string {
  switch (stepIndex) {
    case 0:
      if (!draft.primaryIntent) return t('onboarding.validation.primaryIntent');
      if (!draft.goals.length) return t('onboarding.validation.goals');
      if (!draft.useCases.length) return t('onboarding.validation.useCases');
      return '';
    case 1:
      if (!draft.name.trim()) return t('onboarding.validation.orgName');
      if (!draft.firmType) return t('onboarding.validation.firmType');
      if (!draft.firmSize) return t('onboarding.validation.firmSize');
      if (!draft.country) return t('onboarding.validation.country');
      if (!draft.timezone) return t('onboarding.validation.timezone');
      return '';
    case 2:
      if (draft.firmType === 'legal' || draft.firmType === 'mixed') {
        if (!(draft.practiceAreas.length > 0 || draft.practiceAreasOther.trim().length > 0)) {
          return t('onboarding.validation.practiceAreas');
        }
      }
      if (draft.interestsFreeform.trim().length < 8) return t('onboarding.validation.interests');
      return '';
    case 3:
      if (!draft.volume) return t('onboarding.validation.volume');
      return '';
    default:
      return '';
  }
}

function firstBlockingStep(): number | null {
  for (let i = 0; i <= 3; i++) {
    if (!stepValid(i)) return i;
  }
  return null;
}

async function finish() {
  const block = firstBlockingStep();
  if (block !== null) {
    validationMessage.value = validationHint(block);
    currentStep.value = block;
    return;
  }
  finishing.value = true;
  validationMessage.value = '';
  try {
    if (logoFile.value) {
      const fd = new FormData();
      fd.append('file', logoFile.value);
      await apiClient.post('/organizations/me/logo', fd);
    }

    const invitesPayload = draft.invites
      .filter((i) => i.email.trim())
      .map((i) => ({ email: i.email.trim(), role: i.role }));

    await apiClient.patch('/organizations/me', {
      name: draft.name.trim() || undefined,
      onboardingState: {
        description: draft.description || undefined,
        firmType: draft.firmType,
        firmSize: draft.firmSize,
        country: draft.country,
        practiceAreas: draft.practiceAreas,
        practiceAreasOther: draft.practiceAreasOther || undefined,
        role: draft.role || undefined,
        currentTool: draft.currentTool || undefined,
        goals: draft.goals,
        useCases: draft.useCases,
        volume: draft.volume,
        interestsFreeform: draft.interestsFreeform.trim(),
        referralSource: draft.referralSource || undefined,
        invites: invitesPayload,
        primaryIntent: draft.primaryIntent || undefined,
        painPoints: draft.painPoints.length ? draft.painPoints : undefined,
        setupPriority: draft.setupPriority || undefined,
        completedAt: new Date().toISOString(),
      },
      settings: {
        timezone: draft.timezone,
        language: draft.language,
        country: draft.country,
        onboardingCompleted: true,
      },
    });
    clearOnboardingDraft();
    Object.assign(draft, defaultOnboardingDraft());
    await authStore.fetchMyOrganization();
    if (import.meta.env.DEV) {
      console.debug('[onboarding] finished');
    }
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
    router.push(redirect);
  } finally {
    finishing.value = false;
  }
}
</script>

<style scoped>
.onb-fade-enter-active,
.onb-fade-leave-active {
  transition: opacity 0.2s ease;
}
@media (prefers-reduced-motion: reduce) {
  .onb-fade-enter-active,
  .onb-fade-leave-active {
    transition: none;
  }
}
.onb-fade-enter-from,
.onb-fade-leave-to {
  opacity: 0;
}
</style>
