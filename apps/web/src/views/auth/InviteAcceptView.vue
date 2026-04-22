<template>
  <AuthShell>
    <template #title>{{ $t('auth.inviteTitle') }}</template>
    <template #subtitle>{{ $t('auth.inviteSubtitle') }}</template>

    <div v-if="loadingPreview" class="text-sm text-center" :style="{ color: 'var(--fg-muted)' }">
      {{ $t('auth.inviteLoadingPreview') }}
    </div>

    <div v-else-if="previewError" class="text-sm">
      <Message severity="error" class="w-full" :closable="false">{{ previewError }}</Message>
    </div>

    <form v-else class="flex flex-col gap-5" @submit.prevent="submit">
      <div class="rounded-lg border p-4 text-sm space-y-1" :style="{ borderColor: 'var(--surface-border)' }">
        <p>
          <span class="font-medium" :style="{ color: 'var(--fg-muted)' }">{{ $t('auth.organization') }}:</span>
          {{ preview?.organizationName }}
        </p>
        <p>
          <span class="font-medium" :style="{ color: 'var(--fg-muted)' }">{{ $t('settings.roleLabel') }}:</span>
          {{ preview?.roleName }}
        </p>
        <p>
          <span class="font-medium" :style="{ color: 'var(--fg-muted)' }">{{ $t('auth.email') }}:</span>
          {{ preview?.email }}
        </p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FloatLabel variant="on">
          <InputText id="invite-first" v-model="form.firstName" class="w-full" autocomplete="given-name" />
          <label for="invite-first">{{ $t('auth.firstName') }}</label>
        </FloatLabel>
        <FloatLabel variant="on">
          <InputText id="invite-last" v-model="form.lastName" class="w-full" autocomplete="family-name" />
          <label for="invite-last">{{ $t('auth.lastName') }}</label>
        </FloatLabel>
      </div>

      <div class="flex flex-col gap-2">
        <FloatLabel variant="on">
          <Password
            input-id="invite-password"
            v-model="form.password"
            class="w-full [&_.p-password-input]:w-full"
            input-class="w-full"
            toggle-mask
            :invalid="!!error"
            autocomplete="new-password"
            :minlength="8"
            required
          />
          <label for="invite-password">{{ $t('auth.password') }}</label>
        </FloatLabel>
        <small class="text-xs -mt-1" :style="{ color: 'var(--fg-subtle)' }">{{ $t('auth.passwordMinLength') }}</small>
      </div>

      <Message v-if="error" severity="error" class="w-full text-sm" :closable="false">
        {{ error }}
      </Message>

      <Button type="submit" class="w-full" :label="$t('auth.inviteAccept')" :loading="submitting" />
    </form>

    <template #footer>
      <span>{{ $t('auth.hasAccount') }}</span>
      <RouterLink :to="{ name: 'login' }" class="text-primary font-medium hover:underline ml-1">
        {{ $t('auth.login') }}
      </RouterLink>
    </template>
  </AuthShell>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth.store';
import AuthShell from '@/components/auth/AuthShell.vue';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Message from 'primevue/message';
import FloatLabel from 'primevue/floatlabel';
import { RouterLink } from 'vue-router';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const loadingPreview = ref(true);
const previewError = ref('');
const preview = ref<{
  email: string;
  organizationName: string;
  roleName: string;
  expiresAt: string;
} | null>(null);

const token = ref('');
const submitting = ref(false);
const error = ref('');
const form = reactive({
  firstName: '',
  lastName: '',
  password: '',
});

onMounted(async () => {
  const q = route.query.token;
  token.value = typeof q === 'string' ? q : '';
  if (!token.value) {
    previewError.value = t('auth.inviteInvalid');
    loadingPreview.value = false;
    return;
  }
  try {
    preview.value = await authStore.previewInvitation(token.value);
  } catch (err: unknown) {
    const ax = err as { response?: { data?: { message?: string } } };
    previewError.value = ax.response?.data?.message || t('auth.inviteInvalid');
  } finally {
    loadingPreview.value = false;
  }
});

async function submit() {
  if (!token.value) return;
  submitting.value = true;
  error.value = '';
  try {
    await authStore.acceptInvitation({
      token: token.value,
      password: form.password,
      firstName: form.firstName || undefined,
      lastName: form.lastName || undefined,
    });
    router.push('/');
  } catch (err: unknown) {
    const ax = err as { response?: { data?: { message?: string } } };
    error.value = ax.response?.data?.message || t('auth.registerError');
  } finally {
    submitting.value = false;
  }
}
</script>
