<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import SelectButton from 'primevue/selectbutton';
import Skeleton from 'primevue/skeleton';
import Dropdown from 'primevue/dropdown';
import { useToast } from 'primevue/usetoast';
import ConfirmDialogBase from '@/components/common/ConfirmDialogBase.vue';
import PageHeader from '@/components/common/PageHeader.vue';
import {
  useMockTrackables,
  TYPE_OPTIONS,
  STATUS_FILTER_OPTIONS,
  MOCK_USERS,
  typeLabel,
  typeSeverity,
  getAssignee,
  getClient,
  type TrackableScope,
  type MockTrackable,
} from './mocks';

const toast = useToast();

// -----------------------------------------------------------------------
// Data
// -----------------------------------------------------------------------
const { activeItems, archivedItems, trashItems, archive, reactivate, permanentDelete } =
  useMockTrackables();

// -----------------------------------------------------------------------
// Scope tabs
// -----------------------------------------------------------------------
const listScope = ref<TrackableScope>('active');
const scopeOptions = STATUS_FILTER_OPTIONS;

// -----------------------------------------------------------------------
// Current user (mock — for "Asignados a mí")
// -----------------------------------------------------------------------
const currentUserId = 'u1'; // Carlos Mendoza
const currentUserName = computed(
  () => MOCK_USERS.find((u) => u.id === currentUserId)?.name ?? 'Tú',
);

// -----------------------------------------------------------------------
// Search & filters
// -----------------------------------------------------------------------
const searchQuery = ref('');
const typeFilter = ref('');
const assigneeFilter = ref<string | null>(null);
const onlyMine = ref(false);
const loading = ref(false);

const assigneeOptions = [
  { label: 'Todos', value: null },
  ...MOCK_USERS.map((u) => ({ label: u.name, value: u.id })),
];

const hasActiveFilters = computed(
  () =>
    !!searchQuery.value.trim() ||
    !!typeFilter.value ||
    assigneeFilter.value !== null ||
    onlyMine.value,
);

function clearFilters() {
  searchQuery.value = '';
  typeFilter.value = '';
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
  await simulateLoad();
});

// -----------------------------------------------------------------------
// Density (comfortable / compact)
// -----------------------------------------------------------------------
type Density = 'comfortable' | 'compact';
const density = ref<Density>('comfortable');
const densityOptions = [
  { label: 'Cómodo', value: 'comfortable' },
  { label: 'Compacto', value: 'compact' },
];

// -----------------------------------------------------------------------
// Type chip accents
// -----------------------------------------------------------------------
const typeChipOptions: { label: string; value: string }[] = [
  { label: 'Todos', value: '' },
  ...TYPE_OPTIONS,
];

function typeChipAccent(value: string): string {
  if (!value) return 'var(--brand-zafiro)';
  switch (value) {
    case 'caso':
      return '#0F766E';
    case 'proceso':
      return '#7C3AED';
    case 'proyecto':
      return '#B45309';
    case 'auditoria':
      return '#0E7490';
    default:
      return 'var(--brand-zafiro)';
  }
}

// -----------------------------------------------------------------------
// Source rows (filtered)
// -----------------------------------------------------------------------
const sourceRows = computed<MockTrackable[]>(() => {
  const base =
    listScope.value === 'active'
      ? activeItems.value
      : listScope.value === 'archived'
        ? archivedItems.value
        : trashItems.value;

  return base.filter((row) => {
    const q = searchQuery.value.toLowerCase().trim();
    const matchSearch =
      !q ||
      row.title.toLowerCase().includes(q) ||
      row.caseNumber.toLowerCase().includes(q) ||
      (getClient(row.clientId)?.name.toLowerCase().includes(q) ?? false);
    const matchType = !typeFilter.value || (row.type as string) === typeFilter.value;
    const matchAssignee = assigneeFilter.value === null || row.assigneeId === assigneeFilter.value;
    const matchMine = !onlyMine.value || row.assigneeId === currentUserId;
    return matchSearch && matchType && matchAssignee && matchMine;
  });
});

