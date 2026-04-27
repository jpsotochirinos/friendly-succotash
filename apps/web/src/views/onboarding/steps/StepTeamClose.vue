<template>
  <div role="form" :aria-labelledby="headingId" class="space-y-8 pt-2">
    <div>
      <h3 :id="headingId" class="text-lg font-semibold text-brand-medianoche dark:text-brand-papel">
        {{ $t('onboarding.stepTeamHeading') }}
      </h3>
      <p class="text-sm mt-1 text-gray-500 dark:text-brand-hielo/80">{{ $t('onboarding.stepTeamSub') }}</p>

      <div v-for="(invite, i) in invites" :key="i" class="flex flex-col sm:flex-row gap-2 sm:items-end mt-4 first:mt-3">
        <FloatLabel variant="on" class="flex-1 w-full">
          <InputText :id="`invite-${i}`" v-model="invite.email" type="email" class="w-full" />
          <label :for="`invite-${i}`">{{ $t('onboarding.inviteEmail') }}</label>
        </FloatLabel>
        <Dropdown
          v-model="invite.role"
          :options="inviteRoleOpts"
          option-label="label"
          option-value="value"
          :placeholder="$t('onboarding.inviteRole')"
          class="w-full sm:w-48"
        />
        <Button
          icon="pi pi-times"
          severity="danger"
          text
          rounded
          class="shrink-0"
          :aria-label="$t('onboarding.removeInvite')"
          @click="removeInvite(i)"
        />
      </div>
      <Button
        class="mt-2"
        :label="$t('onboarding.addMember')"
        icon="pi pi-plus"
        text
        size="small"
        type="button"
        @click="addInvite"
      />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-brand-hielo mb-2" for="onb-referral">{{
        $t('onboarding.referralSource')
      }}</label>
      <Dropdown
        id="onb-referral"
        v-model="referralModel"
        :options="referralOpts"
        option-label="label"
        option-value="value"
        class="w-full"
        :placeholder="$t('onboarding.referralSource')"
      />
    </div>

    <div
      v-if="showCelebration"
      class="text-center px-2 py-6 rounded-xl"
      :style="{ backgroundColor: 'var(--surface-ground)' }"
    >
      <i class="pi pi-check-circle text-5xl text-brand-zafiro mb-3" aria-hidden="true" />
      <h4 class="text-lg font-semibold text-brand-medianoche dark:text-brand-papel">{{ $t('onboarding.doneTitle') }}</h4>
      <p class="text-gray-500 dark:text-brand-hielo/85 mt-2 max-w-md mx-auto text-sm">
        {{ $t('onboarding.doneBody') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import Button from 'primevue/button';
import FloatLabel from 'primevue/floatlabel';
import type { OnboardingInviteRow } from '../onboarding.types';
import { REFERRAL_KEYS } from '../onboarding.types';

const props = withDefaults(
  defineProps<{
    invites: OnboardingInviteRow[];
    referralSource: string;
    /** When false, hides the “all set” celebration block (e.g. split onboarding shell). */
    showCelebration?: boolean;
  }>(),
  { showCelebration: true },
);

const emit = defineEmits<{
  'update:invites': [value: OnboardingInviteRow[]];
  'update:referralSource': [value: string];
}>();

const { t } = useI18n();
const headingId = 'onboarding-step-team-heading';

const invites = computed({
  get: () => props.invites,
  set: (v) => emit('update:invites', v),
});

const referralModel = computed({
  get: () => props.referralSource,
  set: (v) => emit('update:referralSource', v ?? ''),
});

const referralOpts = computed(() =>
  REFERRAL_KEYS.map((value) => ({ value, label: t(`onboarding.referralOptions.${value}`) })),
);

const INVITE_ROLE_KEYS = ['senior', 'junior', 'assistant', 'administrative'] as const;

const inviteRoleOpts = computed(() =>
  INVITE_ROLE_KEYS.map((value) => ({
    value,
    label: t(`onboarding.inviteRoles.${value}`),
  })),
);

function addInvite() {
  emit('update:invites', [...props.invites, { email: '', role: '' }]);
}

function removeInvite(i: number) {
  const next = [...props.invites];
  next.splice(i, 1);
  emit('update:invites', next.length ? next : [{ email: '', role: '' }]);
}
</script>
