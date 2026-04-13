<template>
  <div class="flex items-center justify-center min-h-screen">
    <div v-if="loading">{{ $t('app.loading') }}</div>
    <div v-else-if="error" class="text-red-600">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const loading = ref(true);
const error = ref('');

onMounted(async () => {
  const token = route.query.token as string;
  if (!token) {
    error.value = 'Token no proporcionado';
    loading.value = false;
    return;
  }

  try {
    await authStore.verifyMagicLink(token);
    router.push('/');
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Enlace inválido o expirado';
  } finally {
    loading.value = false;
  }
});
</script>
