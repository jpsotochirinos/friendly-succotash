<template>
  <div class="flex flex-col gap-6">
    <PageHeader :title="t('settings.sections.users')" :subtitle="t('settings.usersSubtitle')">
      <template #actions>
        <Button
          v-if="canRead && canCreate"
          :label="t('settings.inviteUser')"
          icon="pi pi-user-plus"
          size="small"
          @click="openInviteDialog"
        />
      </template>
    </PageHeader>

    <div
      v-if="!canRead"
      class="rounded-xl border p-6 text-sm"
      :style="{ borderColor: 'var(--surface-border)', color: 'var(--fg-muted)' }"
    >
      {{ t('settings.usersNoPermission') }}
    </div>

    <DataTable v-else :value="mergedRows" :loading="loading" striped-rows size="small" class="text-sm">
      <template #empty>
        <span :style="{ color: 'var(--fg-muted)' }">{{ t('settings.usersEmpty') }}</span>
      </template>
      <Column field="email" :header="t('auth.email')" sortable />
      <Column :header="t('settings.usersName')">
        <template #body="{ data }">
          <span v-if="data.kind === 'member'">{{ displayName(data) }}</span>
          <span v-else :style="{ color: 'var(--fg-muted)' }">—</span>
        </template>
      </Column>
      <Column :header="t('settings.roleLabel')">
        <template #body="{ data }">
          {{ data.role?.name || '—' }}
        </template>
      </Column>
      <Column :header="t('settings.usersStatusCol')">
        <template #body="{ data }">
          <Tag
            v-if="data.kind === 'member'"
            :value="memberStatusLabel(data)"
            :severity="memberStatusSeverity(data)"
          />
          <Tag v-else :value="t('settings.statusPending')" severity="warn" />
        </template>
      </Column>
      <Column v-if="canCreate || canUpdate" :header="t('common.actions')" class="w-[min(12rem,40vw)]">
        <template #body="{ data }">
          <div v-if="data.kind === 'member' && canUpdate" class="flex flex-wrap items-center gap-1">
            <Button
              v-if="!data.isActive"
              :label="t('settings.enableUser')"
              icon="pi pi-check"
              size="small"
              outlined
              @click="confirmEnable(data)"
            />
            <Button
              v-else
              :label="t('settings.disableUser')"
              icon="pi pi-ban"
              severity="secondary"
              size="small"
              outlined
              :disabled="data.id === currentUserId"
              @click="openDisableMenu($event, data)"
            />
          </div>
          <Button
            v-else-if="data.kind === 'invite' && canCreate"
            icon="pi pi-times"
            severity="danger"
            text
            rounded
            size="small"
            v-tooltip.top="t('settings.revokeInvite')"
            :aria-label="t('settings.revokeInvite')"
            @click="confirmRevoke(data)"
          />
        </template>
      </Column>
    </DataTable>

    <Dialog
      v-model:visible="inviteDialogVisible"
      :header="t('settings.inviteDialogTitle')"
      :modal="true"
      :style="{ width: 'min(28rem, 96vw)' }"
      @hide="resetInviteDialog"
    >
      <div v-if="!inviteSuccess" class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium" for="invite-email">{{ t('settings.inviteEmail') }}</label>
          <InputText
            id="invite-email"
            v-model="inviteForm.email"
            type="email"
            class="w-full"
            autocomplete="off"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium" for="invite-role">{{ t('settings.inviteRole') }}</label>
          <Dropdown
            id="invite-role"
            v-model="inviteForm.roleId"
            :options="roleOptions"
            option-label="name"
            option-value="id"
            class="w-full"
            :placeholder="t('settings.inviteRole')"
            :disabled="!roleOptions.length"
          />
        </div>
        <Message v-if="!roleOptions.length" severity="warn" class="text-sm" :closable="false">
          {{ t('settings.noRoleOptions') }}
        </Message>
      </div>
      <div v-else class="flex flex-col gap-4 pt-2">
        <p class="text-sm" :style="{ color: 'var(--fg-muted)' }">{{ t('settings.inviteCreatedHint') }}</p>
        <div class="flex flex-wrap gap-2">
          <Button
            :label="t('settings.copyInviteLink')"
            icon="pi pi-copy"
            size="small"
            outlined
            @click="copyInviteLink"
          />
          <Button
            :label="t('settings.sendInviteEmail')"
            icon="pi pi-envelope"
            size="small"
            :loading="sendingEmail"
            @click="sendInviteEmail"
          />
        </div>
      </div>
      <template #footer>
        <Button v-if="!inviteSuccess" :label="t('common.cancel')" text @click="inviteDialogVisible = false" />
        <Button
          v-if="!inviteSuccess"
          :label="t('settings.inviteSubmit')"
          icon="pi pi-check"
          :loading="inviteSubmitting"
          :disabled="!canSubmitInvite"
          @click="submitInvite"
        />
        <Button v-else :label="t('settings.inviteDone')" icon="pi pi-check" @click="closeInviteSuccess" />
      </template>
    </Dialog>

    <Menu ref="disableMenuRef" :model="disableMenuModel" popup />

    <Dialog
      v-model:visible="customDisableOpen"
      :header="t('settings.disableCustomTitle')"
      modal
      :style="{ width: 'min(24rem, 96vw)' }"
      @hide="customDisableUser = null"
    >
      <div v-if="customDisableUser" class="flex flex-col gap-3 pt-2">
        <p class="text-sm m-0" :style="{ color: 'var(--fg-muted)' }">{{ customDisableUser.email }}</p>
        <Calendar v-model="customDisableDate" date-format="dd/mm/yy" show-icon class="w-full max-w-[16rem]" />
        <Button
          :label="t('settings.disableCustomConfirm')"
          icon="pi pi-check"
          :loading="customDisableSaving"
          :disabled="!customDisableDate"
          @click="submitCustomDisable"
        />
      </div>
    </Dialog>

    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import Message from 'primevue/message';
