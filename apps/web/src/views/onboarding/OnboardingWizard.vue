<template>
  <div class="min-h-screen brand-gradient-soft flex flex-col items-center px-4 py-10 sm:py-12">
    <div class="w-full max-w-3xl mb-8 text-center">
      <div class="flex justify-center mb-5">
        <AppLogo variant="wordmark" size="lg" class="drop-shadow-sm" />
      </div>
      <h1 class="text-2xl font-semibold tracking-tight" :style="{ color: 'var(--fg-default)' }">
        {{ $t('onboarding.title') }}
      </h1>
      <p class="text-sm mt-2 max-w-xl mx-auto leading-relaxed" :style="{ color: 'var(--fg-muted)' }">
        {{ $t('onboarding.subtitle') }}
      </p>
      <p class="text-xs mt-2 text-fg-muted">{{ $t('onboarding.stepOf', { current: currentStep + 1, total: steps.length }) }}</p>
    </div>

    <Card
      class="w-full max-w-3xl rounded-2xl border backdrop-blur-sm"
      :pt="{
        root: {
          style: {
            backgroundColor: 'var(--surface-raised)',
            borderColor: 'var(--surface-border)',
            boxShadow: 'var(--shadow-lg)',
          },
        },
      }"
    >
      <template #content>
        <div class="px-4 pt-6 sm:px-8 sm:pt-8">
          <div class="flex flex-col gap-4 mb-8">
            <div
              v-for="(step, index) in steps"
              :key="step.key"
              class="flex min-w-0 items-center gap-3 sm:flex-row sm:items-start"
            >
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors"
                :class="
                  index === currentStep
                    ? 'bg-brand-zafiro text-white shadow'
                    : index < currentStep
                      ? 'bg-brand-hielo/50 text-brand-real dark:text-brand-hielo'
                      : 'bg-gray-100 dark:bg-brand-real/30 text-gray-500 dark:text-brand-hielo/70'
                "
              >
                <i v-if="index < currentStep" class="pi pi-check text-sm" aria-hidden="true" />
                <span v-else>{{ index + 1 }}</span>
              </div>
              <div class="min-w-0 text-left flex-1">
                <p class="text-sm font-medium text-brand-medianoche dark:text-brand-papel leading-tight">
                  {{ step.label }}
                </p>
                <p class="text-xs text-gray-500 dark:text-brand-hielo/75 truncate">{{ step.hint }}</p>
              </div>
              <div
                v-if="index < steps.length - 1"
                class="hidden sm:block w-px self-stretch min-h-[2.5rem] bg-brand-hielo/40 dark:bg-brand-real/40 mx-1"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>

        <div class="px-4 pb-6 sm:px-8 sm:pb-8 border-t" :style="{ borderColor: 'var(--surface-border)' }">
          <Transition name="onb-fade" mode="out-in">
            <div :key="currentStep" class="min-h-[12rem]">
              <StepOrganization
                v-if="currentStep === 0"
                :model-value="{ name: draft.name, description: draft.description }"
                @update:model-value="onOrgUpdate"
                :logo-file="logoFile"
                @update:logo-file="(f) => (logoFile = f)"
              />
              <StepFirmProfile
                v-else-if="currentStep === 1"
                :model-value="{
                  firmType: draft.firmType,
                  firmSize: draft.firmSize,
                  country: draft.country,
                  timezone: draft.timezone,
                  language: draft.language,
                }"
                @update:model-value="(v) => Object.assign(draft, v)"
              />
              <StepPracticeAreas
                v-else-if="currentStep === 2"
                :model-value="{ practiceAreas: draft.practiceAreas, practiceAreasOther: draft.practiceAreasOther }"
                @update:model-value="(v) => Object.assign(draft, v)"
              />
              <StepRole
                v-else-if="currentStep === 3"
                :model-value="{ role: draft.role, currentTool: draft.currentTool }"
                @update:model-value="(v) => Object.assign(draft, v)"
              />
              <StepGoals
                v-else-if="currentStep === 4"
                :model-value="{
                  goals: draft.goals,
                  useCases: draft.useCases,
                  volume: draft.volume,
                  interestsFreeform: draft.interestsFreeform,
                }"
                @update:model-value="(v) => Object.assign(draft, v)"
              />
              <StepTeamClose
                v-else-if="currentStep === 5"
                :invites="draft.invites"
                :referral-source="draft.referralSource"
                @update:invites="(v) => (draft.invites = v)"
                @update:referral-source="(v) => (draft.referralSource = v)"
              />
            </div>
          </Transition>

          <Message v-if="validationMessage" severity="warn" class="w-full text-sm mt-4" :closable="false">
            {{ validationMessage }}
          </Message>

          <div
            class="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3 mt-8 pt-6 border-t"
            :style="{ borderColor: 'var(--surface-border)' }"
          >
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
                v-if="showSkip"
                type="button"
                :label="$t('onboarding.skip')"
                severity="secondary"
                text
                @click="skipOptionalStep"
              />
              <Button
                v-if="currentStep < 5"
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
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Message from 'primevue/message';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/stores/auth.store';
import AppLogo from '@/components/brand/AppLogo.vue';
import StepOrganization from './steps/StepOrganization.vue';
import StepFirmProfile from './steps/StepFirmProfile.vue';
import StepPracticeAreas from './steps/StepPracticeAreas.vue';
import StepRole from './steps/StepRole.vue';
import StepGoals from './steps/StepGoals.vue';
import StepTeamClose from './steps/StepTeamClose.vue';
import {
  loadOnboardingDraft,
  saveOnboardingDraft,
  clearOnboardingDraft,
  defaultOnboardingDraft,
  type OnboardingDraft,
} from './onboarding.types';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const authStore = useAuthStore();

