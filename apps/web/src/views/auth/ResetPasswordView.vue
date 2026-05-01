<template>
  <AuthShell :show-showcase="false">
    <template #title>{{ $t('auth.resetTitle') }}</template>
    <template #subtitle>{{ $t('auth.resetSubtitle') }}</template>

    <div v-if="!token" class="flex flex-col gap-4 text-sm text-fg-muted">
      <p>{{ $t('auth.resetInvalidToken') }}</p>
      <RouterLink :to="{ name: 'login' }" class="font-medium text-accent hover:underline">{{ $t('auth.backToLogin') }}</RouterLink>
    </div>

    <form v-else class="flex flex-col gap-5" @submit.prevent="onSubmit">
      <div class="flex flex-col gap-2">
        <FloatLabel variant="on">
          <Password
            input-id="reset-password"
            v-model="password"
            class="w-full [&_.p-password-input]:w-full"
            input-class="w-full"
            toggle-mask
            :feedback="false"
            :invalid="!!fieldError"
            autocomplete="new-password"
            :minlength="8"
          />
          <label for="reset-password">{{ $t('auth.password') }}</label>
        </FloatLabel>
        <small class="text-xs" :style="{ color: 'var(--fg-subtle)' }">{{ $t('auth.passwordMinLength') }}</small>
      </div>

      <div class="flex flex-col gap-2">
        <FloatLabel variant="on">
          <Password
            input-id="reset-password-confirm"
            v-model="confirmPassword"
            class="w-full [&_.p-password-input]:w-full"
            input-class="w-full"
            toggle-mask
            :feedback="false"
            :invalid="!!fieldError"
            autocomplete="new-password"
            :minlength="8"
          />
          <label for="reset-password-confirm">{{ $t('auth.confirmPassword') }}</label>
        </FloatLabel>
      </div>

      <Message v-if="fieldError" severity="error" class="w-full text-sm" :closable="false">{{ fieldError }}</Message>
      <Message v-else-if="error" severity="error" class="w-full text-sm" :closable="false">{{ error }}</Message>

      <Button
        type="submit"
        class="alega-btn-cta-brand w-full border-0"
        :label="$t('auth.resetSubmit')"
        :loading="loading"
        :disabled="password.length < 8 || password !== confirmPassword"
      />

      <div class="text-center text-sm text-fg-muted">
        <RouterLink :to="{ name: 'login' }" class="font-medium text-accent hover:underline">{{ $t('auth.backToLogin') }}</RouterLink>
      </div>
    </form>
  </AuthShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import AuthShell from '@/components/auth/AuthShell.vue';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Message from 'primevue/message';
import FloatLabel from 'primevue/floatlabel';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const token = ref('');
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref('');

const fieldError = computed(() => {
  if (password.value.length > 0 && password.value.length < 8) return t('auth.passwordTooShort');
  if (confirmPassword.value.length > 0 && password.value !== confirmPassword.value) return t('auth.passwordsDoNotMatch');
  return '';
});

onMounted(() => {
  const q = route.query.token;
  token.value = typeof q === 'string' ? q : '';
});

async function onSubmit() {
  if (!token.value || fieldError.value) return;
  loading.value = true;
  error.value = '';
  try {
    await authStore.resetPassword(token.value, password.value);
    router.push('/');
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { message?: string } } };
    error.value = ax.response?.data?.message || t('auth.loginError');
  } finally {
    loading.value = false;
  }
}
</script>
