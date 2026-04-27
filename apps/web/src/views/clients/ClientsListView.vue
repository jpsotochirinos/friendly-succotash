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
      <ConfirmDialogBase
        v-model:visible="showDeleteConfirm"
        variant="danger"
        :title="t('clients.deleteTitle')"
        :subject="deleteTarget?.name ?? ''"
        :message="t('clients.deleteMessage')"
        :consequences-title="t('common.consequencesTitle')"
        :consequences="deleteConsequences"
        :typed-confirm-phrase="t('clients.deleteTypedPhrase')"
        :typed-confirm-hint="t('clients.deleteTypedHint')"
        :typed-confirm-label="t('common.typedConfirmLabel')"
        :confirm-label="t('clients.deleteConfirmButton')"
        :cancel-label="t('common.cancel')"
        :loading="deleting"
        @hide="onDeleteConfirmHide"
        @confirm="onDeleteConfirm"
      />

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

      <!-- KPI informativo (total catálogo): misma animación / hover que expedientes -->
      <div
        class="clients-kpi-wrap grid grid-cols-1 gap-3 sm:max-w-md"
        role="region"
        :aria-label="t('clients.kpiTotalAria')"
      >
        <div
          class="exp-kpi-card exp-kpi-card--idle group relative min-h-[5.75rem] overflow-hidden rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-4 text-left shadow-sm transition-[box-shadow,border-color,transform] duration-200 outline-offset-4 exp-kpi-card--total-bar hover:border-[color-mix(in_srgb,var(--kpi-accent)_22%,var(--surface-border))] hover:outline hover:outline-1 hover:outline-[color-mix(in_srgb,var(--kpi-accent)_35%,transparent)]"
          :style="{
            '--stagger-delay': '0ms',
            '--kpi-accent': '#2D3FBF',
            '--kpi-mesh-1': 'color-mix(in srgb, #2D3FBF 22%, transparent)',
          }"
        >
          <div class="exp-kpi-mesh pointer-events-none absolute inset-0 opacity-100" />
          <div class="exp-kpi-grain pointer-events-none absolute inset-0" aria-hidden="true" />
          <div class="relative flex min-h-[4.75rem] items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <p
                class="exp-kpi-label m-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--fg-muted)]"
              >
                {{ t('clients.kpiTotalLabel') }}
              </p>
              <p
                class="exp-kpi-number m-0 mt-2 text-3xl font-semibold tabular-nums tracking-tight text-[var(--brand-medianoche)] dark:text-[var(--brand-hielo)] sm:text-[2.125rem]"
                style="font-feature-settings: 'tnum' 1, 'lnum' 1"
              >
                {{ totalRecords }}
              </p>
            </div>
            <span
              class="exp-kpi-icon-wrap inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm"
              aria-hidden="true"
            >
              <i class="pi pi-users text-sm" />
            </span>
          </div>
        </div>
      </div>

      <div
        class="app-card clients-cockpit-card flex max-h-[min(82vh,calc(100dvh-11rem))] min-h-0 flex-col overflow-hidden shadow-sm"
      >
        <div
          class="clients-command-toolbar flex flex-shrink-0 flex-col gap-3 border-b border-[var(--surface-border)] bg-[var(--surface-raised)] px-4 py-2.5 sm:flex-row sm:items-center sm:gap-5 sm:px-5 sm:py-3"
          role="toolbar"
          :aria-label="t('clients.toolbarCommandBarAria')"
        >
          <IconField ref="searchFieldRef" class="toolbar-iconfield min-w-0 flex-1">
            <InputIcon class="pi pi-search text-[var(--fg-subtle)]" />
            <InputText
              v-model="filters.search"
              :placeholder="t('clients.searchPlaceholder')"
              class="toolbar-search w-full min-w-0 rounded-xl"
              :aria-label="t('common.search')"
              autocomplete="off"
              @input="debouncedLoad"
            />
          </IconField>
          <div
            class="flex min-w-0 shrink-0 items-center gap-2 border-t border-[var(--surface-border)] pt-3 text-sm tabular-nums text-[var(--fg-default)] sm:border-t-0 sm:pt-0 md:border-l md:border-t-0 md:pl-5"
            aria-live="polite"
            aria-atomic="true"
          >
            <span>{{ t('clients.toolbarResults', { n: totalRecords }) }}</span>
          </div>
        </div>

        <div
          v-if="clientsShowSkeleton"
          class="clients-skeleton-shell flex-1 min-h-[420px] overflow-x-auto overscroll-x-contain"
          :aria-label="t('clients.loadingTable')"
        >
          <div class="min-w-[760px]">
            <div
              class="grid grid-cols-[minmax(220px,1.6fr)_minmax(140px,1fr)_minmax(120px,0.9fr)_minmax(120px,0.9fr)_minmax(7.5rem,0.6fr)] gap-4 border-b border-[var(--surface-border)] px-4 py-3"
            >
              <Skeleton v-for="col in 5" :key="`cl-head-${col}`" height="0.75rem" />
            </div>
            <div
              v-for="row in 8"
              :key="`cl-sk-${row}`"
              class="grid grid-cols-[minmax(220px,1.6fr)_minmax(140px,1fr)_minmax(120px,0.9fr)_minmax(120px,0.9fr)_minmax(7.5rem,0.6fr)] items-center gap-4 border-b border-[var(--surface-border)] px-4 py-4 last:border-0"
            >
              <div class="flex min-w-0 items-center gap-3">
                <Skeleton shape="circle" size="2.25rem" />
                <div class="flex min-w-0 flex-1 flex-col gap-2">
                  <Skeleton height="0.9rem" width="80%" />
                  <Skeleton height="0.7rem" width="55%" />
                </div>
              </div>
              <Skeleton height="0.8rem" width="85%" />
              <Skeleton height="0.8rem" width="70%" />
              <Skeleton height="0.8rem" width="60%" />
              <div class="flex justify-center gap-2">
                <Skeleton shape="circle" size="2.25rem" />
                <Skeleton shape="circle" size="2.25rem" />
              </div>
            </div>
          </div>
        </div>

        <div v-else class="clients-dt-region relative flex min-h-0 flex-1 flex-col">
          <DataTable
            class="clients-data-table min-h-0 flex-1"
            :value="clients"
            :loading="false"
            data-key="id"
            size="small"
            scrollable
            scroll-height="flex"
            row-hover
            responsive-layout="scroll"
            :table-props="{ 'aria-label': t('clients.tableAriaLabel') }"
          >
            <template #empty>
              <div
                v-if="!loading"
                class="flex flex-col items-center justify-center gap-2 py-16 text-center"
              >
                <i class="pi pi-users text-4xl text-[var(--fg-subtle)]" aria-hidden="true" />
                <p class="m-0 text-base font-medium text-[var(--fg-default)]">
                  {{
                    filters.search.trim()
                      ? t('clients.tableEmptyTitle')
                      : t('clients.tableEmptyZeroTitle')
                  }}
                </p>
                <p class="m-0 max-w-sm text-sm text-[var(--fg-muted)]">
                  {{
                    filters.search.trim()
                      ? t('clients.tableEmptySubtitle')
                      : t('clients.tableEmptyZeroSubtitle')
                  }}
                </p>
              </div>
            </template>

            <Column field="name" :header="t('clients.name')">
              <template #body="{ data }">
                <div class="client-title-cell flex min-w-0 items-start gap-3 py-1">
                  <span
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--surface-border)] bg-[var(--accent-soft)] text-[var(--accent)]"
                    aria-hidden="true"
                  >
                    <i class="pi pi-user text-lg" />
                  </span>
                  <div class="flex min-w-0 flex-col gap-0.5">
                    <span class="line-clamp-2 font-semibold leading-snug text-[var(--fg-default)]">
                      {{ data.name }}
                    </span>
                    <p class="m-0 line-clamp-1 text-xs text-[var(--fg-subtle)]">
                      {{ clientMetaLine(data) }}
                    </p>
                  </div>
                </div>
              </template>
            </Column>
            <Column field="email" :header="t('clients.email')">
              <template #body="{ data }">
                <span class="text-sm text-[var(--fg-muted)]">{{ data.email?.trim() || t('clients.valueEmpty') }}</span>
              </template>
            </Column>
            <Column field="phone" :header="t('clients.phone')">
              <template #body="{ data }">
                <span class="text-sm text-[var(--fg-muted)]">{{ data.phone?.trim() || t('clients.valueEmpty') }}</span>
              </template>
            </Column>
            <Column field="documentId" :header="t('clients.documentId')">
              <template #body="{ data }">
                <span class="text-sm text-[var(--fg-muted)] tabular-nums">{{
                  data.documentId?.trim() || t('clients.valueEmpty')
                }}</span>
              </template>
            </Column>
            <Column
              v-if="rowHasClientActions"
              :header="t('common.actions')"
              header-class="client-actions-header"
              body-class="client-actions-cell"
              class="w-0 min-w-[7.5rem] whitespace-nowrap"
            >
              <template #body="{ data }">
                <div class="matters-row-actions" role="group" :aria-label="t('common.actions')">
                  <Button
                    v-if="canTrackableUpdate"
                    type="button"
                    icon="pi pi-pencil"
                    variant="outlined"
                    rounded
                    size="small"
                    severity="secondary"
                    class="matter-action matter-action--edit"
                    :aria-label="t('common.edit')"
                    v-tooltip.top="t('common.edit')"
                    @click="openEdit(data)"
                  />
                  <Button
                    v-if="canTrackableDelete"
                    type="button"
                    icon="pi pi-trash"
                    variant="outlined"
                    rounded
                    size="small"
                    severity="danger"
                    class="matter-action matter-action--danger"
                    :aria-label="t('common.delete')"
                    v-tooltip.top="t('common.delete')"
                    @click="openDeleteDialog(data)"
                  />
                </div>
              </template>
            </Column>
          </DataTable>
        </div>

        <div
          v-if="!clientsShowSkeleton && totalRecords > 0"
          class="flex-shrink-0 border-t border-[var(--surface-border)] bg-[var(--surface-raised)] px-4 py-3 sm:px-5"
        >
          <Paginator
            :first="first"
            :rows="rows"
            :total-records="totalRecords"
            :rows-per-page-options="[10, 20, 50]"
            :current-page-report-template="t('clients.tablePageReport')"
            template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
            @page="onPaginatorPage"
          />
        </div>
      </div>

      <Dialog
        v-model:visible="dialogVisible"
        :modal="true"
        :draggable="false"
        :dismissable-mask="!saving && !formDialogBlockedByDirty"
        :closable="false"
        :close-on-escape="!saving && !formDialogBlockedByDirty"
        :style="{ width: 'min(520px, 96vw)' }"
        :pt="{
          mask: { class: 'alega-confirm-mask' },
          root: {
            class:
              'matter-dialog-root !border-0 !bg-transparent !p-0 !m-0 !shadow-none overflow-visible',
          },
        }"
        @hide="onFormDialogHide"
      >
        <template #container>
          <div class="matter-dialog-shell matter-dialog-shell--client max-h-[min(88vh,720px)]">
            <header class="matter-dialog-header flex flex-col gap-2 border-b border-[var(--surface-border)] px-5 py-4">
              <div class="flex items-start justify-between gap-3">
                <div class="flex min-w-0 items-start gap-3">
                  <div class="matter-dialog-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                    <i class="pi pi-user text-xl text-[var(--brand-zafiro)] dark:text-[var(--accent)]" />
                  </div>
                  <div class="flex min-w-0 flex-col gap-0.5">
                    <span class="matter-dialog-eyebrow text-brand-gradient">
                      {{ t('clients.formEyebrow') }}
                    </span>
                    <h2 class="matter-dialog-title text-lg font-semibold leading-tight text-[var(--fg-default)]">
                      {{ editingId ? t('clients.formEditTitle') : t('clients.formNewTitle') }}
                    </h2>
                    <p class="m-0 text-[0.8125rem] text-[var(--fg-muted)]">
                      {{ editingId ? t('clients.formEditHint') : t('clients.formNewHint') }}
                    </p>
                    <p v-if="editingId && editIsDirty" class="m-0 text-[0.8125rem] text-amber-700 dark:text-amber-300">
                      · {{ t('clients.formDirtyHint') }}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  icon="pi pi-times"
                  text
                  rounded
                  size="small"
                  :disabled="saving"
                  :aria-label="t('common.cancel')"
                  class="shrink-0"
                  @click="attemptCloseFormDialog"
                />
              </div>
            </header>

            <form
              class="matter-dialog-body flex max-h-[min(52vh,420px)] flex-col gap-0 overflow-y-auto px-5 py-4"
              novalidate
              @submit.prevent="onFormSubmit"
              @keydown="onFormKeydown"
            >
              <section class="matter-form-section">
                <h3 class="matter-form-section__title">
                  <span class="matter-form-section__title-text text-brand-gradient">{{ t('clients.sectionContact') }}</span>
                </h3>
                <div class="flex flex-col gap-4">
                  <div class="flex flex-col gap-1">
                    <label for="client-form-name" class="matter-field-label text-[0.8125rem] font-medium text-[var(--fg-default)]">
                      {{ t('clients.name') }}
                      <span class="text-red-600 dark:text-red-400">*</span>
                    </label>
                    <InputText
                      id="client-form-name"
                      ref="firstFieldRef"
                      v-model="form.name"
                      :placeholder="t('clients.fieldNamePlaceholder')"
                      :invalid="!!errors.name"
                      :disabled="saving"
                      autocomplete="organization"
                      @blur="validateField('name')"
                      @input="errors.name = ''"
                    />
                    <small v-if="errors.name" class="matter-field-error text-xs text-red-600 dark:text-red-300">{{
                      errors.name
                    }}</small>
                    <small v-else class="matter-field-help text-xs text-[var(--fg-subtle)]">{{
                      t('clients.fieldNameHelp')
                    }}</small>
                  </div>
                  <div class="flex flex-col gap-1">
                    <label for="client-form-email" class="matter-field-label text-[0.8125rem] font-medium text-[var(--fg-default)]">{{
                      t('clients.email')
                    }}</label>
                    <InputText
                      id="client-form-email"
                      v-model="form.email"
                      type="email"
                      :placeholder="t('clients.fieldEmailPlaceholder')"
                      :disabled="saving"
                      autocomplete="email"
                    />
                    <small class="matter-field-help text-xs text-[var(--fg-subtle)]">{{ t('clients.fieldEmailHelp') }}</small>
                  </div>
                  <div class="flex flex-col gap-1">
                    <label for="client-form-phone" class="matter-field-label text-[0.8125rem] font-medium text-[var(--fg-default)]">{{
                      t('clients.phone')
                    }}</label>
                    <InputText
                      id="client-form-phone"
                      v-model="form.phone"
                      :placeholder="t('clients.fieldPhonePlaceholder')"
                      :disabled="saving"
                      autocomplete="tel"
                    />
                    <small class="matter-field-help text-xs text-[var(--fg-subtle)]">{{ t('clients.fieldPhoneHelp') }}</small>
                  </div>
                  <div class="flex flex-col gap-1">
                    <label for="client-form-doc" class="matter-field-label text-[0.8125rem] font-medium text-[var(--fg-default)]">{{
                      t('clients.documentId')
                    }}</label>
                    <InputText
                      id="client-form-doc"
                      v-model="form.documentId"
                      :placeholder="t('clients.fieldDocumentPlaceholder')"
                      :disabled="saving"
                    />
                    <small class="matter-field-help text-xs text-[var(--fg-subtle)]">{{ t('clients.fieldDocumentHelp') }}</small>
                  </div>
                  <div class="flex flex-col gap-1">
                    <label for="client-form-notes" class="matter-field-label text-[0.8125rem] font-medium text-[var(--fg-default)]">{{
                      t('clients.notes')
                    }}</label>
                    <Textarea
                      id="client-form-notes"
                      v-model="form.notes"
                      rows="3"
                      class="w-full"
                      :placeholder="t('clients.fieldNotesPlaceholder')"
                      :disabled="saving"
                    />
                    <small class="matter-field-help text-xs text-[var(--fg-subtle)]">{{ t('clients.fieldNotesHelp') }}</small>
                  </div>
                </div>
              </section>
            </form>

            <footer
              class="matter-dialog-footer flex flex-wrap items-center justify-end gap-2 border-t border-[var(--surface-border)] bg-[color-mix(in_srgb,var(--surface-raised)_92%,var(--surface-page))] px-5 py-3"
            >
              <Button type="button" :label="t('common.cancel')" text :disabled="saving" @click="attemptCloseFormDialog" />
              <Button
                type="button"
                :label="primaryFormLabel"
                icon="pi pi-check"
                :loading="saving"
                :disabled="!canSubmitForm"
                @click="onFormSubmit"
              />
            </footer>
          </div>
        </template>
      </Dialog>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import ProgressSpinner from 'primevue/progressspinner';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputIcon from 'primevue/inputicon';
