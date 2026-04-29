<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import SelectButton from 'primevue/selectbutton';
import Skeleton from 'primevue/skeleton';
import Paginator from 'primevue/paginator';
import Dialog from 'primevue/dialog';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import { useToast } from 'primevue/usetoast';
import ConfirmDialogBase from '@/components/common/ConfirmDialogBase.vue';
import PageHeader from '@/components/common/PageHeader.vue';
import {
  useMockClients,
  MOCK_CLIENT_USERS,
  CLIENT_TYPE_OPTIONS,
  CLIENT_SCOPE_OPTIONS,
  clientTypeLabel,
  clientStatusLabel,
  clientStatusSeverity,
  getClientUser,
  relativeTime,
  type ClientScope,
  type ClientType,
  type ClientStatus,
  type MockClient,
} from './mocks';

const toast = useToast();
const { activeItems, archivedItems, archive, reactivate, permanentDelete, create, update } =
  useMockClients();

// -----------------------------------------------------------------------
// Current user (for "Asignados a mí")
// -----------------------------------------------------------------------
const currentUserId = 'u1';
const currentUserName = computed(
  () => MOCK_CLIENT_USERS.find((u) => u.id === currentUserId)?.name ?? 'Tú',
);

// -----------------------------------------------------------------------
// Scope tabs
// -----------------------------------------------------------------------
const listScope = ref<ClientScope>('active');
const scopeOptions = CLIENT_SCOPE_OPTIONS;

// -----------------------------------------------------------------------
// Filters
// -----------------------------------------------------------------------
const searchQuery = ref('');
const typeFilter = ref<string | null>(null);
const assigneeFilter = ref<string | null>(null);
const onlyMine = ref(false);
const currentPage = ref(1);
const pageSize = ref(10);
const loading = ref(false);

const typeFilterOptions = [
  { label: 'Todos los tipos', value: null },
  ...CLIENT_TYPE_OPTIONS,
];

const assigneeFilterOptions = [
  { label: 'Todos los asignados', value: null },
  ...MOCK_CLIENT_USERS.map((u) => ({ label: u.name, value: u.id })),
];

const hasActiveFilters = computed(
  () =>
    !!searchQuery.value.trim() ||
    typeFilter.value !== null ||
    assigneeFilter.value !== null ||
    onlyMine.value,
);

function clearFilters() {
  searchQuery.value = '';
  typeFilter.value = null;
  assigneeFilter.value = null;
  onlyMine.value = false;
}

function simulateLoad(ms = 500) {
  loading.value = true;
  return new Promise<void>((resolve) =>
    setTimeout(() => {
      loading.value = false;
      resolve();
    }, ms),
  );
}

watch([listScope, searchQuery, typeFilter, assigneeFilter, onlyMine], async () => {
  currentPage.value = 1;
  await simulateLoad();
});

// -----------------------------------------------------------------------
// Filtered + paginated rows
// -----------------------------------------------------------------------
const sourceRows = computed<MockClient[]>(() => {
  const base = listScope.value === 'active' ? activeItems.value : archivedItems.value;
  return base.filter((row) => {
    const q = searchQuery.value.toLowerCase().trim();
    const matchSearch =
      !q ||
      row.name.toLowerCase().includes(q) ||
      row.document.toLowerCase().includes(q) ||
      row.email.toLowerCase().includes(q);
    const matchType = typeFilter.value === null || row.type === typeFilter.value;
    const matchAssignee = assigneeFilter.value === null || row.assigneeId === assigneeFilter.value;
    const matchMine = !onlyMine.value || row.assigneeId === currentUserId;
    return matchSearch && matchType && matchAssignee && matchMine;
  });
});

const totalRecords = computed(() => sourceRows.value.length);

const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return sourceRows.value.slice(start, start + pageSize.value);
});

function onPageChange(event: { page: number; rows: number }) {
  currentPage.value = event.page + 1;
  pageSize.value = event.rows;
}

