<template>
  <div class="max-w-xl flex flex-col gap-6">
    <PageHeader
      v-if="!embedded"
      :title="t('settings.sections.account')"
      :subtitle="t('settings.accountSubtitle')"
    />

    <div
      class="rounded-xl border p-4 mb-6 flex flex-col sm:flex-row sm:items-end gap-4"
      :style="{ borderColor: 'var(--surface-border)', backgroundColor: 'var(--surface-raised)' }"
    >
      <div class="flex flex-col gap-1.5 flex-1 min-w-0">
        <label class="text-sm font-medium" :style="{ color: 'var(--fg-default)' }">{{ t('settings.birthDateLabel') }}</label>
        <p class="text-xs m-0" :style="{ color: 'var(--fg-muted)' }">{{ t('settings.birthDateHint') }}</p>
        <Calendar v-model="birthDate" date-format="dd/mm/yy" show-icon show-button-bar class="w-full max-w-[14rem]" />
      </div>
      <Button
        type="button"
        :label="t('settings.birthDateSave')"
        icon="pi pi-check"
        :loading="birthSaving"
        @click="saveBirthDate"
      />
    </div>

    <div
      class="rounded-xl border divide-y"
      :style="{ borderColor: 'var(--surface-border)', backgroundColor: 'var(--surface-raised)' }"
    >
      <div class="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-1">
        <span class="text-sm font-medium w-40 shrink-0" :style="{ color: 'var(--fg-muted)' }">{{ t('auth.email') }}</span>
        <span class="text-sm" :style="{ color: 'var(--fg-default)' }">{{ user?.email || '—' }}</span>
      </div>
      <div class="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-1">
        <span class="text-sm font-medium w-40 shrink-0" :style="{ color: 'var(--fg-muted)' }">{{ t('settings.displayName') }}</span>
        <span class="text-sm" :style="{ color: 'var(--fg-default)' }">{{ displayName }}</span>
      </div>
      <div class="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-1">
        <span class="text-sm font-medium w-40 shrink-0" :style="{ color: 'var(--fg-muted)' }">{{ t('settings.roleLabel') }}</span>
        <span class="text-sm" :style="{ color: 'var(--fg-default)' }">{{ roleName || '—' }}</span>
      </div>
    </div>

    <template v-if="can('signature:sign')">
      <h3 class="text-base font-semibold mt-8 mb-1" :style="{ color: 'var(--fg-default)' }">
        {{ t('settings.digitalSignatureTitle') }}
      </h3>
      <p class="text-sm mb-4" :style="{ color: 'var(--fg-muted)' }">{{ t('settings.digitalSignatureHint') }}</p>
      <div
        class="rounded-xl border p-4 flex flex-col sm:flex-row sm:items-start gap-4"
        :style="{ borderColor: 'var(--surface-border)', backgroundColor: 'var(--surface-raised)' }"
      >
        <div
          v-if="signatureProfile?.previewUrl"
          class="shrink-0 rounded border overflow-hidden bg-white flex items-center justify-center"
          :style="{ borderColor: 'var(--surface-border)', minHeight: '5rem', minWidth: '8rem' }"
        >
          <img
            :src="signatureProfile.previewUrl"
            :alt="t('settings.digitalSignatureTitle')"
            class="max-h-24 max-w-full object-contain"
          />
        </div>
        <p v-else class="text-sm m-0" :style="{ color: 'var(--fg-muted)' }">
          {{ t('settings.digitalSignatureNoProfile') }}
        </p>
        <div class="flex flex-wrap gap-2">
          <input
            ref="signatureFileInput"
            type="file"
            class="hidden"
            accept="image/png,image/jpeg,image/jpg,image/svg+xml"
            @change="onSignatureFile"
          />
          <Button
            type="button"
            :label="t('settings.digitalSignatureUpload')"
            icon="pi pi-upload"
            size="small"
            :loading="signatureSaving"
            @click="openSignatureFilePicker"
          />
          <Button
            v-if="signatureProfile?.previewUrl"
            type="button"
            :label="t('settings.digitalSignatureDelete')"
            icon="pi pi-trash"
            size="small"
            severity="danger"
            outlined
            :loading="signatureDeleting"
            @click="removeSignature"
          />
        </div>
      </div>
    </template>

    <h3 class="text-base font-semibold mt-8 mb-1" :style="{ color: 'var(--fg-default)' }">{{ t('settings.documentTrashRetentionTitle') }}</h3>
    <p class="text-sm mb-4" :style="{ color: 'var(--fg-muted)' }">{{ t('settings.documentTrashRetentionHint') }}</p>

    <div
      class="rounded-xl border p-4 flex flex-col sm:flex-row sm:items-end gap-4"
      :style="{ borderColor: 'var(--surface-border)', backgroundColor: 'var(--surface-raised)' }"
    >
      <div class="flex flex-col gap-1.5 flex-1 min-w-0">
        <label class="text-sm font-medium" :style="{ color: 'var(--fg-default)' }">{{ t('settings.documentTrashRetentionLabel') }}</label>
        <InputNumber
          v-model="trashRetentionDays"
          :min="1"
          :max="365"
          :disabled="trashRetentionLoading"
          class="w-full max-w-[12rem]"
          input-class="w-full"
          show-buttons
        />
      </div>
      <Button
        type="button"
        :label="t('common.save')"
        icon="pi pi-check"
        :loading="trashRetentionSaving"
        :disabled="trashRetentionLoading"
        @click="saveTrashRetention"
      />
    </div>

    <h3 class="text-base font-semibold mt-8 mb-1" :style="{ color: 'var(--fg-default)' }">{{ t('settings.navOrderTitle') }}</h3>
    <p class="text-sm mb-4" :style="{ color: 'var(--fg-muted)' }">{{ t('settings.navOrderHint') }}</p>

    <div
      class="rounded-xl border overflow-hidden"
      :style="{ borderColor: 'var(--surface-border)', backgroundColor: 'var(--surface-raised)' }"
    >
      <draggable
        v-model="dragList"
        item-key="to"
        handle=".sidebar-nav-order-handle"
        ghost-class="opacity-40"
        :animation="150"
        @end="onNavOrderEnd"
      >
        <template #item="{ element }">
          <div
            class="flex items-center gap-3 px-4 py-3 border-b last:border-b-0"
            :style="{ borderColor: 'var(--surface-border)' }"
          >
            <button
              type="button"
              class="sidebar-nav-order-handle shrink-0 rounded p-1 -m-1 outline-none focus-visible:ring-2 cursor-grab active:cursor-grabbing touch-none"
              :style="{ color: 'var(--fg-muted)' }"
              :aria-label="t('settings.navOrderDragHandle')"
            >
              <i class="pi pi-bars text-sm" aria-hidden="true" />
            </button>
            <i :class="[element.icon, 'text-[17px] shrink-0']" :style="{ color: 'var(--fg-default)' }" aria-hidden="true" />
            <span class="text-sm min-w-0 flex-1" :style="{ color: 'var(--fg-default)' }">{{ element.label }}</span>
          </div>
        </template>
      </draggable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import draggable from 'vuedraggable';
