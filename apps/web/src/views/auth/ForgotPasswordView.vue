<template>
  <AuthShell :show-showcase="false">
    <template #title>{{ $t('auth.forgotTitle') }}</template>
    <template #subtitle>{{ $t('auth.forgotSubtitle') }}</template>

    <form class="flex flex-col gap-5" @submit.prevent="onSubmit">
      <div class="flex flex-col gap-2">
        <FloatLabel variant="on">
          <InputText
            id="forgot-email"
            v-model="email"
            type="email"
            class="w-full"
            autocomplete="email"
            required
            :invalid="!!error"
          />
          <label for="forgot-email">{{ $t('auth.email') }}</label>
        </FloatLabel>
      </div>

      <Message v-if="success" severity="success" class="w-full text-sm" :closable="false">
        {{ $t('auth.forgotSuccess') }}
      </Message>
      <Message v-else-if="error" severity="error" class="w-full text-sm" :closable="false">{{ error }}</Message>

      <div
        v-if="devResetUrl"
        class="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-fg-default"
        role="status"
      >
        <p class="m-0 font-semibold">{{ $t('auth.forgotDevHint') }}</p>
        <a
          :href="devResetUrl"
          class="mt-1 block break-all text-sm tabular-nums text-accent underline outline-none focus-visible:ring-2"
          >{{ devResetUrl }}</a
        >
      </div>

      <Button type="submit" class="alega-btn-cta-brand w-full border-0" :label="$t('auth.forgotSubmit')" :loading="loading" />

      <div class="text-center text-sm text-fg-muted">
        <RouterLink :to="{ name: 'login' }" class="font-medium text-accent hover:underline">{{ $t('auth.backToLogin') }}</RouterLink>
      </div>
    </form>
  </AuthShell>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import AuthShell from '@/components/auth/AuthShell.vue';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Message from 'primevue/message';
import FloatLabel from 'primevue/floatlabel';

const { t } = useI18n();
const authStore = useAuthStore();

const email = ref('');
const loading = ref(false);
const error = ref('');
const success = ref(false);
const devResetUrl = ref<string | null>(null);

async function onSubmit() {
  loading.value = true;
  error.value = '';
  success.value = false;
  devResetUrl.value = null;
  try {
    const url = await authStore.requestPasswordReset(email.value.trim());
    success.value = true;
    if (url) devResetUrl.value = url;
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { message?: string } } };
    error.value = ax.response?.data?.message || t('auth.loginError');
  } finally {
    loading.value = false;
  }
}
</script>