// -----------------------------------------------------------------------
// Urgency classification
// -----------------------------------------------------------------------
type Urgency = 'overdue' | 'thisWeek' | 'thisMonth' | 'noDeadline';

interface UrgencyMeta {
  key: Urgency;
  label: string;
  icon: string;
  accent: string;
  description: string;
}

const URGENCY_META: Record<Urgency, UrgencyMeta> = {
  overdue: {
    key: 'overdue',
    label: 'Vencidos',
    icon: 'pi pi-exclamation-circle',
    accent: '#dc2626',
    description: 'Plazo cumplido. Requiere acción inmediata.',
  },
  thisWeek: {
    key: 'thisWeek',
    label: 'Esta semana',
    icon: 'pi pi-bolt',
    accent: '#d97706',
    description: 'Vencen en los próximos 7 días.',
  },
  thisMonth: {
    key: 'thisMonth',
    label: 'Próximos 30 días',
    icon: 'pi pi-calendar',
    accent: '#0f766e',
    description: 'Plazos a más de una semana.',
  },
  noDeadline: {
    key: 'noDeadline',
    label: 'Sin plazo asignado',
    icon: 'pi pi-clock',
    accent: '#64748b',
    description: 'Expedientes sin fecha límite definida.',
  },
};

function getUrgency(row: MockTrackable): Urgency {
  if (!row.deadlineDate) return 'noDeadline';
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const deadline = new Date(row.deadlineDate);
  const daysDiff = Math.floor((deadline.getTime() - now.getTime()) / 86400000);
  if (daysDiff < 0) return 'overdue';
  if (daysDiff <= 7) return 'thisWeek';
  return 'thisMonth';
}

function getDeadlineLabel(row: MockTrackable): string {
  if (!row.deadlineDate) return 'Sin plazo';
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const deadline = new Date(row.deadlineDate);
  const daysDiff = Math.floor((deadline.getTime() - now.getTime()) / 86400000);
  if (daysDiff === 0) return 'Vence hoy';
  if (daysDiff === 1) return 'Vence mañana';
  if (daysDiff > 0 && daysDiff <= 30) return `En ${daysDiff} días`;
  if (daysDiff > 30) {
    return deadline.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
  }
  if (daysDiff === -1) return 'Venció ayer';
  return `Hace ${Math.abs(daysDiff)} días`;
}

// -----------------------------------------------------------------------
// Group collapse state
// -----------------------------------------------------------------------
const collapsedGroups = ref<Set<Urgency>>(new Set());

function toggleGroup(urgency: Urgency) {
  if (collapsedGroups.value.has(urgency)) collapsedGroups.value.delete(urgency);
  else collapsedGroups.value.add(urgency);
  collapsedGroups.value = new Set(collapsedGroups.value);
}

// -----------------------------------------------------------------------
// Grouped rows (with starred pinned at top of each group)
// -----------------------------------------------------------------------
interface RowGroup {
  meta: UrgencyMeta;
  rows: MockTrackable[];
}