import Button from 'primevue/button';
import Calendar from 'primevue/calendar';
import InputNumber from 'primevue/inputnumber';
import { useToast } from 'primevue/usetoast';
import { apiClient } from '@/api/client';
import { signaturesApi } from '@/api/signatures';
import { usePermissions } from '@/composables/usePermissions';
import { useMigrationVisibility } from '@/composables/useMigrationVisibility';
import { applySidebarNavOrder, getDefaultSidebarNavItems, type SidebarNavItem } from '@/navigation/sidebar-nav';
import { useSidebarNavOrderStore } from '@/stores/sidebar-nav-order.store';
import { useAuthStore } from '@/stores/auth.store';
import PageHeader from '@/components/common/PageHeader.vue';

withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false });

const { t } = useI18n();
const toast = useToast();
const { can } = usePermissions();
const { showInMainSidebar } = useMigrationVisibility();
const sidebarNavOrderStore = useSidebarNavOrderStore();
const authStore = useAuthStore();

const DEFAULT_TRASH_DAYS = 15;

function clampTrashDays(n: number): number {
  return Math.min(365, Math.max(1, Math.round(Number(n))));
}

const trashRetentionDays = ref<number>(DEFAULT_TRASH_DAYS);
const trashRetentionLoading = ref(true);
const trashRetentionSaving = ref(false);
const birthDate = ref<Date | null>(null);
const birthSaving = ref(false);
const signatureFileInput = ref<HTMLInputElement | null>(null);
const signatureProfile = ref<{ previewUrl: string | null; id?: string } | null>(null);
const signatureSaving = ref(false);
const signatureDeleting = ref(false);

