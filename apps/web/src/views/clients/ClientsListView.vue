<template>
  <div class="flex flex-col gap-6">
    <div v-if="!authReady" class="flex justify-center py-20">
      <ProgressSpinner />
    </div>
    <template v-else-if="!canTrackableRead">
      <div class="flex flex-col items-center justify-center gap-3 py-16 text-center text-[var(--fg-muted)]">
        <i class="pi pi-lock text-4xl opacity-60" />
        <p class="m-0">{{ t('clients.noPermission') }}</p>
      </div>
    </template>
    <template v-else>
    <PageHeader :title="t('clients.title')" :subtitle="t('clients.pageSubtitle')">
      <template #actions>
        <Button
          v-if="canTrackableCreate"
          :label="t('clients.newClient')"
          icon="pi pi-plus"
          size="small"
          @click="openCreate"
        />
      </template>
    </PageHeader>

    <div class="flex flex-wrap gap-3 items-center">
      <InputText
        v-model="filters.search"
        :placeholder="t('clients.searchPlaceholder')"
        class="w-72"
        @input="debouncedLoad"
      />
    </div>

    <DataTable
      :value="clients"
      :loading="loading"
      paginator
      lazy
      :rows="rows"
      :total-records="totalRecords"
      :first="first"
      striped-rows
      @page="onPage"
    >
      <Column field="name" :header="t('clients.name')">
        <template #body="{ data }">
          <span class="font-medium text-[var(--fg-default)]">{{ data.name }}</span>
        </template>
      </Column>
      <Column field="email" :header="t('clients.email')">
        <template #body="{ data }">
          <span class="text-[var(--fg-muted)]">{{ data.email || '—' }}</span>
        </template>
      </Column>
      <Column field="phone" :header="t('clients.phone')">
        <template #body="{ data }">
          <span class="text-[var(--fg-muted)]">{{ data.phone || '—' }}</span>
        </template>
      </Column>
      <Column field="documentId" :header="t('clients.documentId')">
        <template #body="{ data }">
          <span class="text-[var(--fg-muted)] text-sm">{{ data.documentId || '—' }}</span>
        </template>
      </Column>
      <Column v-if="rowHasClientActions" :header="t('common.actions')">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button
              v-if="canTrackableUpdate"
              icon="pi pi-pencil"
              text
              rounded
              size="small"
              v-tooltip.top="t('common.edit')"
              @click="openEdit(data)"
            />
            <Button
              v-if="canTrackableDelete"
              icon="pi pi-trash"
              text
              rounded
              size="small"
              severity="danger"
              v-tooltip.top="t('common.delete')"
              @click="confirmDelete(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog
      v-model:visible="dialogVisible"
      :header="editingId ? t('clients.editClient') : t('clients.newClient')"
      :modal="true"
      :style="{ width: 'min(32rem, 96vw)' }"
    >
      <div class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-[var(--fg-default)]" for="client-form-name">{{ t('clients.name') }} *</label>
          <InputText id="client-form-name" v-model="form.name" autofocus />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-[var(--fg-default)]" for="client-form-email">{{ t('clients.email') }}</label>
          <InputText id="client-form-email" v-model="form.email" type="email" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-[var(--fg-default)]" for="client-form-phone">{{ t('clients.phone') }}</label>
          <InputText id="client-form-phone" v-model="form.phone" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-[var(--fg-default)]" for="client-form-doc">{{ t('clients.documentId') }}</label>
          <InputText id="client-form-doc" v-model="form.documentId" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-[var(--fg-default)]" for="client-form-notes">{{ t('clients.notes') }}</label>
          <Textarea id="client-form-notes" v-model="form.notes" rows="3" />
        </div>
      </div>
      <template #footer>
        <Button :label="t('common.cancel')" text @click="dialogVisible = false" />
        <Button
          :label="t('common.save')"
          icon="pi pi-check"
          :loading="saving"
          :disabled="!form.name?.trim()"
          @click="saveClient"
        />
      </template>
    </Dialog>

    <ConfirmDialog />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import ProgressSpinner from 'primevue/progressspinner';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import Textarea from 'primevue/textarea';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import ConfirmDialog from 'primevue/confirmdialog';