import IconField from 'primevue/iconfield';
import Dialog from 'primevue/dialog';
import Textarea from 'primevue/textarea';
import Skeleton from 'primevue/skeleton';
import Paginator from 'primevue/paginator';
import { useToast } from 'primevue/usetoast';
import { useI18n } from 'vue-i18n';
import { apiClient } from '@/api/client';
import { usePermissions } from '@/composables/usePermissions';
import { useAuthStore } from '@/stores/auth.store';
import PageHeader from '@/components/common/PageHeader.vue';
import ConfirmDialogBase from '@/components/common/ConfirmDialogBase.vue';

const { t } = useI18n();
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

const clientsShowSkeleton = computed(() => loading.value);

const searchFieldRef = ref<InstanceType<typeof IconField> | null>(null);
const firstFieldRef = ref<InstanceType<typeof InputText> | null>(null);

let searchDebounce: ReturnType<typeof setTimeout> | null = null;
function debouncedLoad() {
  if (searchDebounce) clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    first.value = 0;
    loadClients(1);
  }, 320);
}

function focusSearch() {
  const root = (searchFieldRef.value as unknown as { $el?: HTMLElement } | null)?.$el;
  const input = root?.querySelector('input');
  input?.focus();
}

function onGlobalSearchHotkey(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement | null)?.isContentEditable) return;
  if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault();
    focusSearch();
  }
}