// -----------------------------------------------------------------------
// Avatar color
// -----------------------------------------------------------------------
function avatarColor(id: string | null): string {
  const colors = ['#3b5bdb', '#0ca678', '#e67700', '#862e9c', '#c92a2a'];
  if (!id) return colors[0];
  const idx = id.codePointAt(id.length - 1)! % colors.length;
  return colors[idx];
}

// -----------------------------------------------------------------------
// Create / Edit dialog (single form)
// -----------------------------------------------------------------------
type FormMode = 'create' | 'edit';
const showFormDialog = ref(false);
const formMode = ref<FormMode>('create');
const formLoading = ref(false);
const editTarget = ref<MockClient | null>(null);
const formSnapshot = ref('');

const form = ref({
  name: '',
  type: 'natural' as ClientType,
  document: '',
  email: '',
  phone: '',
  status: 'pending' as ClientStatus,
  assigneeId: null as string | null,
});

const formErrors = ref({ name: '', document: '', email: '' });

const formIsDirty = computed(() => JSON.stringify(form.value) !== formSnapshot.value);

const statusOptions = [
  { label: 'Verificado', value: 'verified' },
  { label: 'Pendiente', value: 'pending' },
  { label: 'Inactivo', value: 'inactive' },
];

function resetForm() {
  form.value = {
    name: '',
    type: 'natural',
    document: '',
    email: '',
    phone: '',
    status: 'pending',
    assigneeId: null,
  };
  formErrors.value = { name: '', document: '', email: '' };
  editTarget.value = null;
}

function openCreate() {
  formMode.value = 'create';
  resetForm();
  formSnapshot.value = JSON.stringify(form.value);
  showFormDialog.value = true;
}

function openEdit(row: MockClient) {
  formMode.value = 'edit';
  editTarget.value = row;
  form.value = {
    name: row.name,
    type: row.type,
    document: row.document,
    email: row.email,
    phone: row.phone,
    status: row.status,
    assigneeId: row.assigneeId,
  };
  formErrors.value = { name: '', document: '', email: '' };
  formSnapshot.value = JSON.stringify(form.value);
  showFormDialog.value = true;
}

function attemptCloseForm() {
  if (formLoading.value) return;
  if (formIsDirty.value && !window.confirm('¿Descartar los cambios?')) return;
  showFormDialog.value = false;
}

const formCanSubmit = computed(
  () =>
    form.value.name.trim().length > 0 &&
    form.value.document.trim().length > 0 &&
    (formMode.value === 'create' || formIsDirty.value),
);

function isValidEmail(email: string): boolean {
  if (!email) return true; // optional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function submitForm() {
  formErrors.value.name = form.value.name.trim() ? '' : 'El nombre es obligatorio';
  formErrors.value.document = form.value.document.trim() ? '' : 'El documento es obligatorio';
  formErrors.value.email = isValidEmail(form.value.email) ? '' : 'Email inválido';
  if (formErrors.value.name || formErrors.value.document || formErrors.value.email) return;

  formLoading.value = true;
  try {
    if (formMode.value === 'create') {
      await create({ ...form.value });
      toast.add({ severity: 'success', summary: 'Cliente creado', detail: form.value.name, life: 3000 });
      currentPage.value = 1;
    } else if (editTarget.value) {
      await update(editTarget.value.id, { ...form.value });
      toast.add({ severity: 'success', summary: 'Cliente actualizado', life: 2500 });
    }
    showFormDialog.value = false;
  } catch {
    toast.add({ severity: 'error', summary: 'Error al guardar', life: 4000 });
  } finally {
    formLoading.value = false;
  }
}

// -----------------------------------------------------------------------
// Confirm dialogs
// -----------------------------------------------------------------------
const archiveTarget = ref<MockClient | null>(null);
const showArchiveConfirm = ref(false);
const archiving = ref(false);

function requestArchive(row: MockClient) {
  archiveTarget.value = row;
  showArchiveConfirm.value = true;
}

