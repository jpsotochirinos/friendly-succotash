<template>
  <div class="max-w-xl flex flex-col gap-6">
    <PageHeader
      v-if="!embedded"
      :title="t('settings.sections.general')"
      :subtitle="t('settings.generalSubtitle')"
    />

    <form class="space-y-6" @submit.prevent="save">
      <div class="flex flex-col gap-1.5">
        <label for="org-name" class="text-sm font-medium" :style="{ color: 'var(--fg-default)' }">
          {{ t('auth.organization') }}
        </label>
        <InputText
          id="org-name"
          v-model="orgName"
          class="w-full"
          :disabled="loading"
          autocomplete="off"
        />
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-sm font-medium" :style="{ color: 'var(--fg-default)' }">{{ t('settings.orgLogoLabel') }}</span>
        <p class="text-xs" :style="{ color: 'var(--fg-muted)' }">{{ t('settings.orgLogoHint') }}</p>
        <div class="flex flex-wrap items-center gap-3">
          <div
            v-if="organization?.logoUrl"
            class="h-16 w-40 rounded-lg border border-surface-border bg-surface-ground flex items-center justify-center p-2 overflow-hidden"
          >
            <img
              :src="organization.logoUrl"
              :alt="organization.name"
              class="max-h-full max-w-full object-contain"
            />
          </div>
          <input
            ref="logoInputRef"
            type="file"
            class="sr-only"
            accept="image/png,image/jpeg,image/webp,image/gif"
            :disabled="loading || logoUploading"
            @change="onLogoFile"
          />
          <Button
            type="button"
            :label="t('settings.orgLogoChoose')"
            icon="pi pi-upload"
            severity="secondary"
            outlined
            :disabled="loading || logoUploading"
            :loading="logoUploading"
            @click="logoInputRef?.click()"
          />
          <Button
            v-if="organization?.logoUrl"
            type="button"
            :label="t('settings.orgLogoRemove')"
            icon="pi pi-times"
            severity="secondary"
            text
            :disabled="loading || logoRemoving"
            :loading="logoRemoving"
            @click="removeLogo"
          />
        </div>
      </div>

      <div class="flex flex-col gap-2 rounded-lg border p-4" :style="{ borderColor: 'var(--border-default)' }">
        <div class="flex items-center gap-2">
          <Checkbox
            v-model="useConfigurableWorkflows"
            binary
            input-id="ff-wf"
            :disabled="loading"
          />
          <label for="ff-wf" class="text-sm font-medium" :style="{ color: 'var(--fg-default)' }">
            {{ t('settings.useConfigurableWorkflowsLabel') }}
          </label>
        </div>
        <p class="text-xs" :style="{ color: 'var(--fg-muted)' }">{{ t('settings.useConfigurableWorkflowsHint') }}</p>
        <Message
          v-if="useConfigurableWorkflows && !loading && !canReadBlueprints"
          severity="info"
          :closable="false"
          class="mt-2 text-sm [&_.p-message-text]:text-sm"
        >
          <span>{{ t('settings.flowsPermissionHintBlueprints') }}</span>
          <RouterLink :to="{ name: 'settings-roles' }" class="ml-1 font-medium underline text-primary-600">
            {{ t('settings.sections.roles') }}
          </RouterLink>
          .
        </Message>
        <div v-if="useConfigurableWorkflows && !loading && canReadBlueprints" class="mt-2">
          <RouterLink
            :to="{ name: 'settings-blueprints' }"
            class="text-sm font-medium text-primary-600 underline"
          >
            {{ t('settings.goToBlueprints') }} →
          </RouterLink>
        </div>
      </div>

      <Button type="submit" :loading="saving" :label="t('common.save')" icon="pi pi-check" />
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Message from 'primevue/message';
import InputText from 'primevue/inputtext';
import { apiClient } from '@/api/client';
import PageHeader from '@/components/common/PageHeader.vue';
import { useAuthStore } from '@/stores/auth.store';
import type { OrganizationSummary } from '@/stores/auth.store';

withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false });

const { t } = useI18n();
const toast = useToast();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { organization } = storeToRefs(authStore);

const orgName = ref('');
const useConfigurableWorkflows = ref(false);
const userPermissions = ref<string[]>([]);
const canReadBlueprints = computed(() => userPermissions.value.includes('blueprint:read'));
const loading = ref(true);
const saving = ref(false);
const logoUploading = ref(false);
const logoRemoving = ref(false);
const logoInputRef = ref<HTMLInputElement | null>(null);

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

onMounted(async () => {
  const missing = route.query.missingPermission;
  if (typeof missing === 'string' && missing.length > 0) {
    toast.add({
      severity: 'warn',
      summary: t('settings.missingPermissionToast', { perm: missing }),
      life: 5000,
    });
    const { missingPermission: _omit, ...rest } = route.query;
    router.replace({ name: 'settings-general', query: rest });
  }
  try {
    const [orgRes, meRes] = await Promise.all([
      apiClient.get<OrganizationSummary>('/organizations/me'),
      apiClient.get<{ permissions?: string[] }>('/auth/me').catch(() => ({ data: {} })),
    ]);
    const data = orgRes.data;
    const meData = meRes.data as { permissions?: string[] } | undefined;
    userPermissions.value = Array.isArray(meData?.permissions) ? meData.permissions : [];
    orgName.value = data.name ?? '';
    useConfigurableWorkflows.value = !!data.featureFlags?.useConfigurableWorkflows;
    authStore.$patch((state) => {
      state.organization = {
        id: data.id,
        name: data.name,
        settings: data.settings ?? null,
        logoUrl: data.logoUrl ?? null,
        featureFlags: data.featureFlags ?? null,
      };
    });
  } catch {
    toast.add({ severity: 'error', summary: t('settings.loadOrgError'), life: 4000 });
  } finally {
    loading.value = false;
  }
});

async function save() {
  saving.value = true;
  try {
    await apiClient.patch('/organizations/me', {
      name: orgName.value.trim() || undefined,
      featureFlags: { useConfigurableWorkflows: useConfigurableWorkflows.value },
    });
    await authStore.fetchMyOrganization();
    toast.add({ severity: 'success', summary: t('settings.orgSaved'), life: 3000 });
  } catch {
    toast.add({ severity: 'error', summary: t('settings.orgSaveError'), life: 4000 });
  } finally {
    saving.value = false;
  }
}

async function onLogoFile(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  if (file.size > MAX_LOGO_BYTES) {
    toast.add({ severity: 'warn', summary: t('settings.orgLogoUploadError'), life: 4000 });
    return;
  }
  if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
    toast.add({ severity: 'warn', summary: t('settings.orgLogoUploadError'), life: 4000 });
    return;
  }

  logoUploading.value = true;
  try {
    const formData = new FormData();
    formData.append('file', file);
    await apiClient.post('/organizations/me/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    await authStore.fetchMyOrganization();
    toast.add({ severity: 'success', summary: t('settings.orgLogoUploadSuccess'), life: 3000 });
  } catch {
    toast.add({ severity: 'error', summary: t('settings.orgLogoUploadError'), life: 4000 });
  } finally {
    logoUploading.value = false;
  }
}

async function removeLogo() {
  logoRemoving.value = true;
  try {
    await apiClient.patch('/organizations/me', { logoUrl: null });
    await authStore.fetchMyOrganization();
    toast.add({ severity: 'success', summary: t('settings.orgLogoRemoved'), life: 3000 });
  } catch {
    toast.add({ severity: 'error', summary: t('settings.orgLogoRemoveError'), life: 4000 });
  } finally {
    logoRemoving.value = false;
  }
}
</script>