onMounted(() => window.addEventListener('keydown', onGlobalSearchHotkey));
onUnmounted(() => window.removeEventListener('keydown', onGlobalSearchHotkey));

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

const editSnapshot = ref('');
const editIsDirty = computed(() => {
  if (!editingId.value) return false;
  return JSON.stringify(form.value) !== editSnapshot.value;
});

const formDialogBlockedByDirty = computed(() => editingId.value != null && editIsDirty.value);

const errors = ref({ name: '' });

function validateField(field: 'name') {
  if (field === 'name' && !form.value.name?.trim()) {
    errors.value.name = t('clients.fieldNameRequired');
  }
}

const canSubmitForm = computed(() => {
  const nameOk = !!form.value.name?.trim();
  if (!editingId.value) return nameOk;
  return nameOk && editIsDirty.value;
});

const primaryFormLabel = computed(() => (editingId.value ? t('common.save') : t('common.create')));

function resetForm() {
  form.value = { name: '', email: '', phone: '', documentId: '', notes: '' };
  editingId.value = null;
  errors.value = { name: '' };
  editSnapshot.value = '';
}

function openCreate() {
  if (!canTrackableCreate.value) return;
  resetForm();
  dialogVisible.value = true;
  void nextTick(() => {
    const el = firstFieldRef.value as unknown as { $el?: HTMLElement } | undefined;
    el?.$el?.querySelector?.('input')?.focus?.();
  });
}