import ConfirmDialog from 'primevue/confirmdialog';
import Menu from 'primevue/menu';
import Calendar from 'primevue/calendar';
import type { MenuItem } from 'primevue/menuitem';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { apiClient } from '@/api/client';
import PageHeader from '@/components/common/PageHeader.vue';
import { useAuthStore } from '@/stores/auth.store';

const { t, locale: i18nLocale } = useI18n();
const authStore = useAuthStore();
const confirm = useConfirm();
const toast = useToast();

interface UserRow {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  disabledUntil?: string | null;
  role?: { name?: string };
}

interface InviteRow {
  id: string;
  email: string;
  status: string;
  role?: { id?: string; name?: string };
}

type MergedRow =
  | ({ kind: 'member' } & UserRow)
  | ({ kind: 'invite' } & InviteRow);

const users = ref<UserRow[]>([]);
const invitations = ref<InviteRow[]>([]);
const loading = ref(true);
const permissions = ref<string[]>([]);

const canRead = computed(() => permissions.value.includes('user:read'));
const canCreate = computed(() => permissions.value.includes('user:create'));
const canUpdate = computed(() => permissions.value.includes('user:update'));

const currentUserId = computed(() => authStore.user?.id ?? '');

const disableMenuRef = ref<InstanceType<typeof Menu> | null>(null);
const disableMenuModel = ref<MenuItem[]>([]);
const customDisableOpen = ref(false);
const customDisableUser = ref<UserRow | null>(null);
const customDisableDate = ref<Date | null>(null);
const customDisableSaving = ref(false);

const mergedRows = computed<MergedRow[]>(() => {
  const m = users.value.map((u) => ({ kind: 'member' as const, ...u }));
  const inv = invitations.value.map((i) => ({ kind: 'invite' as const, ...i }));
  return [...m, ...inv].sort((a, b) => a.email.localeCompare(b.email));
});

function displayName(u: UserRow) {
  const n = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return n || '—';
}