import { useI18n } from 'vue-i18n';
import { apiClient } from '@/api/client';
import { usePermissions } from '@/composables/usePermissions';
import { useAuthStore } from '@/stores/auth.store';
import PageHeader from '@/components/common/PageHeader.vue';

const { t } = useI18n();
const confirm = useConfirm();
const toast = useToast();
const { can } = usePermissions();
const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

const authReady = computed(() => user.value != null);
const canTrackableRead = computed(() => can('trackable:read'));
const canTrackableCreate = computed(() => can('trackable:create'));
const canTrackableUpdate = computed(() => can('trackable:update'));
const canTrackableDelete = computed(() => can('trackable:delete'));
const rowHasClientActions = computed(() => canTrackableUpdate.value || canTrackableDelete.value);

interface ClientRow {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  documentId?: string;
  notes?: string;
}

const clients = ref<ClientRow[]>([]);
const loading = ref(false);
const totalRecords = ref(0);
const first = ref(0);
const rows = ref(20);

const filters = ref({ search: '' });

let searchDebounce: ReturnType<typeof setTimeout> | null = null;
function debouncedLoad() {
  if (searchDebounce) clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    first.value = 0;
    loadClients(1);
  }, 320);
}

const dialogVisible = ref(false);
const editingId = ref<string | null>(null);
const saving = ref(false);
const form = ref({
  name: '',
  email: '',
  phone: '',
  documentId: '',
  notes: '',
});

function resetForm() {
  form.value = { name: '', email: '', phone: '', documentId: '', notes: '' };
  editingId.value = null;
}

function openCreate() {
  if (!canTrackableCreate.value) return;
  resetForm();
  dialogVisible.value = true;
}

function openEdit(row: ClientRow) {
  if (!canTrackableUpdate.value) return;
  editingId.value = row.id;
  form.value = {
    name: row.name,
    email: row.email || '',
    phone: row.phone || '',
    documentId: row.documentId || '',
    notes: row.notes || '',
  };
  dialogVisible.value = true;
}

async function loadClients(page = 1) {
  loading.value = true;
  try {
    const { data } = await apiClient.get('/clients', {
      params: {
        page,
        limit: rows.value,
        search: filters.value.search?.trim() || undefined,
      },
    });
    clients.value = data.data ?? [];
    totalRecords.value = data.total ?? 0;
  } catch {
    clients.value = [];
    totalRecords.value = 0;
  } finally {
    loading.value = false;
  }
}

function onPage(event: { first: number; page: number }) {
  first.value = event.first;
  loadClients(event.page + 1);
}

async function saveClient() {
  const name = form.value.name.trim();
  if (!name) return;
  if (editingId.value && !canTrackableUpdate.value) return;
  if (!editingId.value && !canTrackableCreate.value) return;
  saving.value = true;
  try {
    const payload = {
      name,
      email: form.value.email.trim() || undefined,
      phone: form.value.phone.trim() || undefined,
      documentId: form.value.documentId.trim() || undefined,
      notes: form.value.notes.trim() || undefined,
    };
    if (editingId.value) {
      await apiClient.patch(`/clients/${editingId.value}`, payload);
      toast.add({ severity: 'success', summary: t('clients.saved'), life: 2200 });
    } else {
      await apiClient.post('/clients', payload);
      toast.add({ severity: 'success', summary: t('clients.created'), life: 2200 });
    }
    dialogVisible.value = false;
    resetForm();
    await loadClients(Math.floor(first.value / rows.value) + 1);
  } catch {
    toast.add({ severity: 'error', summary: t('clients.saveError'), life: 4000 });
  } finally {
    saving.value = false;
  }
}

function confirmDelete(row: ClientRow) {
  if (!canTrackableDelete.value) return;
  confirm.require({
    message: t('clients.deleteConfirm', { name: row.name }),
    header: t('common.delete'),
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: t('common.delete'),
    rejectLabel: t('common.cancel'),
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await apiClient.delete(`/clients/${row.id}`);
        toast.add({ severity: 'success', summary: t('clients.deleted'), life: 2200 });
        first.value = 0;
        await loadClients(1);
      } catch {
        toast.add({ severity: 'error', summary: t('clients.deleteError'), life: 4000 });
      }
    },
  });
}

watch(
  [authReady, canTrackableRead],
  ([ready, read]) => {
    if (ready && read) loadClients(1);
  },
  { immediate: true },
);
</script>