const currentStep = ref(0);
const finishing = ref(false);
const validationMessage = ref('');
const logoFile = ref<File | null>(null);

const draft = reactive<OnboardingDraft>(loadOnboardingDraft());

const steps = computed(() => [
  { key: 'org', label: t('onboarding.stepOrgTitle'), hint: t('onboarding.stepOrgHint') },
  { key: 'firm', label: t('onboarding.stepFirmTitle'), hint: t('onboarding.stepFirmHint') },
  { key: 'practice', label: t('onboarding.stepPracticeTitle'), hint: t('onboarding.stepPracticeHint') },
  { key: 'role', label: t('onboarding.stepRoleTitle'), hint: t('onboarding.stepRoleHint') },
  { key: 'goals', label: t('onboarding.stepGoalsTitle'), hint: t('onboarding.stepGoalsHint') },
  { key: 'team', label: t('onboarding.stepTeamTitle'), hint: t('onboarding.stepTeamHint') },
]);

function onOrgUpdate(v: { name: string; description: string }) {
  draft.name = v.name;
  draft.description = v.description;
}

function stepValid(stepIndex: number): boolean {
  switch (stepIndex) {
    case 0:
      return draft.name.trim().length > 0;
    case 1:
      return !!(draft.firmType && draft.firmSize && draft.country && draft.timezone && draft.language);
    case 2: {
      if (draft.firmType === 'legal' || draft.firmType === 'mixed') {
        return draft.practiceAreas.length > 0 || draft.practiceAreasOther.trim().length > 0;
      }
      return true;
    }
    case 3:
      return true;
    case 4:
      return (
        draft.goals.length > 0 &&
        draft.useCases.length > 0 &&
        !!draft.volume &&
        draft.interestsFreeform.trim().length >= 8
      );
    case 5:
      return true;
    default:
      return false;
  }
}

const canGoNext = computed(() => stepValid(currentStep.value));

const canFinish = computed(() => stepValid(4));

const showSkip = computed(() => currentStep.value === 3);

watch(
  () => draft,
  (d) => {
    saveOnboardingDraft({ ...d });
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

function goNext() {
  if (!stepValid(currentStep.value)) {
    validationMessage.value = validationHint(currentStep.value);
    return;
  }
  validationMessage.value = '';
  if (currentStep.value < 5) currentStep.value += 1;
  if (import.meta.env.DEV) {
    console.debug('[onboarding] step_completed', { step: currentStep.value - 1 });
  }
}

function skipOptionalStep() {
  if (currentStep.value === 3) {
    currentStep.value = 4;
  }
}

function validationHint(stepIndex: number): string {
  switch (stepIndex) {
    case 0:
      return t('onboarding.validation.orgName');
    case 1:
      if (!draft.firmType) return t('onboarding.validation.firmType');
      if (!draft.firmSize) return t('onboarding.validation.firmSize');
      if (!draft.country) return t('onboarding.validation.country');
      if (!draft.timezone) return t('onboarding.validation.timezone');
      return '';
    case 2:
      return t('onboarding.validation.practiceAreas');
    case 4:
      if (!draft.goals.length) return t('onboarding.validation.goals');
      if (!draft.useCases.length) return t('onboarding.validation.useCases');
      if (!draft.volume) return t('onboarding.validation.volume');
      if (draft.interestsFreeform.trim().length < 8) return t('onboarding.validation.interests');
      return '';
    default:
      return '';
  }
}

async function finish() {
  if (!stepValid(4)) {
    validationMessage.value = validationHint(4);
    currentStep.value = 4;
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
.onb-fade-enter-from,
.onb-fade-leave-to {
  opacity: 0;
}
</style>
