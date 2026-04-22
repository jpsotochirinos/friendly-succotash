<template>
  <AuthShell>
    <template #title>{{ $t('auth.login') }}</template>
    <template #subtitle>{{ $t('auth.loginSubtitle') }}</template>

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

      <div v-if="!isMagicLink" class="flex flex-col gap-2">
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

      <Message v-if="message" :severity="messageSeverity" class="w-full text-sm" :closable="false">
        {{ message }}
      </Message>

      <Button
        type="submit"
        class="w-full"
        :label="isMagicLink ? $t('auth.sendMagicLink') : $t('auth.login')"
        :loading="loading"
      />

      <div class="flex justify-center -mt-1">
        <Button
          type="button"
          :label="isMagicLink ? $t('auth.usePassword') : $t('auth.sendMagicLink')"
          class="text-sm"
          link
          @click="toggleMagicLink"
        />
      </div>

      <Divider align="center" class="!my-1">
        <span
          class="text-xs font-medium uppercase tracking-wide px-2"
          :style="{
            color: 'var(--fg-subtle)',
            backgroundColor: 'var(--surface-raised)',
          }"
        >
          {{ $t('auth.or') }}
        </span>
      </Divider>

      <Button
        type="button"
        class="w-full"
        :label="$t('auth.continueWithGoogle')"
        icon="pi pi-google"
        severity="secondary"
        outlined
        @click="authStore.loginWithGoogle()"
      />
    </form>

    <template #footer>
      <span>{{ $t('auth.noAccount') }}</span>
      <RouterLink :to="{ name: 'register' }" class="text-primary font-medium hover:underline ml-1">
        {{ $t('auth.register') }}
      </RouterLink>
    </template>
  </AuthShell>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
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

const { t } = useI18n();
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref('');
const password = ref('');
const isMagicLink = ref(false);
const loading = ref(false);
const message = ref('');
const messageSeverity = ref<'success' | 'error'>('success');

const showError = computed(() => messageSeverity.value === 'error' && !!message.value);

function toggleMagicLink() {
  isMagicLink.value = !isMagicLink.value;
  message.value = '';
}

async function handleLogin() {
  loading.value = true;
  message.value = '';
  try {
    if (isMagicLink.value) {
      await authStore.requestMagicLink(email.value);
      message.value = t('auth.magicLinkSent');
      messageSeverity.value = 'success';
    } else {
      await authStore.login(email.value, password.value);
      const redirect = (route.query.redirect as string) || '/';
      router.push(redirect);
    }
  } catch (err: unknown) {
    const ax = err as { response?: { data?: { message?: string } } };
    message.value = ax.response?.data?.message || t('auth.loginError');
    messageSeverity.value = 'error';
  } finally {
    loading.value = false;
  }
}
</script>