function memberStatusLabel(data: MergedRow): string {
  if (data.kind !== 'member') return '';
  if (data.isActive) return t('settings.active');
  const until = data.disabledUntil;
  if (until) {
    const end = new Date(until);
    if (!Number.isNaN(end.getTime()) && end.getTime() > Date.now()) {
      return t('settings.disabledUntil', {
        date: end.toLocaleString(i18nLocale.value === 'en' ? 'en-US' : 'es-PE', {
          dateStyle: 'short',
          timeStyle: 'short',
        }),
      });
    }
  }
  return t('settings.disabledIndefinite');
}

function memberStatusSeverity(data: MergedRow): 'success' | 'warn' | 'secondary' {
  if (data.kind !== 'member') return 'secondary';
  if (data.isActive) return 'success';
  const until = data.disabledUntil;
  if (until) {
    const end = new Date(until);
    if (!Number.isNaN(end.getTime()) && end.getTime() > Date.now()) return 'warn';
  }
  return 'secondary';
}

function openDisableMenu(event: Event, row: UserRow) {
  if (row.id === currentUserId.value) {
    toast.add({ severity: 'warn', summary: t('settings.cannotDisableSelf'), life: 4000 });
    return;
  }
  disableMenuModel.value = [
    { label: t('settings.disable1d'), command: () => void applyDisable(row, 1) },
    { label: t('settings.disable7d'), command: () => void applyDisable(row, 7) },
    { label: t('settings.disable30d'), command: () => void applyDisable(row, 30) },
    { label: t('settings.disableIndefinite'), command: () => void applyDisable(row, null) },
    { separator: true },
    {
      label: t('settings.disableCustom'),
      command: () => {
        customDisableUser.value = row;
        customDisableDate.value = new Date();
        customDisableOpen.value = true;
      },
    },
  ];
  disableMenuRef.value?.toggle(event);
}

async function applyDisable(row: UserRow, days: number | null) {
  try {
    let until: string | null = null;
    if (days != null) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + days);
      d.setUTCHours(23, 59, 59, 999);
      until = d.toISOString();
    }
    await apiClient.patch(`/users/${row.id}/disable`, { until });
    toast.add({ severity: 'success', summary: t('settings.userAccessUpdated'), life: 3000 });
    await loadUsers();
  } catch {
    toast.add({ severity: 'error', summary: t('settings.userAccessError'), life: 4000 });
  }
}

async function submitCustomDisable() {
  const row = customDisableUser.value;
  const day = customDisableDate.value;
  if (!row || !day) return;
  customDisableSaving.value = true;
  try {
    const d = new Date(day);
    d.setHours(23, 59, 59, 999);
    await apiClient.patch(`/users/${row.id}/disable`, { until: d.toISOString() });
    toast.add({ severity: 'success', summary: t('settings.userAccessUpdated'), life: 3000 });
    customDisableOpen.value = false;
    customDisableUser.value = null;
    await loadUsers();
  } catch {
    toast.add({ severity: 'error', summary: t('settings.userAccessError'), life: 4000 });
  } finally {
    customDisableSaving.value = false;
  }
}

function confirmEnable(row: UserRow) {
  confirm.require({
    message: t('settings.enableUserConfirm', { email: row.email }),
    header: t('settings.enableUser'),
    icon: 'pi pi-check-circle',
    acceptLabel: t('settings.enableUser'),
    rejectLabel: t('common.cancel'),
    accept: async () => {
      try {
        await apiClient.patch(`/users/${row.id}/disable`, { enable: true });
        toast.add({ severity: 'success', summary: t('settings.userAccessUpdated'), life: 3000 });
        await loadUsers();
      } catch {
        toast.add({ severity: 'error', summary: t('settings.userAccessError'), life: 4000 });
      }
    },
  });
}

async function loadUsers() {
  if (!canRead.value) return;
  try {
    const usersRes = await apiClient.get<{ data: UserRow[]; total?: number }>('/users');
    users.value = Array.isArray(usersRes.data?.data) ? usersRes.data.data : [];
  } catch {
    users.value = [];
  }
}

