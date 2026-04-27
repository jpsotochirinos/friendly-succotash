<template>
  <div class="flex items-center justify-center min-h-screen">
    <p>{{ $t('app.loading') }}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

onMounted(() => {
  if (route.query.error) {
    void router.replace({
      name: 'login',
      query: { error: String(route.query.error) },
    });
    return;
  }
  const token = route.query.token as string;
  if (token) {
    localStorage.setItem('accessToken', token);
    authStore.accessToken = token;
    authStore.fetchMe().then(() => {
      router.push('/');
    });
  } else {
    void router.push('/auth/login');
  }
});
</script>