async function confirmArchive() {
  if (!archiveTarget.value) return;
  archiving.value = true;
  try {
    await archive(archiveTarget.value.id);
    showArchiveConfirm.value = false;
    toast.add({ severity: 'success', summary: 'Cliente archivado', life: 3000 });
  } finally {
    archiving.value = false;
  }
}

const reactivateTarget = ref<MockClient | null>(null);
const showReactivateConfirm = ref(false);
const reactivating = ref(false);

function requestReactivate(row: MockClient) {
  reactivateTarget.value = row;
  showReactivateConfirm.value = true;
}

async function confirmReactivate() {
  if (!reactivateTarget.value) return;
  reactivating.value = true;
  try {
    await reactivate(reactivateTarget.value.id);
    showReactivateConfirm.value = false;
    toast.add({ severity: 'success', summary: 'Cliente reactivado', life: 3000 });
  } finally {
    reactivating.value = false;
  }
}

const deleteTarget = ref<MockClient | null>(null);
const showDeleteConfirm = ref(false);
const deleting = ref(false);

function requestDelete(row: MockClient) {
  deleteTarget.value = row;
  showDeleteConfirm.value = true;
}

async function confirmDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await permanentDelete(deleteTarget.value.id);
    showDeleteConfirm.value = false;
    toast.add({ severity: 'info', summary: 'Cliente eliminado', life: 3000 });
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">

    <!-- Confirm dialogs -->
    <ConfirmDialogBase
      v-model:visible="showArchiveConfirm"
      variant="warning"
      title="Archivar cliente"
      :subject="archiveTarget?.name"
      message="El cliente se moverá a Archivados y no aparecerá al asignar partes a expedientes."
      :consequences="[
        'No estará disponible al asignar partes nuevas.',
        'Los expedientes existentes mantendrán la referencia.',
        'Podrás reactivarlo en cualquier momento.',
      ]"
      consequences-title="Qué pasará"
      confirm-label="Archivar"
      :loading="archiving"
      @confirm="confirmArchive"
    />
    <ConfirmDialogBase
      v-model:visible="showReactivateConfirm"
      variant="success"
      title="Reactivar cliente"
      :subject="reactivateTarget?.name"
      message="El cliente volverá a estar disponible para asignar a expedientes."
      confirm-label="Reactivar"
      :loading="reactivating"
      @confirm="confirmReactivate"
    />
    <ConfirmDialogBase
      v-model:visible="showDeleteConfirm"
      variant="danger"
      title="Eliminar cliente permanentemente"
      :subject="deleteTarget?.name"
      message="Esta acción no se puede deshacer. Solo es posible si el cliente no tiene expedientes activos."
      :consequences="[
        'Se eliminará el registro del cliente.',
        'Los expedientes históricos perderán la referencia al cliente.',
        'Esta acción es irreversible.',
      ]"
      consequences-title="Qué pasará"
      typed-confirm-phrase="ELIMINAR"
      typed-confirm-hint="Esta acción es irreversible. Para confirmar, escribe la palabra a continuación."
      typed-confirm-label="Escribe ELIMINAR"
      confirm-label="Eliminar permanentemente"
      :loading="deleting"
      @confirm="confirmDelete"
    />

    <!-- Page header -->
    <PageHeader title="Clientes" subtitle="Gestiona los clientes representados por el despacho.">
      <template #actions>
        <Button
          v-if="listScope === 'active'"
          label="Nuevo cliente"
          icon="pi pi-plus"
          size="small"
          @click="openCreate"
        />
      </template>
    </PageHeader>

    <!-- Scope tabs -->
    <SelectButton
      v-model="listScope"
      :options="scopeOptions"
      option-label="label"
      option-value="value"
      :allow-empty="false"
      class="scope-tabs"
    />

    <!-- Main card (constrained — internal scroll for table body) -->
    <div class="app-card flex flex-col overflow-hidden table-card">

      <!-- Toolbar -->
      <div
        class="flex items-center gap-2 px-4 py-3 flex-wrap"
        style="border-bottom: 1px solid var(--surface-border); background: var(--surface-raised);"
      >
        <IconField class="flex-1 min-w-[200px]">
          <InputIcon class="pi pi-search" style="color: var(--fg-subtle);" />
          <InputText
            v-model="searchQuery"
            placeholder="Buscar por nombre, documento o email…"
            size="small"
            class="w-full"
          />
        </IconField>

        <Dropdown
          v-model="typeFilter"
          :options="typeFilterOptions"
          option-label="label"
          option-value="value"
          placeholder="Tipo"
          show-clear
          size="small"
          class="toolbar-dropdown"
        />

        <Dropdown
          v-model="assigneeFilter"
          :options="assigneeFilterOptions"
          option-label="label"
          option-value="value"
          placeholder="Asignado"
          show-clear
          size="small"
          class="toolbar-dropdown"
        />

        <button
          type="button"
          class="cockpit-pill"
          :class="{ 'cockpit-pill--active': onlyMine }"
          @click="onlyMine = !onlyMine"
        >
          <i class="pi pi-user text-[10px]" />
          A mí
        </button>

        <Button
          v-if="hasActiveFilters"
          label="Limpiar"
          icon="pi pi-filter-slash"
          variant="text"
          severity="secondary"
          size="small"
          @click="clearFilters"
        />

        <span class="text-xs tabular-nums" style="color: var(--fg-subtle); white-space: nowrap;">
          {{ totalRecords }} cliente{{ totalRecords !== 1 ? 's' : '' }}
        </span>
      </div>

      <!-- Skeleton -->
      <div v-if="loading" class="flex-1 min-h-0 overflow-auto">
        <div class="min-w-[760px]">
          <div
            class="grid gap-4 px-4 py-3"
            style="grid-template-columns: minmax(260px,2fr) 120px 130px 160px 140px; border-bottom: 1px solid var(--surface-border);"
          >
            <Skeleton v-for="col in 5" :key="col" height="0.75rem" />
          </div>
          <div
            v-for="row in 8"
            :key="row"
            class="grid items-center gap-4 px-4 py-4"
            style="grid-template-columns: minmax(260px,2fr) 120px 130px 160px 140px; border-bottom: 1px solid var(--surface-border);"
          >
            <div class="flex items-center gap-3">
              <Skeleton shape="circle" size="2.25rem" />
              <div class="flex-1 flex flex-col gap-2">
                <Skeleton height="0.9rem" width="80%" />
                <Skeleton height="0.7rem" width="55%" />
              </div>
            </div>
            <Skeleton height="1.2rem" width="4.5rem" border-radius="999px" />
            <Skeleton height="1.2rem" width="5rem" border-radius="999px" />
            <Skeleton height="0.8rem" width="65%" />
            <div class="flex justify-center gap-2">
              <Skeleton shape="circle" size="2rem" />
              <Skeleton shape="circle" size="2rem" />
              <Skeleton shape="circle" size="2rem" />
            </div>
          </div>
        </div>
      </div>

      <!-- DataTable -->
      <DataTable
        v-else
        :value="paginatedRows"
        data-key="id"
        size="small"
        scrollable
        scroll-height="flex"
        row-hover
        responsive-layout="scroll"
        class="flex-1 min-h-0 functional-table"
        :table-props="{ 'aria-label': 'Clientes' }"
      >
        <template #empty>
          <div class="flex flex-col items-center gap-3 py-16" style="color: var(--fg-subtle);">
            <i class="pi pi-users text-4xl opacity-40" />
            <p class="m-0 text-sm">
              {{
                hasActiveFilters
                  ? 'Sin resultados con los filtros aplicados'
                  : listScope === 'active'
                    ? 'No hay clientes activos'
                    : 'No hay clientes archivados'
              }}
            </p>
            <Button
              v-if="hasActiveFilters"
              label="Limpiar filtros"
              icon="pi pi-filter-slash"
              variant="text"
              severity="secondary"
              size="small"
              @click="clearFilters"
            />
          </div>
        </template>

        <!-- Cliente column (avatar + name + email) -->
        <Column header="Cliente" style="min-width: 260px;">
          <template #body="{ data }">
            <div class="flex items-center gap-3 min-w-0">
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                :style="{ background: avatarColor(data.id), color: '#fff' }"
              >
                {{ data.name.split(' ').slice(0, 2).map((s: string) => s[0]).join('').toUpperCase() }}
              </div>
              <div class="flex flex-col min-w-0">
                <span class="text-sm font-semibold truncate" style="color: var(--fg-default);">
                  {{ data.name }}
                </span>
                <span class="text-xs truncate" style="color: var(--fg-subtle);">
                  <span class="font-mono-num">{{ data.document }}</span>
                  <span v-if="data.email"> · {{ data.email }}</span>
                </span>
              </div>
            </div>
          </template>
        </Column>

        <!-- Tipo -->
        <Column header="Tipo" style="width: 120px;">
          <template #body="{ data }">
            <span
              class="cockpit-chip"
              :class="data.type === 'juridica' ? 'cockpit-chip--info' : 'cockpit-chip--secondary'"
            >
              {{ clientTypeLabel[data.type as ClientType] }}
            </span>
          </template>
        </Column>

        <!-- Estado -->
        <Column header="Estado" style="width: 130px;">
          <template #body="{ data }">
            <Tag
              :value="clientStatusLabel[data.status as ClientStatus]"
              :severity="clientStatusSeverity[data.status as ClientStatus]"
            />
          </template>
        </Column>

        <!-- Asignado + actividad -->
        <Column header="Asignado" style="width: 160px;">
          <template #body="{ data }">
            <div class="flex flex-col gap-0.5 min-w-0">
              <span v-if="data.assigneeId" class="flex items-center gap-1.5 text-xs truncate" style="color: var(--fg-default);">
                <span class="inline-block h-1.5 w-1.5 rounded-full" :style="{ background: avatarColor(data.assigneeId) }" />
                {{ getClientUser(data.assigneeId)?.name }}
              </span>
              <span v-else class="text-xs italic" style="color: var(--fg-subtle);">Sin asignar</span>
              <span class="text-[10px] tabular-nums" style="color: var(--fg-subtle);">
                {{ relativeTime(data.lastActivityAt) }}
                <template v-if="data.matterCount > 0"> · {{ data.matterCount }} expediente{{ data.matterCount !== 1 ? 's' : '' }}</template>
              </span>
            </div>
          </template>
        </Column>

        <!-- Acciones -->
        <Column header="Acciones" :style="{ width: '160px', textAlign: 'center' }">
          <template #body="{ data }">
            <div class="row-actions" role="group" aria-label="Acciones del cliente">
              <Button
                icon="pi pi-pencil"
                variant="outlined"
                rounded
                size="small"
                severity="secondary"
                aria-label="Editar"
                v-tooltip.top="'Editar'"
                @click="openEdit(data)"
              />
              <Button
                v-if="listScope === 'active'"
                icon="pi pi-inbox"
                variant="outlined"
                rounded
                size="small"
                severity="warn"
                aria-label="Archivar"
                v-tooltip.top="'Archivar'"
                @click="requestArchive(data)"
              />
              <Button
                v-if="listScope === 'archived'"
                icon="pi pi-replay"
                variant="outlined"
                rounded
                size="small"
                severity="success"
                aria-label="Reactivar"
                v-tooltip.top="'Reactivar'"
                @click="requestReactivate(data)"
              />
              <Button
                icon="pi pi-trash"
                variant="outlined"
                rounded
                size="small"
                severity="danger"
                :aria-label="listScope === 'active' ? 'Mover a archivados' : 'Eliminar permanentemente'"
                v-tooltip.top="listScope === 'active' ? 'Archivar' : 'Eliminar permanentemente'"
                @click="requestDelete(data)"
              />
            </div>
          </template>
        </Column>
      </DataTable>

      <!-- Paginator (siempre visible cuando hay registros) -->
      <div
        v-if="!loading && totalRecords > 0"
        style="border-top: 1px solid var(--surface-border); background: var(--surface-raised);"
      >
        <Paginator
          :rows="pageSize"
          :total-records="totalRecords"
          :rows-per-page-options="[5, 10, 25]"
          :first="(currentPage - 1) * pageSize"
          current-page-report-template="{first}–{last} de {totalRecords} clientes"
          template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
          @page="onPageChange"
        />
      </div>
    </div>

    <!-- ================================================================ -->
    <!-- FORM DIALOG (create / edit unified)                              -->
    <!-- ================================================================ -->
    <Dialog
      v-model:visible="showFormDialog"
      :modal="true"
      :draggable="false"
      :dismissable-mask="!formLoading && !formIsDirty"
      :closable="false"
      :close-on-escape="!formLoading"
      :style="{ width: 'min(560px, 96vw)' }"
      :pt="{
        mask: { class: 'alega-confirm-mask' },
        root: { class: 'matter-dialog-root !border-0 !bg-transparent !p-0 !m-0 !shadow-none overflow-visible' },
      }"
    >
      <template #container>
        <div class="matter-dialog-shell">
          <header class="matter-dialog-header">
            <div class="flex items-start gap-3">
              <div class="matter-dialog-icon">
                <i :class="formMode === 'create' ? 'pi pi-user-plus' : 'pi pi-pencil'" class="text-xl" style="color: var(--brand-zafiro);" />
              </div>
              <div class="flex flex-col gap-0.5 min-w-0">
                <span class="matter-dialog-eyebrow">
                  {{ formMode === 'create' ? 'Nuevo cliente' : 'Editar cliente' }}
                </span>
                <h2 class="matter-dialog-title">
                  {{ formMode === 'create' ? 'Crear cliente' : editTarget?.name }}
                </h2>
                <p
                  v-if="formIsDirty && formMode === 'edit'"
                  class="matter-dialog-stephint flex items-center gap-1.5"
                  style="color: #d97706;"
                >
                  <span class="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Cambios sin guardar
                </p>
              </div>
            </div>
            <button
              v-if="!formLoading"
              type="button"
              class="dialog-close-btn"
              aria-label="Cerrar"
              @click="attemptCloseForm"
            >
              <i class="pi pi-times text-sm" />
            </button>
          </header>

          <div class="matter-dialog-body">
            <section class="matter-form-section">
              <h3 class="matter-form-section__title">Identidad</h3>

              <div class="grid sm:grid-cols-2 gap-3">
                <div class="flex flex-col gap-1">
                  <label for="cl-type" class="matter-field-label">Tipo</label>
                  <Dropdown
                    id="cl-type"
                    v-model="form.type"
                    :options="CLIENT_TYPE_OPTIONS"
                    option-label="label"
                    option-value="value"
                    :disabled="formLoading"
                    class="w-full"
                  />
                </div>
                <div class="flex flex-col gap-1">
                  <label for="cl-doc" class="matter-field-label">
                    Documento <span class="matter-field-required">*</span>
                  </label>
                  <InputText
                    id="cl-doc"
                    v-model="form.document"
                    :placeholder="form.type === 'natural' ? '12345678 (DNI)' : '20512345678 (RUC)'"
                    :invalid="!!formErrors.document"
                    :disabled="formLoading"
                    autocomplete="off"
                    class="font-mono-num"
                    @input="formErrors.document = ''"
                  />
                  <small v-if="formErrors.document" class="matter-field-error">
                    {{ formErrors.document }}
                  </small>
                </div>
              </div>

              <div class="flex flex-col gap-1">
                <label for="cl-name" class="matter-field-label">
                  {{ form.type === 'natural' ? 'Nombre completo' : 'Razón social' }}
                  <span class="matter-field-required">*</span>
                </label>
                <InputText
                  id="cl-name"
                  v-model="form.name"
                  :placeholder="form.type === 'natural' ? 'Ej. María Gómez Pérez' : 'Ej. Constructora Andina S.A.C.'"
                  :invalid="!!formErrors.name"
                  :disabled="formLoading"
                  autocomplete="off"
                  @input="formErrors.name = ''"
                />
                <small v-if="formErrors.name" class="matter-field-error">{{ formErrors.name }}</small>
              </div>
            </section>

            <section class="matter-form-section" style="border-top: 1px dashed var(--surface-border); margin-top: 1rem; padding-top: 1rem;">
              <h3 class="matter-form-section__title">Contacto</h3>

              <div class="grid sm:grid-cols-2 gap-3">
                <div class="flex flex-col gap-1">
                  <label for="cl-email" class="matter-field-label">Email</label>
                  <InputText
                    id="cl-email"
                    v-model="form.email"
                    type="email"
                    placeholder="contacto@ejemplo.com"
                    :invalid="!!formErrors.email"
                    :disabled="formLoading"
                    autocomplete="off"
                    @input="formErrors.email = ''"
                  />
                  <small v-if="formErrors.email" class="matter-field-error">{{ formErrors.email }}</small>
                </div>
                <div class="flex flex-col gap-1">
                  <label for="cl-phone" class="matter-field-label">Teléfono</label>
                  <InputText
                    id="cl-phone"
                    v-model="form.phone"
                    placeholder="+51 999 999 999"
                    :disabled="formLoading"
                    autocomplete="off"
                  />
                </div>
              </div>
            </section>

            <section class="matter-form-section" style="border-top: 1px dashed var(--surface-border); margin-top: 1rem; padding-top: 1rem;">
              <h3 class="matter-form-section__title">Asignación</h3>

              <div class="grid sm:grid-cols-2 gap-3">
                <div class="flex flex-col gap-1">
                  <label for="cl-assignee" class="matter-field-label">Responsable</label>
                  <Dropdown
                    id="cl-assignee"
                    v-model="form.assigneeId"
                    :options="MOCK_CLIENT_USERS"
                    option-label="name"
                    option-value="id"
                    placeholder="Sin asignar"
                    show-clear
                    :disabled="formLoading"
                    class="w-full"
                  />
                </div>
                <div class="flex flex-col gap-1">
                  <label for="cl-status" class="matter-field-label">Estado</label>
                  <Dropdown
                    id="cl-status"
                    v-model="form.status"
                    :options="statusOptions"
                    option-label="label"
                    option-value="value"
                    :disabled="formLoading"
                    class="w-full"
                  />
                </div>
              </div>
            </section>
          </div>

          <footer class="matter-dialog-footer">
            <Button
              type="button"
              label="Cancelar"
              text
              :disabled="formLoading"
              @click="attemptCloseForm"
            />
            <Button
              type="button"
              :label="formMode === 'create' ? 'Crear cliente' : 'Guardar'"
              icon="pi pi-check"
              :loading="formLoading"
              :disabled="!formCanSubmit || formLoading"
              @click="submitForm"
            />
          </footer>
        </div>
      </template>
    </Dialog>

  </div>
