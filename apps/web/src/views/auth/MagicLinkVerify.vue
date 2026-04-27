<template>
  <AuthShell narrow showcase-variant="magic" :pitch-mobile="$t('auth.magicLinkShowcaseSubtitle')">
    <template #sideTitle>{{ $t('auth.magicLinkShowcaseTitle') }}</template>
    <template #sideSubtitle>{{ $t('auth.magicLinkShowcaseSubtitle') }}</template>
    <template #title>{{ $t('auth.magicLink') }}</template>
    <template #subtitle>{{ $t('auth.loginSubtitle') }}</template>

    <div class="flex min-h-[8rem] flex-col items-center justify-center gap-4 text-center text-sm text-fg-muted">
      <ProgressSpinner v-if="loading" style="width: 2.5rem; height: 2.5rem" stroke-width="4" />
      <template v-else-if="error">
        <Message severity="error" class="w-full text-left text-sm" :closable="false">{{ error }}</Message>
        <RouterLink :to="{ name: 'login' }" class="font-medium text-accent hover:underline">{{ $t('auth.backToLogin') }}</RouterLink>
      </template>
    </div>
  </AuthShell>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import AuthShell from '@/components/auth/AuthShell.vue';
import Message from 'primevue/message';
import ProgressSpinner from 'primevue/progressspinner';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const loading = ref(true);
const error = ref('');

onMounted(async () => {
  const token = route.query.token as string;
  if (!token) {
    error.value = t('auth.resetInvalidToken');
    loading.value = false;
    return;
  }

  try {
    await authStore.verifyMagicLink(token);
    router.push('/');
  } catch (err: unknown) {
    const ax = err as { response?: { data?: { message?: string } } };
    error.value = ax.response?.data?.message || t('auth.inviteInvalid');
  } finally {
    loading.value = false;
  }
});
</script>
