<template>
  <AuthShell>
    <template #title>{{ t('signatures.verifyTitle') }}</template>
    <div v-if="loading" class="text-sm">…</div>
    <div v-else-if="result && !result.found" class="text-red-600">{{ t('signatures.verifyNotFound') }}</div>
    <div v-else-if="result && result.found" class="flex flex-col gap-2 text-sm max-w-md">
      <p class="text-green-600 font-medium">{{ t('signatures.verifyOk') }}</p>
      <p><strong>{{ t('signatures.colTitle') }}:</strong> {{ result.title }}</p>
      <p><strong>{{ t('signatures.org') }}:</strong> {{ result.organizationName }}</p>
      <p class="break-all"><strong>SHA-256:</strong> {{ result.documentHash }}</p>
      <ul class="list-disc pl-5 m-0">
        <li v-for="(s, i) in result.signers" :key="i">
          {{ s.name }} — {{ s.signedAt || '—' }}
        </li>
      </ul>
    </div>
  </AuthShell>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { signaturesApi } from '@/api/signatures';
import AuthShell from '@/components/auth/AuthShell.vue';

const { t } = useI18n();
const route = useRoute();
const loading = ref(true);
const result = ref<any>(null);

onMounted(async () => {
  try {
    if (route.name === 'verify-req' && route.params.id) {
      const { data } = await signaturesApi.verifyReq(route.params.id as string);
      result.value = data;
    } else if (route.params.hash) {
      const { data } = await signaturesApi.verifyHash(route.params.hash as string);
      result.value = data;
    }
  } finally {
    loading.value = false;
  }
});
</script>
