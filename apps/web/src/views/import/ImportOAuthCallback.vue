<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { apiClient } from '@/api/client';

const route = useRoute();
const router = useRouter();

onMounted(async () => {
  const code = route.query.code as string | undefined;
  const error = route.query.error as string | undefined;
  const kind = sessionStorage.getItem('import_oauth_kind') || 'google';
  const batchId = sessionStorage.getItem('import_oauth_batch') || '';

  if (error) {
    sessionStorage.setItem('import_oauth_error', error);
    if (window.opener) {
      window.opener.postMessage({ type: 'import-oauth', ok: false, error }, window.location.origin);
      window.close();
    } else {
      router.replace({ name: 'import-migration' });
    }
    return;
  }

  if (!code || !batchId) {
    if (window.opener) window.close();
    else router.replace({ name: 'import-migration' });
    return;
  }

  const redirectUri = `${window.location.origin}/import/oauth-callback`;

  try {
    if (kind === 'microsoft') {
      await apiClient.post('/import/oauth/microsoft/exchange', {
        code,
        redirectUri,
        batchId,
      });
    } else {
      await apiClient.post('/import/oauth/google/exchange', {
        code,
        redirectUri,
        batchId,
      });
    }
    sessionStorage.removeItem('import_oauth_batch');
    sessionStorage.removeItem('import_oauth_kind');
    sessionStorage.setItem('import_oauth_ok', '1');
    if (window.opener) {
      window.opener.postMessage({ type: 'import-oauth', ok: true, kind }, window.location.origin);
      window.close();
    } else {
      router.replace({ name: 'import-migration' });
    }
  } catch (e) {
    sessionStorage.setItem('import_oauth_error', 'exchange_failed');
    if (window.opener) {
      window.opener.postMessage({ type: 'import-oauth', ok: false, error: 'exchange' }, window.location.origin);
      window.close();
    } else {
      router.replace({ name: 'import-migration' });
    }
  }
});
</script>

<template>
  <div class="flex min-h-[40vh] items-center justify-center p-6 text-slate-600">
    Conectando cuenta…
  </div>
</template>