const groupedRows = computed<RowGroup[]>(() => {
  const order: Urgency[] = ['overdue', 'thisWeek', 'thisMonth', 'noDeadline'];
  const groups: Record<Urgency, MockTrackable[]> = {
    overdue: [],
    thisWeek: [],
    thisMonth: [],
    noDeadline: [],
  };

  for (const row of sourceRows.value) {
    groups[getUrgency(row)].push(row);
  }

  // Within each group: by deadline (asc, soonest first), then by createdAt (desc)
  for (const u of order) {
    groups[u].sort((a, b) => {
      const aTime = a.deadlineDate ? new Date(a.deadlineDate).getTime() : Infinity;
      const bTime = b.deadlineDate ? new Date(b.deadlineDate).getTime() : Infinity;
      if (aTime !== bTime) return aTime - bTime;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  return order
    .filter((u) => groups[u].length > 0)
    .map((u) => ({
      meta: URGENCY_META[u],
      rows: groups[u],
    }));
});

const totalRecords = computed(() => sourceRows.value.length);

// -----------------------------------------------------------------------
// Progress (mock — based on activity counters)
// -----------------------------------------------------------------------
function getProgress(row: MockTrackable): number {
  // Mock: docs + events + notes vs an arbitrary "expected total"
  const total = row.documentCount + row.eventCount + row.noteCount;
  if (total === 0) return 0;
  // Simulate a 0-100% based on documentCount as primary indicator
  const pct = Math.min(100, (row.documentCount / 40) * 100);
  return Math.round(pct);
}

// -----------------------------------------------------------------------
// Confirm dialogs
// -----------------------------------------------------------------------
const archiveTarget = ref<MockTrackable | null>(null);
const showArchiveConfirm = ref(false);
const archiving = ref(false);

function requestArchive(row: MockTrackable) {
  archiveTarget.value = row;
  showArchiveConfirm.value = true;
}

async function confirmArchive() {
  if (!archiveTarget.value) return;
  archiving.value = true;
  try {
    await archive(archiveTarget.value.id);
    showArchiveConfirm.value = false;
    toast.add({ severity: 'success', summary: 'Expediente archivado', life: 3000 });
  } finally {
    archiving.value = false;
  }
}

const reactivateTarget = ref<MockTrackable | null>(null);
const showReactivateConfirm = ref(false);
const reactivating = ref(false);

function requestReactivate(row: MockTrackable) {
  reactivateTarget.value = row;
  showReactivateConfirm.value = true;
}

async function confirmReactivate() {
  if (!reactivateTarget.value) return;
  reactivating.value = true;
  try {
    await reactivate(reactivateTarget.value.id);
    showReactivateConfirm.value = false;
    toast.add({ severity: 'success', summary: 'Expediente reactivado', life: 3000 });
  } finally {
    reactivating.value = false;
  }
}

const deleteTarget = ref<MockTrackable | null>(null);
const showDeleteConfirm = ref(false);
const deleting = ref(false);

function requestDelete(row: MockTrackable) {
  deleteTarget.value = row;
  showDeleteConfirm.value = true;
}

async function confirmDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await permanentDelete(deleteTarget.value.id);
    showDeleteConfirm.value = false;
    toast.add({ severity: 'info', summary: 'Expediente eliminado', life: 3000 });
  } finally {
    deleting.value = false;
  }
}

// -----------------------------------------------------------------------
// Avatar color
// -----------------------------------------------------------------------
function assigneeColor(id: string | null): string {
  const colors = ['#3b5bdb', '#0ca678', '#e67700', '#862e9c', '#c92a2a'];
  if (!id) return colors[0];
  const idx = id.charCodeAt(id.length - 1) % colors.length;
  return colors[idx];
}
</script>

<template>
  <div class="flex flex-col gap-6">

    <!-- Confirm dialogs -->
    <ConfirmDialogBase
      v-model:visible="showArchiveConfirm"
      variant="warning"
      title="Archivar expediente"
      :subject="archiveTarget?.title"
      message="El expediente se moverá a Archivados y dejará de aparecer en la vista activa."
      :consequences="['No aparecerá en el listado activo.', 'Notificaciones suspendidas.']"
      consequences-title="Qué pasará"
      confirm-label="Archivar"
      :loading="archiving"
      @confirm="confirmArchive"
    />
    <ConfirmDialogBase
      v-model:visible="showReactivateConfirm"
      variant="success"
      title="Reactivar expediente"
      :subject="reactivateTarget?.title"
      message="Volverá a la vista activa con notificaciones reactivadas."
      confirm-label="Reactivar"
      :loading="reactivating"
      @confirm="confirmReactivate"
    />
    <ConfirmDialogBase
      v-model:visible="showDeleteConfirm"
      variant="danger"
      title="Eliminar permanentemente"
      :subject="deleteTarget?.title"
      message="Esta acción no se puede deshacer."
      typed-confirm-phrase="ELIMINAR"
      typed-confirm-hint="Para confirmar, escribe la palabra a continuación."
      typed-confirm-label="Escribe ELIMINAR"
      confirm-label="Eliminar permanentemente"
      :loading="deleting"
      @confirm="confirmDelete"
    />

    <!-- Page header -->
    <PageHeader
      title="Expedientes (Cockpit)"
      subtitle="Sandbox: inbox agrupado por buckets de plazo (~5000 filas deterministas en Activos). Producción en /trackables usa lista virtualizada plana + chips de urgencia (API cursor + facets)."
    >
      <template #actions>
        <SelectButton
          v-model="density"
          :options="densityOptions"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          size="small"
          class="density-tabs"
        />
        <Button label="Nuevo expediente" icon="pi pi-plus" size="small" />
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

    <!-- Main card (constrained height — internal scroll) -->
    <div class="app-card flex flex-col overflow-hidden cockpit-card">

      <!-- Toolbar -->
      <div
        class="flex items-center gap-2 px-4 py-3 flex-wrap"
        style="border-bottom: 1px solid var(--surface-border); background: var(--surface-raised);"
      >
        <IconField class="flex-1 min-w-[180px]">
          <InputIcon class="pi pi-search" style="color: var(--fg-subtle);" />
          <InputText
            v-model="searchQuery"
            placeholder="Buscar expedientes…"
            size="small"
            class="w-full"
          />
        </IconField>

        <!-- Asignado dropdown -->
        <Dropdown
          v-model="assigneeFilter"
          :options="assigneeOptions"
          option-label="label"
          option-value="value"
          placeholder="Asignado"
          show-clear
          size="small"
          class="cockpit-toolbar-dropdown"
        />

        <!-- Asignados a mí toggle -->
        <button
          type="button"
          class="cockpit-pill"
          :class="{ 'cockpit-pill--active': onlyMine }"
          @click="onlyMine = !onlyMine"
        >
          <i class="pi pi-user text-[10px]" />
          A mí
        </button>

        <!-- Clear filters -->
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
          {{ totalRecords }} expediente{{ totalRecords !== 1 ? 's' : '' }}
        </span>
      </div>

      <!-- Type chips -->
      <div
        class="flex items-center gap-1.5 px-4 py-2 flex-wrap"
        style="border-bottom: 1px solid var(--surface-border); background: var(--surface-raised);"
      >
        <button
          v-for="opt in typeChipOptions"
          :key="opt.value"
          type="button"
          class="type-chip"
          :class="{ 'type-chip--active': typeFilter === opt.value }"
          :style="{ '--chip-accent': typeChipAccent(opt.value) } as Record<string, string>"
          @click="typeFilter = opt.value"
        >
          <span class="type-chip__dot" :style="{ background: typeChipAccent(opt.value) }" />
          {{ opt.label }}
        </button>
      </div>

      <!-- Skeleton -->
      <div v-if="loading" class="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-3">
        <div v-for="row in 4" :key="row" class="flex items-center gap-3 px-2 py-3">
          <Skeleton width="6px" height="3.5rem" />
          <div class="flex-1 flex flex-col gap-2">
            <Skeleton height="0.95rem" width="55%" />
            <Skeleton height="0.7rem" width="35%" />
          </div>
          <Skeleton width="6rem" height="1.5rem" border-radius="999px" />
          <Skeleton shape="circle" size="2.25rem" />
        </div>
      </div>

      <!-- Empty -->
      <div
        v-else-if="totalRecords === 0"
        class="flex flex-col items-center gap-3 py-16"
        style="color: var(--fg-subtle);"
      >
        <i class="pi pi-briefcase text-4xl opacity-40" />
        <p class="m-0 text-sm">Sin expedientes en esta vista</p>
      </div>

      <!-- Groups list (scroll vertical interno) -->
      <div v-else class="flex-1 min-h-0 overflow-y-auto" :class="`density-${density}`">
        <section v-for="group in groupedRows" :key="group.meta.key" class="cockpit-group">

          <!-- Group header -->
          <button
            type="button"
            class="cockpit-group__header"
            :style="{ '--group-accent': group.meta.accent } as Record<string, string>"
            @click="toggleGroup(group.meta.key)"
          >
            <div class="cockpit-group__indicator">
              <i :class="group.meta.icon" />
            </div>
            <div class="flex flex-col items-start min-w-0">
              <span class="cockpit-group__label">{{ group.meta.label }}</span>
              <span class="cockpit-group__count">
                {{ group.rows.length }} expediente{{ group.rows.length !== 1 ? 's' : '' }}
                <span class="cockpit-group__hint">· {{ group.meta.description }}</span>
              </span>
            </div>
            <i
              class="pi shrink-0 ml-auto text-xs transition-transform"
              :class="collapsedGroups.has(group.meta.key) ? 'pi-chevron-right' : 'pi-chevron-down'"
              style="color: var(--fg-subtle);"
            />
          </button>

          <!-- Group rows -->
          <div v-show="!collapsedGroups.has(group.meta.key)" class="cockpit-rows">
            <article
              v-for="row in group.rows"
              :key="row.id"
              class="cockpit-row"
              :class="{
                'cockpit-row--overdue': group.meta.key === 'overdue',
                'cockpit-row--week': group.meta.key === 'thisWeek',
              }"
              :style="{ '--row-accent': group.meta.accent } as Record<string, string>"
            >
              <!-- Status stripe -->
              <div class="cockpit-row__stripe" />

              <!-- Emoji + meta -->
              <div class="cockpit-row__emoji">{{ row.emoji }}</div>

              <!-- Main content -->
              <div class="cockpit-row__main">
                <!-- Top line: case number + type tag + urgent badges (visually aligned) -->
                <div class="cockpit-row__topline">
                  <span class="cockpit-row__casekey">{{ row.caseNumber.slice(0, 18) }}</span>
                  <span
                    class="cockpit-chip"
                    :class="`cockpit-chip--${typeSeverity[row.type]}`"
                  >
                    {{ typeLabel[row.type] }}
                  </span>
                  <span v-if="row.isUrgent" class="cockpit-chip cockpit-chip--urgent">
                    <i class="pi pi-bolt text-[9px]" />
                    Urgente
                  </span>
                </div>

                <!-- Title -->
                <h3 class="cockpit-row__title">{{ row.title }}</h3>

                <!-- Bottom line: deadline + counters + progress + assignee -->
                <div class="cockpit-row__meta">
                  <!-- Deadline pill -->
                  <span
                    class="cockpit-row__deadline"
                    :class="{
                      'cockpit-row__deadline--overdue': group.meta.key === 'overdue',
                      'cockpit-row__deadline--week': group.meta.key === 'thisWeek',
                      'cockpit-row__deadline--neutral':
                        group.meta.key === 'thisMonth' || group.meta.key === 'noDeadline',
                    }"
                  >
                    <i class="pi pi-clock text-[10px]" />
                    {{ getDeadlineLabel(row) }}
                  </span>

                  <!-- Counters (compact, only if value > 0) -->
                  <span v-if="row.documentCount > 0" class="cockpit-row__counter" v-tooltip="'Documentos'">
                    <i class="pi pi-file" />
                    {{ row.documentCount }}
                  </span>
                  <span v-if="row.eventCount > 0" class="cockpit-row__counter" v-tooltip="'Eventos'">
                    <i class="pi pi-calendar" />
                    {{ row.eventCount }}
                  </span>
                  <span v-if="row.noteCount > 0" class="cockpit-row__counter" v-tooltip="'Notas'">
                    <i class="pi pi-comment" />
                    {{ row.noteCount }}
                  </span>

                  <!-- Progress bar (only on comfortable density) -->
                  <div v-if="density === 'comfortable'" class="cockpit-row__progress">
                    <div class="cockpit-row__progress-bar" :style="{ width: `${getProgress(row)}%` }" />
                    <span class="cockpit-row__progress-label">{{ getProgress(row) }}%</span>
                  </div>

                  <!-- Client (truncated, hide on compact) -->
                  <span
                    v-if="row.clientId && density === 'comfortable'"
                    class="cockpit-row__client"
                  >
                    <i class="pi pi-building text-[10px]" />
                    {{ getClient(row.clientId)?.name }}
                  </span>
                </div>
              </div>

              <!-- Assignee avatar -->
              <div class="cockpit-row__assignee" v-tooltip="getAssignee(row.assigneeId)?.name ?? 'Sin asignar'">
                <div
                  v-if="row.assigneeId"
                  class="cockpit-row__avatar"
                  :style="{ background: assigneeColor(row.assigneeId), color: '#fff' }"
                >
                  {{ getAssignee(row.assigneeId)?.initials }}
                </div>
                <div v-else class="cockpit-row__avatar cockpit-row__avatar--empty">
                  <i class="pi pi-user-plus text-xs" />
                </div>
              </div>

              <!-- Actions -->
              <div class="cockpit-row__actions" role="group" aria-label="Acciones">
                <Button
                  v-if="listScope !== 'trash'"
                  icon="pi pi-pencil"
                  variant="text"
                  rounded
                  size="small"
                  severity="secondary"
                  aria-label="Editar"
                  v-tooltip.top="'Editar'"
                />
                <Button
                  v-if="listScope === 'active'"
                  icon="pi pi-inbox"
                  variant="text"
                  rounded
                  size="small"
                  severity="warn"
                  aria-label="Archivar"
                  v-tooltip.top="'Archivar'"
                  @click="requestArchive(row)"
                />
                <Button
                  v-if="listScope === 'archived'"
                  icon="pi pi-replay"
                  variant="text"
                  rounded
                  size="small"
                  severity="success"
                  aria-label="Reactivar"
                  v-tooltip.top="'Reactivar'"
                  @click="requestReactivate(row)"
                />
                <Button
                  icon="pi pi-trash"
                  variant="text"
                  rounded
                  size="small"
                  severity="danger"
                  :aria-label="listScope === 'trash' ? 'Eliminar permanentemente' : 'Mover a papelera'"
                  v-tooltip.top="listScope === 'trash' ? 'Eliminar permanentemente' : 'Mover a papelera'"
                  @click="requestDelete(row)"
                />
              </div>
            </article>
          </div>
        </section>
      </div>

      <!-- Footer with summary -->
      <div
        v-if="!loading && totalRecords > 0"
        class="flex items-center justify-between gap-4 px-4 py-3 text-xs"
        style="border-top: 1px solid var(--surface-border); background: var(--surface-raised); color: var(--fg-subtle);"
      >
        <span>
          <strong style="color: var(--fg-default);">{{ totalRecords }}</strong> expedientes ·
          {{ groupedRows.length }} grupo{{ groupedRows.length !== 1 ? 's' : '' }}
          <span v-if="onlyMine"> · asignados a <strong>{{ currentUserName }}</strong></span>
        </span>
        <span class="hidden sm:inline">
          Tip: click en una sección para colapsarla.
        </span>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* -----------------------------------------------------------------------
   Cockpit card (constrain height — internal scroll)