const user = ref<{
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  roleName?: string | null;
} | null>(null);

const baseNavItems = computed(() =>
  getDefaultSidebarNavItems(t, can, showInMainSidebar.value),
);

const dragList = ref<SidebarNavItem[]>([]);

watch(
  [baseNavItems, () => sidebarNavOrderStore.order],
  () => {
    dragList.value = applySidebarNavOrder([...baseNavItems.value], sidebarNavOrderStore.order);
  },
  { immediate: true, deep: true },
);

function onNavOrderEnd() {
  sidebarNavOrderStore.saveOrder(dragList.value.map((i) => i.to));
}

const displayName = computed(() => {
  const u = user.value;
  if (!u) return '—';
  const n = [u.firstName, u.lastName].filter(Boolean).join(' ');
  return n || u.email || '—';
});

const roleName = computed(() => user.value?.roleName ?? null);

async function saveBirthDate() {
  birthSaving.value = true;
  try {
    await apiClient.patch('/calendar/profile/birth-date', {
      birthDate: birthDate.value ? birthDate.value.toISOString().slice(0, 10) : null,
    });
    toast.add({ severity: 'success', summary: t('settings.birthDateSaved'), life: 3000 });
  } catch {
    toast.add({ severity: 'error', summary: t('settings.birthDateError'), life: 4000 });
  } finally {
    birthSaving.value = false;
  }
}

function openSignatureFilePicker() {
  signatureFileInput.value?.click();
}

async function loadSignatureProfile() {
  if (!can('signature:sign')) return;
  try {
    const { data } = await signaturesApi.getMyProfile();
    signatureProfile.value = data && typeof data === 'object' ? (data as typeof signatureProfile.value) : null;
  } catch {
    signatureProfile.value = null;
  }
}

async function onSignatureFile(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  signatureSaving.value = true;
  try {
    await signaturesApi.uploadProfile(file);
    await loadSignatureProfile();
    toast.add({ severity: 'success', summary: t('settings.digitalSignatureSaved'), life: 3000 });
  } catch {
    toast.add({ severity: 'error', summary: t('settings.digitalSignatureError'), life: 4000 });
  } finally {
    signatureSaving.value = false;
  }
}

async function removeSignature() {
  signatureDeleting.value = true;
  try {
    await signaturesApi.deleteProfile();
    signatureProfile.value = null;
    toast.add({ severity: 'success', summary: t('settings.digitalSignatureRemoved'), life: 3000 });
  } catch {
    toast.add({ severity: 'error', summary: t('settings.digitalSignatureRemoveError'), life: 4000 });
  } finally {
    signatureDeleting.value = false;
  }
}

async function saveTrashRetention() {
  trashRetentionSaving.value = true;
  try {
    const n = clampTrashDays(trashRetentionDays.value);
    trashRetentionDays.value = n;
    await apiClient.patch('/organizations/me', {
      settings: { documentTrashRetentionDays: n },
    });
    await authStore.fetchMyOrganization();
    toast.add({
      severity: 'success',
      summary: t('settings.documentTrashRetentionSaved'),
      life: 3000,
    });
  } catch {
    toast.add({
      severity: 'error',
      summary: t('settings.documentTrashRetentionError'),
      life: 4000,
    });
  } finally {
    trashRetentionSaving.value = false;
  }
}

onMounted(async () => {
  sidebarNavOrderStore.hydrate();
  trashRetentionLoading.value = true;
  try {
    const [meRes, orgRes] = await Promise.all([
      apiClient.get('/auth/me'),
      apiClient.get<{ settings?: { documentTrashRetentionDays?: unknown } }>('/organizations/me'),
    ]);
    user.value = meRes.data;
    const bd = (meRes.data as { birthDate?: string | null })?.birthDate;
    birthDate.value = bd ? new Date(bd) : null;
    const d = orgRes.data?.settings?.documentTrashRetentionDays;
    trashRetentionDays.value =
      typeof d === 'number' && Number.isFinite(d) ? clampTrashDays(d) : DEFAULT_TRASH_DAYS;
  } catch {
    user.value = null;
    trashRetentionDays.value = DEFAULT_TRASH_DAYS;
  } finally {
    trashRetentionLoading.value = false;
  }
  void loadSignatureProfile();
});
</script>
