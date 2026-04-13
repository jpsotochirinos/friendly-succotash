<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-50">
    <div class="w-full max-w-md p-8 bg-white rounded-xl shadow-lg">
      <h1 class="text-2xl font-bold text-center mb-6">{{ $t('auth.login') }}</h1>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Email</label>
          <InputText v-model="email" type="email" class="w-full" required />
        </div>

        <div v-if="!isMagicLink">
          <label class="block text-sm font-medium mb-1">Password</label>
          <Password v-model="password" class="w-full" :feedback="false" toggleMask />
        </div>

        <Button
          :label="isMagicLink ? 'Enviar enlace mágico' : $t('auth.login')"
          type="submit"
          class="w-full"
          :loading="loading"
        />
      </form>

      <div class="mt-4 text-center">
        <button
          @click="isMagicLink = !isMagicLink"
          class="text-sm text-blue-600 hover:underline"
        >
          {{ isMagicLink ? 'Usar contraseña' : 'Enviar enlace mágico' }}
        </button>
      </div>

      <div class="mt-4">
        <Button
          label="Continuar con Google"
          icon="pi pi-google"
          severity="secondary"
          class="w-full"
          @click="authStore.loginWithGoogle()"
        />
      </div>

      <p class="mt-4 text-center text-sm text-gray-600">
        ¿No tienes cuenta?
        <RouterLink to="/auth/register" class="text-blue-600 hover:underline">
          {{ $t('auth.register') }}
        </RouterLink>
      </p>

      <Message v-if="message" :severity="messageSeverity" class="mt-4">
        {{ message }}
      </Message>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Message from 'primevue/message';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref('');
const password = ref('');
const isMagicLink = ref(false);
const loading = ref(false);
const message = ref('');
const messageSeverity = ref<'success' | 'error'>('success');

async function handleLogin() {
  loading.value = true;
  message.value = '';
  try {
    if (isMagicLink.value) {
      await authStore.requestMagicLink(email.value);
      message.value = 'Enlace enviado. Revisa tu email.';
      messageSeverity.value = 'success';
    } else {
      await authStore.login(email.value, password.value);
      const redirect = (route.query.redirect as string) || '/';
      router.push(redirect);
    }
  } catch (err: any) {
    message.value = err.response?.data?.message || 'Error al iniciar sesión';
    messageSeverity.value = 'error';
  } finally {
    loading.value = false;
  }
}
</script>