----------------------------------------------------------------------- */
.cockpit-card {
  max-height: calc(100vh - 280px);
  min-height: 400px;
}

/* -----------------------------------------------------------------------
   Scope tabs (shared with TrackablesList)
----------------------------------------------------------------------- */
:deep(.scope-tabs .p-selectbutton-option),
:deep(.density-tabs .p-selectbutton-option) {
  padding: 0.375rem 1rem;
  font-size: 0.8125rem;
  font-weight: 500;
}
:deep(.density-tabs .p-selectbutton-option) {
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
}

/* -----------------------------------------------------------------------
   Toolbar — Asignado dropdown + 'A mí' pill
----------------------------------------------------------------------- */
:deep(.cockpit-toolbar-dropdown.p-select),
:deep(.cockpit-toolbar-dropdown.p-dropdown) {
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
   Type chips (color por tipo)
----------------------------------------------------------------------- */
.type-chip {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 9999px;
  border: 1px solid var(--surface-border);
  background: var(--surface-raised);
  padding: 0.35rem 0.95rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--fg-muted);
  white-space: nowrap;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
.type-chip__dot {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 9999px;
}
.type-chip:hover {
  border-color: color-mix(in srgb, var(--chip-accent, var(--accent)) 35%, var(--surface-border));
  color: var(--fg-default);
}
.type-chip--active {
  border-width: 1.5px;
  border-color: var(--chip-accent, var(--accent));
  background: color-mix(in srgb, var(--chip-accent, var(--accent)) 12%, var(--surface-raised));
  color: var(--chip-accent, var(--accent));
}
html.dark .type-chip--active {
  background: color-mix(in srgb, var(--chip-accent, var(--accent)) 22%, var(--surface-raised));
}

/* -----------------------------------------------------------------------
   Group header
----------------------------------------------------------------------- */
.cockpit-group {
  border-bottom: 1px solid var(--surface-border);
}
.cockpit-group:last-child {
  border-bottom: 0;
}

.cockpit-group__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.875rem 1rem;
  background: linear-gradient(
    to right,
    color-mix(in srgb, var(--group-accent) 7%, transparent),
    transparent 60%
  );
  border: none;
  cursor: pointer;
  text-align: left;
  border-bottom: 1px solid var(--surface-border);
  transition: background-color 0.15s ease;
}

