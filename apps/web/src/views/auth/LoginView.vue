<template>
  <AuthShell>
    <template #title>{{ $t('auth.welcomeBack') }}</template>
    <template #subtitle>{{ $t('auth.loginLead') }}</template>

    <form class="flex flex-col gap-5" @submit.prevent="handleLogin">
      <div class="flex flex-col gap-2">
        <FloatLabel variant="on">
          <InputText
            id="login-email"
            v-model="email"
            type="email"
            class="w-full"
            autocomplete="email"
            :invalid="showError"
          />
          <label for="login-email">{{ $t('auth.email') }}</label>
        </FloatLabel>
      </div>

      <div class="flex flex-col gap-2">
        <FloatLabel variant="on">
          <Password
            input-id="login-password"
            v-model="password"
            class="w-full [&_.p-password-input]:w-full"
            input-class="w-full"
            :feedback="false"
            toggle-mask
            :invalid="showError"
            autocomplete="current-password"
          />
          <label for="login-password">{{ $t('auth.password') }}</label>
        </FloatLabel>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <Checkbox v-model="rememberMe" input-id="login-remember" binary />
          <label for="login-remember" class="cursor-pointer text-sm text-fg-muted">{{ $t('auth.rememberMe') }}</label>
        </div>
        <RouterLink
          :to="{ name: 'forgot-password' }"
          class="text-sm font-medium text-accent transition-colors hover:text-accent-hover focus-visible:outline-none"
        >
          {{ $t('auth.forgotPassword') }}
        </RouterLink>
      </div>

      <Message v-if="message" :severity="messageSeverity" class="w-full text-sm" :closable="false">
        {{ message }}
      </Message>

      <Button
        type="submit"
        class="alega-btn-cta-brand w-full border-0"
        :label="$t('auth.login')"
        :loading="loading"
      />

      <Divider align="center" class="!my-1">
        <span
          class="px-2 text-xs font-medium uppercase tracking-wide"
          :style="{
            color: 'var(--fg-subtle)',
            backgroundColor: 'var(--surface-raised)',
          }"
        >
          {{ $t('auth.orLoginWith') }}
        </span>
      </Divider>

      <Button
        type="button"
        class="w-full"
        :label="$t('auth.continueWithGoogle')"
        severity="secondary"
        outlined
        @click="authStore.loginWithGoogle()"
      />

      <div class="flex justify-center -mt-1">
        <Button
          type="button"
          :label="$t('auth.sendMagicLink')"
          class="text-sm"
          link
          :loading="magicLoading"
          :disabled="loading"
          @click="sendMagicLink"
        />
      </div>
    </form>

    <template #footer>
      <span>{{ $t('auth.noAccount') }}</span>
      <RouterLink :to="{ name: 'register' }" class="ml-1 font-medium text-accent hover:underline">
        {{ $t('auth.loginRegisterCta') }}
      </RouterLink>
    </template>
  </AuthShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth.store';
import AuthShell from '@/components/auth/AuthShell.vue';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Message from 'primevue/message';
import FloatLabel from 'primevue/floatlabel';
import Divider from 'primevue/divider';
import Checkbox from 'primevue/checkbox';
import { RouterLink } from 'vue-router';

const REMEMBER_KEY = 'alega_auth_remember';
const SAVED_EMAIL_KEY = 'alega_auth_saved_email';

const { t } = useI18n();
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref('');
const password = ref('');
const rememberMe = ref(localStorage.getItem(REMEMBER_KEY) === '1');
const loading = ref(false);
const magicLoading = ref(false);
const message = ref('');
const messageSeverity = ref<'success' | 'error'>('success');

const showError = computed(() => messageSeverity.value === 'error' && !!message.value);

onMounted(() => {
  if (rememberMe.value) {
    const saved = localStorage.getItem(SAVED_EMAIL_KEY);
    if (saved) email.value = saved;
  }
  if (route.query.error === 'google') {
    message.value = t('auth.googleSignInError');
    messageSeverity.value = 'error';
  }
});

watch(rememberMe, (v) => {
  if (!v) {
    localStorage.removeItem(REMEMBER_KEY);
    localStorage.removeItem(SAVED_EMAIL_KEY);
  } else {
    localStorage.setItem(REMEMBER_KEY, '1');
  }
});

async function sendMagicLink() {
  magicLoading.value = true;
  message.value = '';
  try {
    await authStore.requestMagicLink(email.value);
    message.value = t('auth.magicLinkSent');
    messageSeverity.value = 'success';
  } catch {
    message.value = t('auth.loginError');
    messageSeverity.value = 'error';
  } finally {
    magicLoading.value = false;
  }
}

async function handleLogin() {
  loading.value = true;
  message.value = '';
  try {
    await authStore.login(email.value, password.value);
    if (rememberMe.value) {
      localStorage.setItem(REMEMBER_KEY, '1');
      localStorage.setItem(SAVED_EMAIL_KEY, email.value.trim());
    } else {
      localStorage.removeItem(REMEMBER_KEY);
      localStorage.removeItem(SAVED_EMAIL_KEY);
    }
    const redirect = (route.query.redirect as string) || '/';
    router.push(redirect);
  } catch (err: unknown) {
    const ax = err as { response?: { data?: { message?: string } } };
    message.value = ax.response?.data?.message || t('auth.loginError');
    messageSeverity.value = 'error';
  } finally {
    loading.value = false;
  }
}
</script>