</template>

<style scoped>
/* -----------------------------------------------------------------------
   Functional table card (constrain height — internal scroll)
----------------------------------------------------------------------- */
.table-card {
  max-height: calc(100vh - 240px);
  min-height: 400px;
}

/* -----------------------------------------------------------------------
   Scope tabs
----------------------------------------------------------------------- */
:deep(.scope-tabs .p-selectbutton-option) {
  padding: 0.375rem 1rem;
  font-size: 0.8125rem;
  font-weight: 500;
}

/* -----------------------------------------------------------------------
   Toolbar — dropdowns + 'A mí' pill
----------------------------------------------------------------------- */
:deep(.toolbar-dropdown.p-select),
:deep(.toolbar-dropdown.p-dropdown) {
  min-width: 160px;
  max-width: 200px;
}

.cockpit-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.75rem;
  border-radius: 9999px;
  border: 1px solid var(--surface-border);
  background: var(--surface-raised);
  color: var(--fg-muted);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.cockpit-pill:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.cockpit-pill--active {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
}

/* -----------------------------------------------------------------------
   DataTable density tuning
----------------------------------------------------------------------- */
:deep(.functional-table .p-datatable-thead > tr > th) {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--fg-muted);
  background: var(--surface-sunken);
}

/* -----------------------------------------------------------------------
   Unified pill chip system (matches cockpit chip pattern)
----------------------------------------------------------------------- */
.cockpit-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  height: 1.25rem;
  padding: 0 0.5rem;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  line-height: 1;
  white-space: nowrap;
}