html.dark .cockpit-group__header {
  background: linear-gradient(
    to right,
    color-mix(in srgb, var(--group-accent) 18%, transparent),
    transparent 60%
  );
}

.cockpit-group__header:hover {
  background: linear-gradient(
    to right,
    color-mix(in srgb, var(--group-accent) 12%, transparent),
    transparent 60%
  );
}

.cockpit-group__indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--group-accent) 14%, var(--surface-raised));
  color: var(--group-accent);
  font-size: 0.875rem;
  flex-shrink: 0;
}

.cockpit-group__label {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--group-accent);
}

.cockpit-group__count {
  font-size: 0.75rem;
  color: var(--fg-muted);
}

.cockpit-group__hint {
  color: var(--fg-subtle);
  font-weight: normal;
}

/* -----------------------------------------------------------------------
   Row
----------------------------------------------------------------------- */
.cockpit-rows {
  background: var(--surface-raised);
}

.cockpit-row {
  position: relative;
  display: grid;
  grid-template-columns: 4px 2.5rem 1fr auto auto;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem 0.875rem 0;
  border-bottom: 1px solid var(--surface-border);
  transition: background-color 0.15s ease;
}

.cockpit-row:hover {
  background: color-mix(in srgb, var(--row-accent) 4%, var(--surface-raised));
}