function openEdit(row: ClientRow) {
  if (!canTrackableUpdate.value) return;
  editingId.value = row.id;
  errors.value = { name: '' };
  form.value = {
    name: row.name,
    email: row.email || '',
    phone: row.phone || '',
    documentId: row.documentId || '',
    notes: row.notes || '',
  };
  dialogVisible.value = true;
  void nextTick(() => {
    editSnapshot.value = JSON.stringify(form.value);
    const el = firstFieldRef.value as unknown as { $el?: HTMLElement } | undefined;
    el?.$el?.querySelector?.('input')?.focus?.();
  });
}

function attemptCloseFormDialog() {
  if (saving.value) return;
  if (formDialogBlockedByDirty.value && !window.confirm(t('common.discardChangesConfirm'))) return;
  dialogVisible.value = false;
}

function onFormDialogHide() {
  if (saving.value) return;
  resetForm();
}

function onFormKeydown(e: KeyboardEvent) {
  if (e.key !== 'Enter' || (e.target as HTMLElement)?.tagName?.toLowerCase() === 'textarea') return;
  if (!canSubmitForm.value || saving.value) return;
  e.preventDefault();
  void saveClient();
}

function onFormSubmit() {
  validateField('name');
  if (errors.value.name) return;
  void saveClient();
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

function onPaginatorPage(event: { first: number; rows: number }) {
  first.value = event.first;
  rows.value = event.rows;
  loadClients(Math.floor(event.first / event.rows) + 1);
}

async function saveClient() {
  const name = form.value.name.trim();
  if (!name) {
    errors.value.name = t('clients.fieldNameRequired');
    return;
  }
  if (editingId.value && !canSubmitForm.value) return;
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

function clientMetaLine(row: ClientRow): string {
  const phone = row.phone?.trim();
  const doc = row.documentId?.trim();
  if (phone) return phone;
  if (doc) return doc;
  return t('clients.metaNone');
}

const showDeleteConfirm = ref(false);
const deleteTarget = ref<ClientRow | null>(null);
const deleting = ref(false);

const deleteConsequences = computed(() => [
  t('clients.deleteConsequence1'),
  t('clients.deleteConsequence2'),
]);

function openDeleteDialog(row: ClientRow) {
  if (!canTrackableDelete.value) return;
  deleteTarget.value = row;
  showDeleteConfirm.value = true;
}

function onDeleteConfirmHide() {
  deleteTarget.value = null;
}

async function onDeleteConfirm() {
  const row = deleteTarget.value;
  if (!row || !canTrackableDelete.value) return;
  deleting.value = true;
  try {
    await apiClient.delete(`/clients/${row.id}`);
    showDeleteConfirm.value = false;
    deleteTarget.value = null;
    toast.add({ severity: 'success', summary: t('clients.deleted'), life: 2200 });
    first.value = 0;
    await loadClients(1);
  } catch {
    toast.add({ severity: 'error', summary: t('clients.deleteError'), life: 4000 });
  } finally {
    deleting.value = false;
  }
}

watch(
  [authReady, canTrackableRead],
  ([ready, read]) => {
    if (ready && read) loadClients(1);
  },
  { immediate: true },
);
</script>

<style scoped>
.clients-command-toolbar {
  box-shadow: inset 0 -1px 0 color-mix(in srgb, var(--brand-zafiro) 6%, transparent);
}
.toolbar-iconfield {
  width: 100%;
}
.toolbar-iconfield :deep(.p-inputtext),
.toolbar-search :deep(.p-inputtext) {
  width: 100%;
  border-radius: 0.75rem;
}
/* Degradado de marca bajo el mesh (la tarjeta se leía muy plana solo con radiales suaves) */
.exp-kpi-brandwash {
  z-index: 0;
  opacity: 0.22;
  background: linear-gradient(
    125deg,
    color-mix(in srgb, var(--brand-zafiro) 55%, transparent) 0%,
    transparent 38%,
    color-mix(in srgb, #7c3aed 38%, transparent) 100%
  );
}
:global(html.dark) .clients-kpi-wrap .exp-kpi-brandwash {
  opacity: 0.35;
  background: linear-gradient(
    125deg,
    color-mix(in srgb, var(--brand-hielo) 42%, transparent) 0%,
    transparent 40%,
    color-mix(in srgb, #a78bfa 35%, transparent) 100%
  );
}
.exp-kpi-mesh {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    radial-gradient(120% 80% at 0% 0%, var(--kpi-mesh-1, transparent), transparent 60%),
    radial-gradient(120% 80% at 100% 100%, var(--kpi-mesh-2, transparent), transparent 60%);
  pointer-events: none;
}
.exp-kpi-grain {
  position: absolute;
  inset: 0;
  z-index: 2;
  opacity: 0.35;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.06'/></svg>");
  mix-blend-mode: overlay;
  pointer-events: none;
}
.exp-kpi-icon-wrap {
  border: 1px solid color-mix(in srgb, var(--kpi-accent) 24%, var(--surface-border));
  background: color-mix(in srgb, var(--kpi-accent) 10%, var(--surface-raised));
  color: var(--kpi-accent);
  box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 28%, transparent);
}
:global(.dark) .exp-kpi-icon-wrap {
  background: color-mix(in srgb, var(--kpi-accent) 18%, var(--surface-raised));
  box-shadow: none;
}
.clients-kpi-wrap .exp-kpi-card {
  cursor: default;
  animation: expKpiFadeSlideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--stagger-delay, 0ms);
}
.exp-kpi-card--total-bar {
  border-left: 3px solid color-mix(in srgb, #2d3fbf 85%, var(--surface-border));
}
@keyframes expKpiFadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
@media (hover: hover) and (prefers-reduced-motion: no-preference) {
  .clients-kpi-wrap .exp-kpi-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
}
@media (prefers-reduced-motion: reduce) {
  .clients-kpi-wrap .exp-kpi-card {
    animation: none !important;
  }
  .clients-kpi-wrap .exp-kpi-card:hover {
    transform: none !important;
  }
  .exp-kpi-grain {
    opacity: 0.12 !important;
  }
}
:deep(.client-actions-header) {
  text-align: center !important;
}
:deep(.client-actions-cell) {
  text-align: center !important;
  vertical-align: middle !important;
}
:deep(.matters-row-actions) {
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  gap: 0.5rem !important;
  column-gap: 1rem !important;
}
:deep(.matters-row-actions > *) {
  margin: 0 !important;
}
:deep(.matter-action.p-button) {
  width: 2.25rem !important;
  height: 2.25rem !important;
  padding: 0 !important;
}
:deep(.matter-action .p-button-icon) {
  font-size: 0.875rem;
}
.clients-dt-region :deep([data-pc-name='datatable']) {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
}
.clients-data-table {
  min-width: 760px;
}
.clients-data-table :deep([data-pc-section='thead'] > tr > th) {
  background: var(--surface-raised);
  border-bottom: 1px solid var(--surface-border);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--fg-muted);
}
:deep(.matter-dialog-root.p-dialog) {
  padding: 0 !important;
  margin: 0 !important;
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
  overflow: visible !important;
}
.matter-dialog-shell--client {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--brand-zafiro) 14%, var(--surface-border));
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  /* Degradado de marca en el panel (alineado con cabeceras tipo matter-edit / confirm) */
  background:
    linear-gradient(
      165deg,
      color-mix(in srgb, var(--brand-hielo) 16%, var(--surface-raised)) 0%,
      var(--surface-raised) 40%,
      color-mix(in srgb, var(--brand-zafiro) 7%, var(--surface-raised)) 100%
    ),
    var(--surface-raised);
}
.matter-dialog-shell--client::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  border-radius: inherit;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, #ffffff 26%, transparent) 0%,
    transparent 32%
  );
}
:global(html.dark) .matter-dialog-shell--client {
  border-color: color-mix(in srgb, var(--brand-hielo) 22%, var(--surface-border));
  background:
    linear-gradient(
      165deg,
      color-mix(in srgb, var(--brand-zafiro) 18%, var(--surface-raised)) 0%,
      var(--surface-raised) 48%,
      color-mix(in srgb, var(--brand-abismo) 35%, var(--surface-raised)) 100%
    ),
    var(--surface-raised);
}
:global(html.dark) .matter-dialog-shell--client::before {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--brand-hielo) 12%, transparent) 0%,
    transparent 36%
  );
}
.matter-dialog-shell--client .matter-dialog-header--client {
  position: relative;
  z-index: 1;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--brand-zafiro) 8%, var(--surface-raised)) 0%,
    color-mix(in srgb, var(--surface-raised) 88%, transparent) 100%
  );
}
:global(html.dark) .matter-dialog-shell--client .matter-dialog-header--client {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--brand-zafiro) 14%, var(--surface-raised)) 0%,
    transparent 100%
  );
}
.matter-dialog-shell--client .matter-dialog-body,
.matter-dialog-shell--client .matter-dialog-footer {
  position: relative;
  z-index: 1;
}
.matter-dialog-icon {
  border: 1px solid color-mix(in srgb, var(--brand-zafiro) 22%, var(--surface-border));
  background: color-mix(in srgb, var(--brand-zafiro) 8%, var(--surface-raised));
}
/*
 * Eyebrow: degradado explícito aquí (el Dialog va a body; a veces la utility global no gana
 * en especificidad frente a estilos del panel).
 */
.matter-dialog-shell--client .matter-dialog-eyebrow.text-brand-gradient {
  display: inline-block;
  max-width: 100%;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  background-image: linear-gradient(135deg, var(--brand-zafiro) 0%, var(--brand-real) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}
:global(html.dark) .matter-dialog-shell--client .matter-dialog-eyebrow.text-brand-gradient {
  background-image: linear-gradient(135deg, #e0e7ff 0%, #a5b4fc 45%, #818cf8 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}
.matter-form-section__title-text.text-brand-gradient {
  display: inline-block;
  max-width: 100%;
  background-image: linear-gradient(135deg, var(--brand-zafiro) 0%, var(--brand-real) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}
:global(html.dark) .matter-dialog-shell--client .matter-form-section__title-text.text-brand-gradient {
  background-image: linear-gradient(135deg, #e0e7ff 0%, #a5b4fc 50%, #818cf8 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}
.matter-form-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.matter-form-section__title {
  margin: 0 0 0.25rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px dashed var(--surface-border);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
</style>