.cockpit-chip--info {
  background: color-mix(in srgb, #2563eb 14%, var(--surface-raised));
  color: #1d4ed8;
}
html.dark .cockpit-chip--info {
  background: color-mix(in srgb, #2563eb 28%, transparent);
  color: #93c5fd;
}

.cockpit-chip--secondary {
  background: var(--surface-sunken);
  color: var(--fg-muted);
}

/* -----------------------------------------------------------------------
   Row actions (outlined+rounded buttons with proper gap)
----------------------------------------------------------------------- */
:deep(.row-actions) {
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  gap: 0.5rem !important;
}
:deep(.row-actions .p-button) {
  width: 2.25rem !important;
  height: 2.25rem !important;
  padding: 0 !important;
}
:deep(.row-actions .p-button-icon) {
  font-size: 0.875rem;
}

/* -----------------------------------------------------------------------
   Dialog shell (same canonical pattern as Dialog sandbox)
----------------------------------------------------------------------- */
:deep(.matter-dialog-root.p-dialog) {
  padding: 0 !important;
  margin: 0 !important;
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
  overflow: visible !important;
}
.matter-dialog-shell {
  width: 100%;
  max-height: min(88vh, 720px);
  border-radius: 16px;
  border: 1px solid var(--surface-border);
  background: var(--surface-raised);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.matter-dialog-header {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.5rem 1rem;
  border-bottom: 1px solid var(--surface-border);
  flex-shrink: 0;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--brand-zafiro) 7%, transparent),
    transparent 90%
  );
}
html.dark .matter-dialog-header {
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--accent) 18%, transparent),
    transparent 90%
  );
}
.matter-dialog-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--brand-zafiro) 22%, var(--surface-border));
  background: color-mix(in srgb, var(--brand-zafiro) 8%, var(--surface-raised));
  flex-shrink: 0;
}
.matter-dialog-eyebrow {
  display: block;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--brand-zafiro);
}
html.dark .matter-dialog-eyebrow {
  color: var(--accent);
}
.matter-dialog-title {
  font-size: 1.0625rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--fg-default);
  margin: 0;
}
.matter-dialog-stephint {
  font-size: 0.8125rem;
  color: var(--fg-muted);
  margin: 0;
}
.dialog-close-btn {
  flex-shrink: 0;
  height: 2rem;
  width: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  color: var(--fg-muted);
  background: none;
  border: none;
  cursor: pointer;
  transition: background-color 120ms ease;
}
.dialog-close-btn:hover {
  background: var(--surface-sunken);
}
.matter-dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem 1.5rem;
}
.matter-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--surface-border);
  background: var(--surface-sunken);
  flex-shrink: 0;
}
.matter-form-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.matter-form-section__title {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--fg-subtle);
  margin: 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px dashed var(--surface-border);
}
.matter-field-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--fg-default);
}
.matter-field-error {
  font-size: 0.75rem;
  color: #dc2626;
}
html.dark .matter-field-error {
  color: #fca5a5;
}
.matter-field-required {
  color: #dc2626;
}
.font-mono-num {
  font-feature-settings: 'tnum' 1, 'lnum' 1;
}
</style>
