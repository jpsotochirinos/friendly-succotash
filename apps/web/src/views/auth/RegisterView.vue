<template>
  <AuthShell showcase-variant="register" :pitch-mobile="$t('auth.registerShowcaseSubtitle')">
    <template #sideTitle>{{ $t('auth.registerShowcaseTitle') }}</template>
    <template #sideSubtitle>{{ $t('auth.registerShowcaseSubtitle') }}</template>
    <template #title>
      {{ step === 0 ? $t('auth.registerStep1Title') : $t('auth.registerStep2Title') }}
    </template>
    <template #subtitle>{{ $t('auth.registerSubtitle') }}</template>

    <div class="mb-6">
      <div class="flex gap-2 mb-2">
        <div
          v-for="i in 2"
          :key="i"
          class="h-1.5 flex-1 rounded-full transition-colors"
          :style="{
            backgroundColor: i - 1 <= step ? 'var(--p-primary-color)' : 'var(--surface-border)',
          }"
        />
      </div>
      <p class="text-xs text-center text-fg-muted">{{ $t('auth.stepOf', { current: step + 1, total: 2 }) }}</p>
    </div>

    <form class="flex flex-col gap-5" @submit.prevent="onSubmitStep">
      <Transition name="register-slide" mode="out-in">
        <div v-if="step === 0" key="s0" class="flex flex-col gap-5">
          <div class="flex flex-col gap-2">
            <FloatLabel variant="on">
              <InputText
                id="register-email"
                v-model="form.email"
                type="email"
                class="w-full"
                autocomplete="email"
                inputmode="email"
                autocapitalize="off"
                spellcheck="false"
                :invalid="!!emailFieldError || (!!error && step === 0)"
                required
                @update:model-value="emailFieldError = ''"
              />
              <label for="register-email">{{ $t('auth.email') }}</label>
            </FloatLabel>
            <small v-if="emailFieldError" class="text-xs text-red-500">{{ emailFieldError }}</small>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FloatLabel variant="on">
              <InputText id="register-first" v-model="form.firstName" class="w-full" autocomplete="given-name" />
              <label for="register-first">{{ $t('auth.firstName') }}</label>
            </FloatLabel>
            <FloatLabel variant="on">
              <InputText id="register-last" v-model="form.lastName" class="w-full" autocomplete="family-name" />
              <label for="register-last">{{ $t('auth.lastName') }}</label>
            </FloatLabel>
          </div>
        </div>

        <div v-else key="s1" class="flex flex-col gap-5">
          <div class="flex flex-col gap-2">
            <FloatLabel variant="on">
              <Password
                input-id="register-password"
                v-model="form.password"
                class="w-full [&_.p-password-input]:w-full"
                input-class="w-full"
                toggle-mask
                :invalid="!!error || passwordMismatch"
                autocomplete="new-password"
                :minlength="8"
                required
              />
              <label for="register-password">{{ $t('auth.password') }}</label>
            </FloatLabel>
            <small class="text-xs -mt-1" :style="{ color: 'var(--fg-subtle)' }">{{ $t('auth.passwordMinLength') }}</small>
          </div>
          <div class="flex flex-col gap-2">
            <FloatLabel variant="on">
              <Password
                input-id="register-password-confirm"
                v-model="form.confirmPassword"
                class="w-full [&_.p-password-input]:w-full"
                input-class="w-full"
                toggle-mask
                :invalid="!!error || passwordMismatch"
                autocomplete="new-password"
                :minlength="8"
                required
              />
              <label for="register-password-confirm">{{ $t('auth.confirmPassword') }}</label>
            </FloatLabel>
            <small v-if="passwordMismatch" class="text-xs text-red-500">{{ $t('auth.passwordMismatch') }}</small>
          </div>
        </div>
      </Transition>

      <Message v-if="error" severity="error" class="w-full text-sm" :closable="false">
        {{ error }}
      </Message>

      <div class="flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
        <Button
          v-if="step > 0"
          type="button"
          :label="$t('auth.back')"
          severity="secondary"
          text
          icon="pi pi-arrow-left"
          @click="step -= 1; error = ''; emailFieldError = ''"
        />
        <span v-else class="hidden sm:block" />

        <Button
          type="submit"
          class="w-full sm:w-auto sm:min-w-[12rem] sm:ml-auto"
          :label="step === 0 ? $t('auth.continue') : $t('auth.register')"
          :loading="submitBusy"
          :disabled="step === 1 && passwordMismatch"
        />
      </div>
    </form>

    <template #footer>
      <span>{{ $t('auth.hasAccount') }}</span>
      <RouterLink :to="{ name: 'login' }" class="ml-1 font-medium text-accent hover:underline">
        {{ $t('auth.login') }}
      </RouterLink>
    </template>
  </AuthShell>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/api/client';
