<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-50">
    <div class="w-full max-w-md p-8 bg-white rounded-xl shadow-lg">
      <h1 class="text-2xl font-bold text-center mb-6">{{ $t('auth.register') }}</h1>

      <form @submit.prevent="handleRegister" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Email</label>
          <input v-model="form.email" type="email" class="w-full border rounded px-3 py-2" required />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Password</label>
          <input v-model="form.password" type="password" class="w-full border rounded px-3 py-2" minlength="8" required />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">First name</label>
          <input v-model="form.firstName" type="text" class="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Last name</label>
          <input v-model="form.lastName" type="text" class="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Organization</label>
          <input v-model="form.organizationName" type="text" class="w-full border rounded px-3 py-2" required />
        </div>

        <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700" :disabled="loading">
          {{ loading ? 'Registrando...' : $t('auth.register') }}
        </button>
      </form>

      <p class="mt-4 text-center text-sm text-gray-600">
        ¿Ya tienes cuenta?
        <RouterLink to="/auth/login" class="text-blue-600 hover:underline">
          {{ $t('auth.login') }}
        </RouterLink>
      </p>

      <p v-if="error" class="mt-4 text-center text-sm text-red-600">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';

const authStore = useAuthStore();
const router = useRouter();
const loading = ref(false);
const error = ref('');

const form = reactive({
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  organizationName: '',
});

async function handleRegister() {
  loading.value = true;
  error.value = '';
  try {
    await authStore.register(form);
    router.push('/');
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Error al registrarse';
  } finally {
    loading.value = false;
  }
}
</script>