const inviteDialogVisible = ref(false);
const inviteSuccess = ref(false);
const inviteSubmitting = ref(false);
const sendingEmail = ref(false);
const roleOptions = ref<{ id: string; name: string }[]>([]);
const inviteForm = ref({ email: '', roleId: '' as string });
const lastCreatedInvite = ref<{ id: string; inviteUrl: string } | null>(null);

const canSubmitInvite = computed(
  () =>
    inviteForm.value.email.trim().length > 0 &&
    inviteForm.value.roleId.length > 0 &&
    roleOptions.value.length > 0,
);

async function loadRoleOptions() {
  try {
    const { data } = await apiClient.get<{ id: string; name: string }[]>('/invitations/role-options');
    roleOptions.value = Array.isArray(data) ? data : [];
  } catch {
    roleOptions.value = [];
  }
}

function openInviteDialog() {
  inviteForm.value = { email: '', roleId: '' };
  inviteSuccess.value = false;
  lastCreatedInvite.value = null;
  inviteDialogVisible.value = true;
  loadRoleOptions();
}

function resetInviteDialog() {
  inviteForm.value = { email: '', roleId: '' };
  inviteSuccess.value = false;
  lastCreatedInvite.value = null;
}

function closeInviteSuccess() {
  inviteDialogVisible.value = false;
  resetInviteDialog();
}

async function submitInvite() {
  inviteSubmitting.value = true;
  try {
    const { data } = await apiClient.post<{ invitation: { id: string }; inviteUrl: string }>('/invitations', {
      email: inviteForm.value.email.trim(),
      roleId: inviteForm.value.roleId,
    });
    lastCreatedInvite.value = { id: data.invitation.id, inviteUrl: data.inviteUrl };
    inviteSuccess.value = true;
    await loadInvitations();
  } catch {
    toast.add({ severity: 'error', summary: t('settings.inviteError'), life: 4000 });
  } finally {
    inviteSubmitting.value = false;
  }
}

async function copyInviteLink() {
  const url = lastCreatedInvite.value?.inviteUrl;
  if (!url) return;
  try {
    await navigator.clipboard.writeText(url);
    toast.add({ severity: 'success', summary: t('settings.linkCopied'), life: 3000 });
  } catch {
    toast.add({ severity: 'error', summary: t('settings.inviteError'), life: 3000 });
  }
}

async function sendInviteEmail() {
  const id = lastCreatedInvite.value?.id;
  if (!id) return;
  sendingEmail.value = true;
  try {
    const { data } = await apiClient.post<{ inviteUrl: string }>(`/invitations/${id}/send-email`);
    if (data?.inviteUrl) {
      lastCreatedInvite.value = { id, inviteUrl: data.inviteUrl };
    }
    toast.add({ severity: 'success', summary: t('settings.emailSent'), life: 3000 });
  } catch {
    toast.add({ severity: 'error', summary: t('settings.sendEmailError'), life: 4000 });
  } finally {
    sendingEmail.value = false;
  }
}

function confirmRevoke(row: MergedRow) {
  if (row.kind !== 'invite') return;
  confirm.require({
    message: t('settings.revokeInviteConfirm', { email: row.email }),
    header: t('settings.revokeInvite'),
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await apiClient.delete(`/invitations/${row.id}`);
        await loadInvitations();
        toast.add({ severity: 'success', summary: t('settings.inviteRevoked'), life: 3000 });
      } catch {
        toast.add({ severity: 'error', summary: t('settings.revokeError'), life: 4000 });
      }
    },
  });
}

async function loadInvitations() {
  if (!canRead.value) return;
  try {
    const { data } = await apiClient.get<InviteRow[]>('/invitations');
    invitations.value = Array.isArray(data) ? data : [];
  } catch {
    invitations.value = [];
  }
}

onMounted(async () => {
  try {
    const { data } = await apiClient.get('/auth/me');
    permissions.value = Array.isArray(data?.permissions) ? data.permissions : [];
  } catch {
    permissions.value = [];
  }

  if (!canRead.value) {
    loading.value = false;
    return;
  }

  try {
    await Promise.all([loadUsers(), loadInvitations()]);
  } catch {
    users.value = [];
  } finally {
    loading.value = false;
  }
});
</script>