import AuthShell from '@/components/auth/AuthShell.vue';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Message from 'primevue/message';
import FloatLabel from 'primevue/floatlabel';

const { t } = useI18n();
const authStore = useAuthStore();
const router = useRouter();
const loading = ref(false);
const checkingEmail = ref(false);
const error = ref('');
const emailFieldError = ref('');
const step = ref(0);

/** Pragmatic RFC-style check: local@domain with TLD ≥ 2 chars */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

function isValidEmail(value: string): boolean {
  const s = value.trim();
  if (!s) return false;
  return EMAIL_RE.test(s);
}

const form = reactive({
  email: '',
  password: '',
  confirmPassword: '',
  firstName: '',
  lastName: '',
});

const passwordMismatch = computed(
  () => step.value === 1 && form.confirmPassword.length > 0 && form.password !== form.confirmPassword,
);

const submitBusy = computed(() => loading.value || checkingEmail.value);

function placeholderOrganizationName(): string {
  const base = form.firstName.trim() || form.email.split('@')[0] || 'Mi';
  return `${base} · despacho`;
}

async function onSubmitStep() {
  error.value = '';
  emailFieldError.value = '';
  if (step.value === 0) {
    const e = form.email.trim();
    if (!e) {
      emailFieldError.value = t('auth.emailRequired');
      return;
    }
    if (!isValidEmail(e)) {
      emailFieldError.value = t('auth.emailInvalid');
      return;
    }
    checkingEmail.value = true;
    try {
      const { data } = await apiClient.get<{ available: boolean }>('/auth/availability', {
        params: { email: e },
      });
      if (!data.available) {
        emailFieldError.value = t('auth.emailAlreadyRegistered');
        return;
      }
      step.value = 1;
    } catch {
      emailFieldError.value = t('auth.availabilityCheckError');
    } finally {
      checkingEmail.value = false;
    }
    return;
  }
  if (!isValidEmail(form.email)) {
    error.value = t('auth.emailInvalid');
    step.value = 0;
    return;
  }
  if (form.password !== form.confirmPassword) {
    error.value = t('auth.passwordMismatch');
    return;
  }
  if (form.password.length < 8) return;

  loading.value = true;
  try {
    await authStore.register({
      email: form.email.trim(),
      password: form.password,
      firstName: form.firstName.trim() || undefined,
      lastName: form.lastName.trim() || undefined,
      organizationName: placeholderOrganizationName(),
    });
    await router.push({ name: 'onboarding' });
  } catch (err: unknown) {
    const ax = err as { response?: { status?: number; data?: { message?: string | string[] } } };
    const status = ax.response?.status;
    const rawMsg = ax.response?.data?.message;
    const msg = Array.isArray(rawMsg) ? rawMsg[0] : rawMsg;
    if (status === 409) {
      error.value = '';
      emailFieldError.value = t('auth.emailAlreadyRegistered');
      step.value = 0;
      return;
    }
    error.value = msg || t('auth.registerError');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.register-slide-enter-active,
.register-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.register-slide-enter-from {
  opacity: 0;
  transform: translateX(12px);
}
.register-slide-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}
</style>