.cockpit-row:last-child {
  border-bottom: 0;
}

.cockpit-row__stripe {
  height: 100%;
  background: var(--row-accent);
  align-self: stretch;
  opacity: 0.55;
}
.cockpit-row--overdue .cockpit-row__stripe {
  opacity: 0.95;
}
.cockpit-row--week .cockpit-row__stripe {
  opacity: 0.75;
}

.cockpit-row__emoji {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 12px;
  font-size: 1.125rem;
  background: var(--accent-soft);
  flex-shrink: 0;
}

/* Compact density: smaller emoji */
.density-compact .cockpit-row__emoji {
  width: 2rem;
  height: 2rem;
  font-size: 1rem;
}

.cockpit-row__main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.cockpit-row__topline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.cockpit-row__casekey {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-feature-settings: 'tnum' 1, 'lnum' 1;
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.125rem 0.4rem;
  background: var(--surface-sunken);
  color: var(--fg-subtle);
  border-radius: 4px;
}

/* Unified pill chip system — used for type tags AND urgent badge so they align visually */
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

/* Type variants (mapped from PrimeVue Tag severity for consistency with the rest of the app) */
.cockpit-chip--info {
  background: color-mix(in srgb, #2563eb 14%, var(--surface-raised));
  color: #1d4ed8;
}
html.dark .cockpit-chip--info {
  background: color-mix(in srgb, #2563eb 28%, transparent);
  color: #93c5fd;
}

.cockpit-chip--warn {
  background: color-mix(in srgb, #d97706 14%, var(--surface-raised));
  color: #b45309;
}
html.dark .cockpit-chip--warn {
  background: color-mix(in srgb, #d97706 28%, transparent);
  color: #fbbf24;
}

.cockpit-chip--success {
  background: color-mix(in srgb, #10b981 14%, var(--surface-raised));
  color: #047857;
}
html.dark .cockpit-chip--success {
  background: color-mix(in srgb, #10b981 28%, transparent);
  color: #6ee7b7;
}

.cockpit-chip--secondary {
  background: var(--surface-sunken);
  color: var(--fg-muted);
}

/* Urgent badge — same shape as the type chip, distinct color */
.cockpit-chip--urgent {
  background: color-mix(in srgb, #f43f5e 14%, var(--surface-raised));
  color: #be123c;
}
html.dark .cockpit-chip--urgent {
  background: color-mix(in srgb, #f43f5e 28%, transparent);
  color: #fda4af;
}

.cockpit-row__title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--fg-default);
  margin: 0;
  line-height: 1.3;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

/* Compact density: smaller title */
.density-compact .cockpit-row__title {
  font-size: 0.875rem;
}

.cockpit-row__meta {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex-wrap: wrap;
  font-size: 0.75rem;
  color: var(--fg-muted);
}

/* Hide topline + secondary meta on compact density */
.density-compact .cockpit-row__topline {
  display: none;
}

.cockpit-row__deadline {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
}
.cockpit-row__deadline--overdue {
  background: rgba(220, 38, 38, 0.12);
  color: #b91c1c;
}
html.dark .cockpit-row__deadline--overdue {
  background: rgba(220, 38, 38, 0.25);
  color: #fca5a5;
}
.cockpit-row__deadline--week {
  background: rgba(217, 119, 6, 0.12);
  color: #92400e;
}
html.dark .cockpit-row__deadline--week {
  background: rgba(217, 119, 6, 0.22);
  color: #fbbf24;
}
.cockpit-row__deadline--neutral {
  background: var(--surface-sunken);
  color: var(--fg-muted);
}

.cockpit-row__counter {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  color: var(--fg-subtle);
}
.cockpit-row__counter i {
  font-size: 0.6875rem;
}

.cockpit-row__progress {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 80px;
  max-width: 140px;
}
.cockpit-row__progress::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--surface-sunken);
  border-radius: 9999px;
  height: 4px;
  top: 50%;
  transform: translateY(-50%);
}
.cockpit-row__progress-bar {
  position: absolute;
  height: 4px;
  top: 50%;
  transform: translateY(-50%);
  background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 60%, transparent));
  border-radius: 9999px;
  z-index: 1;
}
.cockpit-row__progress-label {
  position: relative;
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--fg-muted);
  margin-left: auto;
  z-index: 2;
  background: var(--surface-raised);
  padding: 0 0.25rem;
}

.cockpit-row__client {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  color: var(--fg-subtle);
  max-width: 180px;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.cockpit-row__assignee {
  flex-shrink: 0;
}

.cockpit-row__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 700;
}
.cockpit-row__avatar--empty {
  background: var(--surface-sunken);
  color: var(--fg-subtle);
  border: 1px dashed var(--surface-border);
}

.cockpit-row__actions {
  display: flex;
  align-items: center;
  gap: 0.125rem;
  flex-shrink: 0;
}

:deep(.cockpit-row__actions .p-button) {
  width: 2rem !important;
  height: 2rem !important;
  padding: 0 !important;
}
:deep(.cockpit-row__actions .p-button-icon) {
  font-size: 0.8125rem;
}

/* Density: compact (tighter padding, smaller controls) */
.density-compact .cockpit-row {
  padding: 0.5rem 1rem 0.5rem 0;
}
.density-compact .cockpit-row__meta {
  font-size: 0.6875rem;
  gap: 0.5rem;
}

.kbd {
  display: inline-block;
  padding: 0.1rem 0.4rem;
  background: var(--surface-sunken);
  border: 1px solid var(--surface-border);
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 0.6875rem;
  color: var(--fg-default);
}
</style>
