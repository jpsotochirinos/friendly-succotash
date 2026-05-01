<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink, type RouteLocationRaw } from 'vue-router';
import Avatar from 'primevue/avatar';
import AvatarGroup from 'primevue/avatargroup';
import Checkbox from 'primevue/checkbox';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import Paginator from 'primevue/paginator';
import Popover from 'primevue/popover';
import SelectButton from 'primevue/selectbutton';
import Skeleton from 'primevue/skeleton';
import Tag from 'primevue/tag';
import PageHeader from '@/components/common/PageHeader.vue';
import CalendarFilterTrigger from '@/views/calendar/components/CalendarFilterTrigger.vue';
import { hashAvatarColor } from '@/utils/avatarColor';
import {
  MOCK_USERS,
  getAssignee,
  getClient,
  typeLabel,
  useMockTrackables,
  type MockTrackable,
  type TrackableScope,
} from '../TrackablesCockpit/mocks';

type SignalKey = 'decision' | 'sinoe' | 'hearing';
type Urgency = 'overdue' | 'today' | 'week' | 'month' | 'noDeadline';

interface PendingAction {
  id: string;
  /** Compact label — max 3 words, shown inline */
  label: string;
  /** Full description for tooltip */
  tooltip: string;
  icon: string;
  accent: string;
  /** Expediente tab: 0 Resumen (carátula / SINOE / partes), 1 Actividades */
  tab?: 0 | 1;
}

const { activeItems, archivedItems } = useMockTrackables();

const listScope = ref<TrackableScope>('active');
const search = ref('');
const activeSignals = ref<SignalKey[]>([]);
const loading = ref(false);
const currentPage = ref(1);
const pageSize = ref(15);

const scopeOptions = [
  { label: 'Activos', value: 'active' },
  { label: 'Archivados', value: 'archived' },
];

const signalFilters: Array<{ key: SignalKey; label: string; icon: string; accent: string }> = [
  { key: 'decision', label: 'Decisión', icon: 'pi pi-exclamation-circle', accent: '#dc2626' },
  { key: 'sinoe', label: 'SINOE', icon: 'pi pi-inbox', accent: '#7c3aed' },
  { key: 'hearing', label: 'Audiencias', icon: 'pi pi-calendar', accent: '#0e7490' },
];

// Multi-select assignee filter — default: solo expedientes asignados al usuario actual
const assigneeFilters = ref<string[]>(['__mine']);
const assigneePopoverRef = ref<InstanceType<typeof Popover> | null>(null);
const assigneePopoverOpen = ref(false);

// Shared popover for "involucrados" overflow
const involucradosPopoverRef = ref<InstanceType<typeof Popover> | null>(null);
const activeInvolucrados = ref<Involucrado[]>([]);

function openInvolucradosPopover(e: MouseEvent, row: MockTrackable) {
  activeInvolucrados.value = getInvolucrados(row);
  involucradosPopoverRef.value?.toggle(e);
}

// Mock: first user is "me" (in production comes from authStore)
const currentUserId = MOCK_USERS[0]?.id ?? 'u1';
const currentUser = MOCK_USERS.find((u) => u.id === currentUserId);

const MAX_TRIGGER_AVATARS = 3;

interface AssigneeOption {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  isMine?: boolean;
  isUnassigned?: boolean;
  isDivider?: boolean;
}

const assigneeOptions: AssigneeOption[] = [
  { id: '__mine', name: 'Asignado a mí', initials: currentUser?.initials ?? 'Yo', avatarColor: currentUser?.avatarColor ?? 'var(--accent)', isMine: true },
  { id: '__d1', name: '', initials: '', avatarColor: '', isDivider: true },
  ...MOCK_USERS.map((u) => ({ id: u.id, name: u.name, initials: u.initials, avatarColor: u.avatarColor })),
  { id: '__d2', name: '', initials: '', avatarColor: '', isDivider: true },
  { id: '__unassigned', name: 'Sin asignar', initials: 'SA', avatarColor: '', isUnassigned: true },
];

/** Avatars shown in the CalendarFilterTrigger (max 3, no unassigned) */
const triggerAvatars = computed(() =>
  assigneeFilters.value
    .filter((id) => id !== '__unassigned')
    .map((id): { initials: string; color: string; name: string } | null => {
      if (id === '__mine') return { initials: currentUser?.initials ?? 'Yo', color: currentUser?.avatarColor ?? 'var(--accent)', name: 'Asignado a mí' };
      const u = MOCK_USERS.find((m) => m.id === id);
      return u ? { initials: u.initials, color: u.avatarColor, name: u.name } : null;
    })
    .filter((x): x is { initials: string; color: string; name: string } => x !== null)
    .slice(0, MAX_TRIGGER_AVATARS),
);

const triggerOverflow = computed(() =>
  Math.max(0, assigneeFilters.value.filter((id) => id !== '__unassigned').length - MAX_TRIGGER_AVATARS),
);

const triggerOverflowTooltip = computed(() =>
  assigneeFilters.value
    .filter((id) => id !== '__unassigned')
    .slice(MAX_TRIGGER_AVATARS)
    .map((id) => {
      if (id === '__mine') return 'Asignado a mí';
      return MOCK_USERS.find((u) => u.id === id)?.name ?? id;
    })
    .join(', '),
);

function openAssigneePopover(e: MouseEvent | Event) {
  assigneePopoverRef.value?.toggle(e as MouseEvent);
}

function toggleAssigneeFilter(id: string) {
  const next = new Set(assigneeFilters.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  assigneeFilters.value = Array.from(next);
  currentPage.value = 1;
}

const baseRows = computed(() => {
  if (listScope.value === 'archived') return archivedItems.value;
  return activeItems.value;
});

const filteredRows = computed(() => {
  const q = search.value.trim().toLowerCase();
  const af = assigneeFilters.value;
  return baseRows.value.filter((row) => {
    const client = getClient(row.clientId)?.name ?? '';
    const assignee = getAssignee(row.assigneeId)?.name ?? '';
    const haystack = [row.title, row.caseNumber, typeLabel[row.type], client, assignee]
      .join(' ')
      .toLowerCase();
    const matchesSearch = !q || haystack.includes(q);
    let matchesAssignee = true;
    if (af.length > 0) {
      const allowedIds = new Set(
        af.flatMap((id) => {
          if (id === '__mine') return [currentUserId];
          if (id === '__unassigned') return ['__unassigned_marker'];
          return [id];
        }),
      );
      const rowId = row.assigneeId ?? '__unassigned_marker';
      matchesAssignee = allowedIds.has(rowId);
    }
    return matchesSearch && matchesAssignee && activeSignals.value.every((signal) => hasSignal(row, signal));
  });
});

const sortedRows = computed(() =>
  [...filteredRows.value].sort((a, b) => {
    const scoreDiff = attentionScore(b) - attentionScore(a);
    if (scoreDiff !== 0) return scoreDiff;
    return deadlineTime(a) - deadlineTime(b);
  }),
);

const totalRecords = computed(() => filteredRows.value.length);

const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return sortedRows.value.slice(start, start + pageSize.value);
});

// Reset to page 1 when filters change
watch([listScope, search, activeSignals, assigneeFilters], () => {
  currentPage.value = 1;
  loading.value = true;
  globalThis.setTimeout(() => { loading.value = false; }, 350);
}, { deep: true });

function onPageChange(event: { page: number; rows: number }) {
  currentPage.value = event.page + 1;
  pageSize.value = event.rows;
}

function toggleSignal(key: SignalKey) {
  const next = new Set(activeSignals.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  activeSignals.value = Array.from(next);
}

function clearFilters() {
  search.value = '';
  activeSignals.value = [];
  assigneeFilters.value = [];
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function deadlineTime(row: MockTrackable): number {
  return row.deadlineDate ? new Date(row.deadlineDate).getTime() : Number.POSITIVE_INFINITY;
}

function daysUntil(row: MockTrackable): number | null {
  if (!row.deadlineDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(row.deadlineDate);
  deadline.setHours(0, 0, 0, 0);
  return Math.round((deadline.getTime() - today.getTime()) / 86400000);
}

function urgencyFor(row: MockTrackable): Urgency {
  const days = daysUntil(row);
  if (days == null) return 'noDeadline';
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days <= 7) return 'week';
  return 'month';
}

function deadlineLabel(row: MockTrackable): string {
  const days = daysUntil(row);
  if (days == null) return 'Sin plazo';
  if (days < -1) return `Venció hace ${Math.abs(days)} días`;
  if (days === -1) return 'Venció ayer';
  if (days === 0) return 'Vence hoy';
  if (days === 1) return 'Vence mañana';
  if (days <= 30) return `En ${days} días`;
  return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short' }).format(
    new Date(row.deadlineDate ?? ''),
  );
}

const urgencyWeight: Record<Urgency, number> = {
  overdue: 46,
  today: 40,
  week: 28,
  month: 12,
  noDeadline: 8,
};

// ── Domain helpers ────────────────────────────────────────────────────────────

function hashId(value: string): number {
  return Array.from(value).reduce((sum, char) => sum + (char.codePointAt(0) ?? 0), 0);
}

function hasSinoe(row: MockTrackable): boolean {
  return row.scope === 'active' && (hashId(row.id) + row.noteCount) % 4 === 0;
}

function attentionScore(row: MockTrackable): number {
  const urgency = urgencyWeight[urgencyFor(row)];
  const noOwner = row.assigneeId ? 0 : 18;
  const sinoe = hasSinoe(row) ? 16 : 0;
  const volume = Math.min(16, Math.round((row.documentCount + row.eventCount + row.noteCount) / 4));
  const urgent = row.isUrgent ? 14 : 0;
  return Math.min(100, urgency + noOwner + sinoe + volume + urgent);
}

function hasSignal(row: MockTrackable, signal: SignalKey): boolean {
  if (signal === 'decision') return attentionScore(row) >= 68 || urgencyFor(row) === 'overdue';
  if (signal === 'sinoe') return hasSinoe(row);
  return row.eventCount > 0 && ['overdue', 'today', 'week'].includes(urgencyFor(row));
}

function stageFor(row: MockTrackable): string {
  const stages = ['Admisión', 'Postulatoria', 'Probatoria', 'Audiencia', 'Ejecución', 'Cierre'];
  return stages[Math.abs(hashId(row.id)) % stages.length] ?? 'Postulatoria';
}

/**
 * Returns ALL pending actions for a row, ordered by legal priority.
 * Priority: SINOE (1) → vencido (2) → hoy (3) → semana (4) → sin responsable (5) → sin cliente (6) → hito (7).
 * A row can have several simultaneously (e.g. SINOE + vencido + sin responsable).
 *
 * BACKEND — listado / facets: si `client_id` es null (UI: «Cliente por asignar»), el API debería
 * devolver un flag o contador (p. ej. `pending_client_assignment`) alineado con esta columna,
 * para que en productivo no quede solo el hito genérico cuando falta cliente.
 */
function getPendingActions(row: MockTrackable): PendingAction[] {
  const actions: PendingAction[] = [];
  const days = daysUntil(row);

  if (hasSinoe(row)) {
    actions.push({
      id: 'sinoe',
      label: 'Revisar SINOE',
      tooltip: 'Confirmar cargo procesal y computar plazo desde la notificación.',
      icon: 'pi pi-inbox',
      accent: '#7c3aed',
      tab: 0,
    });
  }

  if (days != null && days < 0) {
    actions.push({
      id: 'overdue',
      label: 'Presentar escrito',
      tooltip: `Plazo vencido hace ${Math.abs(days)} día${Math.abs(days) === 1 ? '' : 's'} — presentar escrito o solicitar reprogramación hoy.`,
      icon: 'pi pi-send',
      accent: '#dc2626',
      tab: 1,
    });
  } else if (days === 0) {
    actions.push({
      id: 'today',
      label: 'Actuación hoy',
      tooltip: 'Vence hoy — actuación que no puede pasar de la jornada.',
      icon: 'pi pi-send',
      accent: '#dc2626',
      tab: 1,
    });
  } else if (days != null && days <= 7) {
    actions.push({
      id: 'week',
      label: 'Preparar actuación',
      tooltip: `Vence en ${days} día${days === 1 ? '' : 's'} — validar anexos, responsable y agenda.`,
      icon: 'pi pi-file-edit',
      accent: '#d97706',
      tab: 1,
    });
  }

  if (!row.assigneeId) {
    actions.push({
      id: 'assign',
      label: 'Sin responsable',
      tooltip: 'Asignar abogado para habilitar seguimiento y alertas.',
      icon: 'pi pi-user-plus',
      accent: '#64748b',
      tab: 0,
    });
  }

  if (!row.clientId) {
    actions.push({
      id: 'client',
      label: 'Asignar cliente',
      tooltip: 'Vincular cliente en carátula para notificaciones y reportes.',
      icon: 'pi pi-building',
      accent: '#0e7490',
      tab: 0,
    });
  }

  if (actions.length === 0) {
    actions.push({
      id: 'milestone',
      label: 'Próximo hito',
      tooltip: 'Registrar la siguiente actuación o plazo procesal verificable.',
      icon: 'pi pi-flag',
      accent: '#0f766e',
      tab: 1,
    });
  }

  return actions;
}

function pendingActionTo(row: MockTrackable, action: PendingAction): RouteLocationRaw {
  const path = `/trackables/${row.id}`;
  if (action.tab === 1) return { path, query: { tab: '1' } };
  return path;
}

function urgencyTag(row: MockTrackable): { label: string; severity: 'danger' | 'warn' | 'info' | 'secondary' } {
  const u = urgencyFor(row);
  if (u === 'overdue') return { label: deadlineLabel(row), severity: 'danger' };
  if (u === 'today')   return { label: 'Vence hoy', severity: 'danger' };
  if (u === 'week')    return { label: deadlineLabel(row), severity: 'warn' };
  if (u === 'month')   return { label: deadlineLabel(row), severity: 'info' };
  return { label: 'Sin plazo', severity: 'secondary' };
}

function rowClass(data: unknown): string {
  const u = urgencyFor(m(data as MockTrackable));
  if (u === 'overdue' || u === 'today') return 'wb-row--urgent';
  if (u === 'week') return 'wb-row--warn';
  return '';
}

function assigneeInitials(row: MockTrackable): string {
  return getAssignee(row.assigneeId)?.initials ?? 'SA';
}

function assigneeName(row: MockTrackable): string {
  return getAssignee(row.assigneeId)?.name ?? 'Sin asignar';
}

function assigneeColor(row: MockTrackable): string {
  return getAssignee(row.assigneeId)?.avatarColor ?? 'var(--fg-subtle)';
}

interface Involucrado {
  id: string;
  name: string;
  initials: string;
  color: string;
  role: string;
}

/**
 * Deriva de forma determinista los usuarios involucrados en un expediente.
 * El responsable principal va primero; se agregan hasta 2 colaboradores
 * adicionales basados en el hash del ID del expediente.
 */
function getInvolucrados(row: MockTrackable): Involucrado[] {
  const result: Involucrado[] = [];

  // Responsable principal
  const primary = getAssignee(row.assigneeId);
  if (primary) {
    result.push({ id: primary.id, name: primary.name, initials: primary.initials, color: primary.avatarColor, role: 'Responsable' });
  }

  // Colaboradores adicionales (0-2 según volumen del expediente)
  const extraCount = Math.min(2, Math.floor((row.documentCount + row.eventCount) / 12));
  const hash = hashId(row.id);
  const others = MOCK_USERS.filter((u) => u.id !== row.assigneeId);
  for (let i = 0; i < extraCount && i < others.length; i++) {
    const u = others[(hash + i) % others.length];
    if (u) {
      result.push({ id: u.id, name: u.name, initials: u.initials, color: u.avatarColor, role: i === 0 ? 'Colaborador' : 'Revisor' });
    }
  }

  return result;
}

const hasActiveFilters = computed(() =>
  !!search.value.trim() || activeSignals.value.length > 0 || assigneeFilters.value.length > 0,
);

/** Max task rows visible (activity-stat stack); rest collapse into "+N". */
const MAX_VISIBLE_ACTIONS = 3;

/** Typed cast for DataTable body-slot `data` which PrimeVue types as untyped. */
function m(data: MockTrackable): MockTrackable { return data; }
function typeLabelFor(data: MockTrackable): string { return typeLabel[data.type]; }
</script>

<template>
  <div class="exp21">
    <!-- Page header — outside the scrollable region -->
    <PageHeader
      title="Expedientes"
      subtitle="Mesa de trabajo del despacho. Ordenados por urgencia. Filtrar por señal o por búsqueda libre."
    >
      <template #actions>
        <Button label="Nuevo expediente" icon="pi pi-plus" size="small" />
      </template>
    </PageHeader>

    <!-- Workbench card — fixed height, internal scroll -->
    <div class="app-card wb-card">

      <!-- ── Fixed toolbar ──────────────────────────────────────────────── -->
      <div class="wb-toolbar" role="toolbar" aria-label="Filtros de expedientes">

        <!-- Band 1: scope tabs edge-to-edge (like calendar) -->
        <div class="wb-toolbar__primary">
          <SelectButton
            v-model="listScope"
            :options="scopeOptions"
            option-label="label"
            option-value="value"
            :allow-empty="false"
            size="small"
            aria-label="Estado de expedientes"
            class="wb-scope-select"
          />
        </div>

        <!-- Band 2: search + signals + count -->
        <div class="wb-toolbar__row wb-toolbar__row--main">
          <IconField class="wb-search">
            <InputIcon class="pi pi-search" />
            <InputText
              v-model="search"
              size="small"
              name="exp21-search"
              autocomplete="off"
              placeholder="Buscar por expediente, cliente, código, abogado…"
              aria-label="Buscar expedientes"
            />
          </IconField>

          <div class="wb-signals" aria-label="Filtros por señal">
            <button
              v-for="f in signalFilters"
              :key="f.key"
              type="button"
              class="wb-signal"
              :class="{ 'wb-signal--active': activeSignals.includes(f.key) }"
              :style="{ '--sa': f.accent } as Record<string, string>"
              :aria-pressed="activeSignals.includes(f.key)"
              @click="toggleSignal(f.key)"
            >
              <i :class="f.icon" aria-hidden="true" />
              {{ f.label }}
            </button>

            <!-- Assignee filter — multi-select, AvatarGroup in trigger (same as calendar) -->
            <CalendarFilterTrigger
              a11y-label="Filtrar por abogado asignado"
              label="Asignado"
              icon="pi pi-user-plus"
              :active="assigneeFilters.length > 0"
              :expanded="assigneePopoverOpen"
              @toggle="(e) => assigneePopoverRef?.toggle(e)"
            >
              <!-- Selected: show AvatarGroup with up to MAX_TRIGGER_AVATARS -->
              <AvatarGroup v-if="triggerAvatars.length > 0" class="wb-filter-avatar-group">
                <Avatar
                  v-for="av in triggerAvatars"
                  :key="av.name"
                  :label="av.initials"
                  shape="circle"
                  size="small"
                  class="wb-filter-avatar"
                  :style="{ background: av.color, color: '#fff' }"
                  :aria-label="av.name"
                  v-tooltip.top="av.name"
                />
                <Avatar
                  v-if="triggerOverflow > 0"
                  :label="`+${triggerOverflow}`"
                  shape="circle"
                  size="small"
                  class="wb-filter-avatar"
                  :style="{ background: 'var(--surface-sunken)', color: 'var(--fg-muted)', border: '1px solid var(--surface-border)' }"
                  :aria-label="triggerOverflowTooltip"
                  v-tooltip.top="triggerOverflowTooltip"
                />
              </AvatarGroup>
              <!-- Only "Sin asignar" selected -->
              <AvatarGroup v-else-if="assigneeFilters.includes('__unassigned')" class="wb-filter-avatar-group">
                <Avatar
                  label="SA"
                  shape="circle"
                  size="small"
                  class="wb-filter-avatar"
                  :style="{ background: 'var(--surface-sunken)', color: 'var(--fg-muted)', border: '1px dashed var(--surface-border)' }"
                  aria-label="Sin asignar"
                  v-tooltip.top="'Sin asignar'"
                />
              </AvatarGroup>
              <!-- Nothing selected: empty icon -->
              <div v-else class="cal-filter-trigger-empty" aria-hidden="true">
                <i class="pi pi-user-plus" />
              </div>
            </CalendarFilterTrigger>

            <Popover
              ref="assigneePopoverRef"
              class="wb-assignee-pop"
              @show="assigneePopoverOpen = true"
              @hide="assigneePopoverOpen = false"
            >
              <div class="wb-assignee-pop__header">
                <p>Abogados asignados</p>
                <button
                  v-if="assigneeFilters.length > 0"
                  type="button"
                  class="wb-assignee-pop__clear"
                  @click="assigneeFilters = []"
                >Limpiar</button>
              </div>
              <ul class="wb-assignee-pop__list" aria-label="Filtrar por asignado">
                <template v-for="opt in assigneeOptions" :key="opt.id">
                  <li v-if="opt.isDivider" class="wb-assignee-pop__divider" aria-hidden="true" />
                  <li v-else>
                    <label
                      :for="`af-${opt.id}`"
                      class="wb-assignee-pop__item"
                      :class="{ 'wb-assignee-pop__item--mine': opt.isMine }"
                    >
                      <Checkbox
                        :model-value="assigneeFilters.includes(opt.id)"
                        binary
                        :input-id="`af-${opt.id}`"
                        @update:model-value="toggleAssigneeFilter(opt.id)"
                      />
                      <!-- "Asignado a mí" avatar with "Yo" badge -->
                      <span
                        v-if="opt.isMine"
                        class="wb-assignee-pop__avatar wb-assignee-pop__avatar--mine"
                        :style="{ background: opt.avatarColor }"
                        aria-hidden="true"
                      >
                        {{ opt.initials }}
                        <span class="wb-assignee-pop__me-badge">Yo</span>
                      </span>
                      <!-- Real user avatar -->
                      <Avatar
                        v-else-if="!opt.isUnassigned"
                        :label="opt.initials"
                        shape="circle"
                        size="small"
                        class="wb-assignee-pop__avatar-pv shrink-0"
                        :style="{ background: hashAvatarColor(opt.name), color: '#fff' }"
                        aria-hidden="true"
                      />
                      <!-- Sin asignar -->
                      <span
                        v-else
                        class="wb-assignee-pop__avatar wb-assignee-pop__avatar--empty"
                        aria-hidden="true"
                      ><i class="pi pi-user-plus" /></span>
                      <span class="wb-assignee-pop__name">{{ opt.name }}</span>
                    </label>
                  </li>
                </template>
              </ul>
            </Popover>

            <button
              v-if="hasActiveFilters"
              type="button"
              class="wb-signal wb-signal--reset"
              @click="clearFilters"
            >
              <i class="pi pi-filter-slash" aria-hidden="true" />
              Limpiar
            </button>
          </div>

          <span
            class="wb-count"
            aria-live="polite"
            aria-atomic="true"
          >
            {{ totalRecords }} expediente{{ totalRecords !== 1 ? 's' : '' }}
          </span>
        </div>
      </div>

      <!-- ── Skeleton ───────────────────────────────────────────────────── -->
      <div v-if="loading" class="wb-skeleton flex-1 min-h-0 overflow-hidden" aria-live="polite" aria-label="Cargando expedientes…">
        <div v-for="n in 10" :key="n" class="wb-skeleton__row">
          <div class="wb-skeleton__col wb-skeleton__col--main">
            <Skeleton shape="circle" size="2rem" />
            <div class="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton height="0.75rem" width="60%" />
              <Skeleton height="0.65rem" width="42%" />
            </div>
          </div>
          <Skeleton height="0.75rem" width="9rem" />
          <Skeleton height="1.2rem" width="6.5rem" border-radius="999px" />
          <div class="wb-assignee">
            <Skeleton shape="circle" size="1.75rem" />
            <Skeleton height="0.65rem" width="4rem" />
          </div>
          <div class="flex gap-1">
            <Skeleton shape="circle" size="1.75rem" />
            <Skeleton shape="circle" size="1.75rem" />
            <Skeleton shape="circle" size="1.75rem" />
          </div>
        </div>
      </div>

      <!-- ── Data table ─────────────────────────────────────────────────── -->
      <DataTable
        v-else
        :value="paginatedRows"
        data-key="id"
        size="small"
        scrollable
        scroll-height="flex"
        row-hover
        :row-class="rowClass"
        class="wb-table flex-1 min-h-0"
        :table-props="{ 'aria-label': 'Tabla de expedientes' }"
      >
        <template #empty>
          <div class="wb-empty">
            <i class="pi pi-folder-open" aria-hidden="true" />
            <h3>Sin expedientes</h3>
            <p>
              {{ hasActiveFilters
                ? 'No hay expedientes que coincidan con los filtros activos.'
                : 'No hay expedientes en este estado.' }}
            </p>
            <Button
              v-if="hasActiveFilters"
              label="Limpiar filtros"
              icon="pi pi-filter-slash"
              size="small"
              outlined
              severity="secondary"
              @click="clearFilters"
            />
          </div>
        </template>

        <!-- ── Col 1: Expediente (fluid — ocupa el espacio sobrante) ──── -->
        <Column
          field="title"
          header="Expediente"
          body-class="wb-col-matter"
        >
          <template #body="{ data }">
            <div class="wb-matter">
              <span class="wb-matter__emoji" aria-hidden="true">{{ data.emoji }}</span>
              <div class="wb-matter__copy">
                <div class="wb-matter__topline">
                  <span class="wb-case" translate="no">{{ data.caseNumber }}</span>
                  <span class="wb-chip">{{ typeLabelFor(m(data)) }}</span>
                  <span class="wb-chip wb-chip--stage">{{ stageFor(m(data)) }}</span>
                  <span v-if="hasSinoe(m(data))" class="wb-chip wb-chip--sinoe" title="Notificación SINOE pendiente">SINOE</span>
                </div>
                <RouterLink
                  :to="`/trackables/${m(data).id}`"
                  class="wb-matter__title"
                >{{ m(data).title }}</RouterLink>
                <p class="wb-matter__client">
                  <i class="pi pi-building" aria-hidden="true" />
                  {{ getClient(m(data).clientId)?.name ?? 'Cliente por asignar' }}
                </p>
              </div>
            </div>
          </template>
        </Column>

        <!-- ── Col 2: Acciones pendientes (ordered by priority) ─────────── -->
        <Column
          header="Por hacer"
          body-class="wb-col-action"
          style="width: 13rem;"
        >
          <template #body="{ data }">
            <div class="wb-actions-cell" role="list" aria-label="Tareas sugeridas">
              <!-- Activity-stat style: compact selectable rows → expediente (tab coherente) -->
              <RouterLink
                v-for="action in getPendingActions(m(data)).slice(0, MAX_VISIBLE_ACTIONS)"
                :key="action.id"
                role="listitem"
                class="wb-action-stat"
                :to="pendingActionTo(m(data), action)"
                v-tooltip.top="action.tooltip"
              >
                <i
                  :class="action.icon"
                  class="wb-action-stat__icon shrink-0 text-[11px]"
                  :style="{ color: action.accent }"
                  aria-hidden="true"
                />
                <span class="wb-action-stat__label">{{ action.label }}</span>
                <i class="pi pi-angle-right wb-action-stat__go shrink-0 text-[10px]" aria-hidden="true" />
              </RouterLink>
              <span
                v-if="getPendingActions(m(data)).length > MAX_VISIBLE_ACTIONS"
                class="wb-action-overflow"
                v-tooltip.top="getPendingActions(m(data)).slice(MAX_VISIBLE_ACTIONS).map((a) => a.label).join(' · ')"
              >
                +{{ getPendingActions(m(data)).length - MAX_VISIBLE_ACTIONS }}
              </span>
            </div>
          </template>
        </Column>

        <!-- ── Col 3: Plazo ─────────────────────────────────────────────── -->
        <Column
          field="deadlineDate"
          header="Plazo"
          sortable
          body-class="wb-col-deadline"
          style="width: 8.5rem;"
        >
          <template #body="{ data }">
            <Tag
              :value="urgencyTag(m(data)).label"
              :severity="urgencyTag(m(data)).severity"
              class="wb-deadline-tag"
            />
          </template>
        </Column>

        <!-- ── Col 4: Involucrados ──────────────────────────────────────── -->
        <Column
          header="Involucrados"
          body-class="wb-col-assignee"
          style="width: 10rem;"
        >
          <template #body="{ data }">
            <div class="wb-involved">
              <!-- Sin asignar -->
              <template v-if="getInvolucrados(m(data)).length === 0">
                <span
                  class="wb-avatar-primary wb-avatar-primary--empty"
                  aria-label="Sin asignar"
                  v-tooltip.top="'Sin asignar'"
                >
                  <i class="pi pi-user-plus" aria-hidden="true" />
                </span>
                <span class="wb-involved__copy">
                  <span class="wb-involved__name wb-involved__name--empty">Sin asignar</span>
                  <span class="wb-involved__role">Responsable</span>
                </span>
              </template>

              <!-- Con involucrados -->
              <template v-else>
                <!--
                  Vertical avatar stack:
                  - Primary (large) on top
                  - Collaborators peeking below, overlapping primary
                  - "+N" button if overflow
                -->
                <div class="wb-inv-stack">
                  <!-- Primary: large, accent ring, z-index highest -->
                  <span
                    class="wb-avatar-primary"
                    :style="{ background: getInvolucrados(m(data))[0]!.color }"
                    :aria-label="`${getInvolucrados(m(data))[0]!.name} – Responsable`"
                    v-tooltip.right="`${getInvolucrados(m(data))[0]!.name} · Responsable`"
                  >
                    {{ getInvolucrados(m(data))[0]!.initials }}
                  </span>

                  <!-- Collaborators: horizontal row, below primary, behind it visually -->
                  <div
                    v-if="getInvolucrados(m(data)).length > 1"
                    class="wb-collab-row"
                  >
                    <span
                      v-for="(inv, idx) in getInvolucrados(m(data)).slice(1)"
                      :key="inv.id"
                      class="wb-avatar-collab--h"
                      :style="{ background: inv.color, zIndex: 3 - idx }"
                      :aria-label="`${inv.name} – ${inv.role}`"
                      v-tooltip.right="`${inv.name} · ${inv.role}`"
                    >
                      {{ inv.initials }}
                    </span>
                  </div>
                </div>

                <!-- Copy: name + role label -->
                <div class="wb-involved__copy">
                  <span class="wb-involved__name">{{ getInvolucrados(m(data))[0]!.name }}</span>
                  <span class="wb-involved__role">Responsable</span>
                  <button
                    v-if="getInvolucrados(m(data)).length > 1"
                    type="button"
                    class="wb-involved__more-link"
                    @click.stop="(e) => openInvolucradosPopover(e, m(data))"
                  >
                    +{{ getInvolucrados(m(data)).length - 1 }} involucrado{{ getInvolucrados(m(data)).length - 1 > 1 ? 's' : '' }}
                  </button>
                </div>
              </template>
            </div>
          </template>
        </Column>

        <!-- ── Col 5: Acciones (editar · archivar · eliminar) ─────────── -->
        <Column
          header="Acciones"
          body-class="wb-col-actions"
          style="width: 8rem;"
        >
          <template #body>
            <div class="wb-row-actions" aria-label="Acciones sobre el expediente">
              <Button
                icon="pi pi-pencil"
                variant="outlined"
                rounded
                size="small"
                severity="secondary"
                aria-label="Editar expediente"
                v-tooltip.top="'Editar'"
              />
              <Button
                icon="pi pi-inbox"
                variant="outlined"
                rounded
                size="small"
                severity="warn"
                aria-label="Archivar expediente"
                v-tooltip.top="'Archivar'"
              />
              <Button
                icon="pi pi-trash"
                variant="outlined"
                rounded
                size="small"
                severity="danger"
                aria-label="Eliminar expediente"
                v-tooltip.top="'Eliminar'"
              />
            </div>
          </template>
        </Column>
      </DataTable>

      <!-- ── Shared involucrados popover ──────────────────────────────────── -->
      <Popover ref="involucradosPopoverRef" class="wb-inv-pop">
        <div class="wb-inv-pop__header">
          <p>Involucrados</p>
        </div>
        <ul class="wb-inv-pop__list">
          <li
            v-for="(inv, idx) in activeInvolucrados"
            :key="inv.id"
            class="wb-inv-pop__item"
          >
            <span
              class="wb-inv-pop__avatar"
              :class="{ 'wb-inv-pop__avatar--primary': idx === 0 }"
              :style="{ background: inv.color }"
              aria-hidden="true"
            >{{ inv.initials }}</span>
            <span class="wb-inv-pop__copy">
              <strong>{{ inv.name }}</strong>
              <small>{{ inv.role }}</small>
            </span>
            <span v-if="idx === 0" class="wb-inv-pop__badge">Responsable</span>
          </li>
        </ul>
      </Popover>

      <!-- ── Fixed footer with pagination ──────────────────────────────── -->
      <div
        v-if="!loading && totalRecords > 0"
        class="wb-footer"
      >
        <Paginator
          :rows="pageSize"
          :total-records="totalRecords"
          :rows-per-page-options="[10, 15, 25, 50]"
          :first="(currentPage - 1) * pageSize"
          template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
          :current-page-report-template="`{first}–{last} de {totalRecords} expedientes`"
          @page="onPageChange"
        />
      </div>

    </div>
  </div>
</template>

<style scoped>
/* ── Root layout ──────────────────────────────────────────────────────────── */
.exp21 {
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ── Toolbar primary band (scope tabs) ───────────────────────────────────── */
.wb-toolbar__primary {
  display: flex;
  align-items: stretch;
  min-height: 2.75rem;
  border-bottom: 1px solid var(--surface-border);
  background: color-mix(in srgb, var(--surface-sunken) 88%, var(--surface-raised));
}

.wb-scope-select {
  align-self: stretch;
  display: flex;
  align-items: stretch;
}

/* Edge-to-edge tabs — no box, no radius, fills band height */
:deep(.wb-scope-select .p-selectbutton) {
  display: flex;
  align-items: stretch;
  min-height: 2.75rem;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  gap: 0;
}

:deep(.wb-scope-select .p-togglebutton),
:deep(.wb-scope-select .p-togglebutton:first-child),
:deep(.wb-scope-select .p-togglebutton:last-child) {
  align-self: stretch;
  flex: 0 0 auto;
  min-height: 2.75rem;
  height: auto;
  border: none;
  border-radius: 0;
  box-shadow: none;
  background: transparent;
  color: var(--fg-muted);
  font-size: 0.8125rem;
  font-weight: 600;
  padding-inline: 1.1rem;
  transition: background-color 0.15s ease, color 0.15s ease;
}

:deep(.wb-scope-select .p-togglebutton-checked),
:deep(.wb-scope-select .p-togglebutton-checked:first-child),
:deep(.wb-scope-select .p-togglebutton-checked:last-child) {
  background: var(--surface-raised);
  box-shadow: inset 0 0 0 1px var(--surface-border);
  color: var(--fg-default);
  border-radius: 0;
}

:deep(.wb-scope-select .p-togglebutton:not(.p-togglebutton-checked)) {
  background: transparent;
  color: var(--fg-muted);
}

:deep(.wb-scope-select .p-togglebutton .p-togglebutton-content),
:deep(.wb-scope-select .p-togglebutton-checked .p-togglebutton-content) {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 2.75rem;
  padding: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  color: inherit;
}

/* ── Workbench card ───────────────────────────────────────────────────────── */
.wb-card {
  /* Fills viewport from where PageHeader ends; never pushes content below screen */
  height: min(84vh, calc(100dvh - 9.5rem));
  min-height: 520px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

/* ── Toolbar ──────────────────────────────────────────────────────────────── */
.wb-toolbar {
  flex-shrink: 0;
  border-bottom: 1px solid var(--surface-border);
  background: var(--surface-raised);
}

.wb-toolbar__row {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0.85rem;
}

.wb-toolbar__row--main {
  gap: 0.6rem;
}

.wb-search {
  min-width: 13rem;
  max-width: min(22rem, 38%);
  flex: 0 0 auto;
}

.wb-search :deep(.p-inputtext) {
  width: 100%;
}

.wb-signals {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem;
}

.wb-signal {
  display: inline-flex;
  align-items: center;
  gap: 0.32rem;
  min-height: 1.875rem;
  border: 1px solid var(--surface-border);
  border-radius: 999px;
  background: var(--surface-raised);
  color: var(--fg-muted);
  cursor: pointer;
  font: inherit;
  font-size: 0.72rem;
  font-weight: 650;
  padding-inline: 0.6rem;
  touch-action: manipulation;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.wb-signal:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--accent) 44%, var(--surface-border));
  outline-offset: 2px;
}

.wb-signal:hover,
.wb-signal--active {
  border-color: color-mix(in srgb, var(--sa, var(--accent)) 38%, var(--surface-border));
  color: var(--fg-default);
}

.wb-signal--active {
  background: color-mix(in srgb, var(--sa, var(--accent)) 11%, var(--surface-raised));
  color: var(--sa, var(--accent));
}

.wb-signal--reset {
  border-color: color-mix(in srgb, var(--accent) 36%, var(--surface-border));
  background: var(--accent-soft);
  color: var(--accent);
  --sa: var(--accent);
}

.wb-count {
  flex-shrink: 0;
  margin-left: auto;
  color: var(--fg-subtle);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* ── Assignee filter avatar (inside CalendarFilterTrigger) ───────────────── */
.wb-filter-avatar-group :deep(.p-avatar) {
  width: 1.375rem;
  height: 1.375rem;
  font-size: 0.52rem;
}

/* ── Assignee Popover ────────────────────────────────────────────────────── */
:deep(.wb-assignee-pop) {
  width: min(100vw - 2rem, 14rem);
}

.wb-assignee-pop__list {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  margin: 0;
  padding: 0.3rem;
  list-style: none;
}

.wb-assignee-pop__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--surface-border);
  padding: 0.55rem 0.75rem 0.45rem;
}

.wb-assignee-pop__header p {
  margin: 0;
  color: var(--fg-muted);
  font-size: 0.67rem;
  font-weight: 750;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.wb-assignee-pop__clear {
  border: none;
  background: none;
  color: var(--accent);
  cursor: pointer;
  font: inherit;
  font-size: 0.7rem;
  font-weight: 650;
  padding: 0;
}

.wb-assignee-pop__clear:hover {
  text-decoration: underline;
}

.wb-assignee-pop__item {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  border-radius: 0.55rem;
  color: var(--fg-default);
  cursor: pointer;
  font-size: 0.82rem;
  padding: 0.45rem 0.55rem;
  transition: background-color 0.1s ease;
}

.wb-assignee-pop__item:hover {
  background: color-mix(in srgb, var(--accent-soft) 60%, transparent);
}

.wb-assignee-pop__item--active {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 650;
}

.wb-assignee-pop__avatar {
  display: inline-grid;
  width: 1.6rem;
  height: 1.6rem;
  flex-shrink: 0;
  place-items: center;
  border-radius: 999px;
  color: var(--fg-on-brand);
  font-size: 0.6rem;
  font-weight: 760;
}

.wb-assignee-pop__avatar--empty,
.wb-assignee-pop__avatar--all {
  background: var(--surface-sunken);
  border: 1px dashed var(--surface-border);
  color: var(--fg-muted);
  font-size: 0.72rem;
}

.wb-assignee-pop__name {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wb-assignee-pop__check {
  flex-shrink: 0;
  color: var(--accent);
  font-size: 0.7rem;
}

.wb-assignee-pop__avatar-pv :deep(.p-avatar) {
  width: 1.6rem;
  height: 1.6rem;
  font-size: 0.6rem;
}

/* Divider between "Asignado a mí" and individual users */
.wb-assignee-pop__divider {
  height: 1px;
  margin: 0.25rem 0.55rem;
  background: var(--surface-border);
}

/* "Asignado a mí" row highlight */
.wb-assignee-pop__item--mine {
  font-weight: 650;
}

/* "Yo" avatar: same as regular but with a relative "Yo" badge */
.wb-assignee-pop__avatar--mine {
  position: relative;
}

.wb-assignee-pop__me-badge {
  position: absolute;
  bottom: -0.25rem;
  right: -0.35rem;
  display: inline-grid;
  place-items: center;
  border: 1.5px solid var(--surface-raised);
  border-radius: 999px;
  background: var(--accent);
  color: var(--fg-on-brand);
  font-size: 0.42rem;
  font-weight: 760;
  line-height: 1;
  padding: 0.08rem 0.22rem;
  pointer-events: none;
}

/* ── Skeleton ─────────────────────────────────────────────────────────────── */
.wb-skeleton {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 0 0.85rem;
}

.wb-skeleton__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 13rem 8.5rem 10rem 8rem;
  align-items: center;
  gap: 1rem;
  border-bottom: 1px solid var(--surface-border);
  padding-block: 0.9rem;
}

.wb-skeleton__col--main {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

/* ── Data table ───────────────────────────────────────────────────────────── */

/* Prevent horizontal overflow — table fills card width exactly */
:deep(.wb-table .p-datatable-table-container) {
  overflow-x: hidden;
}

/* Col 1 (Expediente) takes remaining space */
:deep(.wb-table .p-datatable-thead > tr > th:first-child),
:deep(.wb-table .p-datatable-tbody > tr > td:first-child) {
  width: auto;
}

/* Isolate the assignee cell's stacking context so avatars (z-index: 4)
   never compete with the sticky thead (z-index: 20) */
:deep(.wb-table .wb-col-assignee) {
  isolation: isolate;
}

:deep(.wb-table .p-datatable-thead > tr > th) {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--fg-muted);
  background: var(--surface-sunken);
  padding-block: 0.6rem;
  padding-inline: 0.85rem;
  position: sticky;
  top: 0;
  /* Must be higher than any cell content (avatars, pills, etc.) */
  z-index: 20;
}

:deep(.wb-table .p-datatable-tbody > tr) {
  transition: background-color 0.12s ease;
}

:deep(.wb-table .p-datatable-tbody > tr > td) {
  padding: 0.7rem 0.85rem;
  vertical-align: middle;
  border-bottom: 1px solid var(--surface-border);
}

/* Urgency row tinting */
:deep(.wb-table .wb-row--urgent > td:first-child) {
  border-left: 3px solid #dc2626;
}

:deep(.wb-table .wb-row--warn > td:first-child) {
  border-left: 3px solid #d97706;
}

/* ── Col: Expediente ─────────────────────────────────────────────────────── */
.wb-matter {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  min-width: 0;
}

.wb-matter__emoji {
  display: inline-grid;
  width: 2.1rem;
  height: 2.1rem;
  flex-shrink: 0;
  place-items: center;
  border: 1px solid var(--surface-border);
  border-radius: 0.55rem;
  background: var(--surface-sunken);
  font-size: 1rem;
}

.wb-matter__copy {
  min-width: 0;
  flex: 1;
}

.wb-matter__topline {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.28rem;
  margin-bottom: 0.22rem;
}

.wb-case {
  max-width: min(9rem, 100%);
  overflow: hidden;
  border: 1px solid var(--surface-border);
  border-radius: 0.35rem;
  background: color-mix(in srgb, var(--surface-sunken) 68%, var(--surface-raised));
  color: var(--fg-muted);
  font-size: 0.6rem;
  font-weight: 760;
  letter-spacing: 0.05em;
  padding: 0.1rem 0.35rem;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.wb-chip {
  display: inline-flex;
  align-items: center;
  min-height: 1.1rem;
  border-radius: 999px;
  background: var(--surface-sunken);
  color: var(--fg-muted);
  font-size: 0.6rem;
  font-weight: 760;
  letter-spacing: 0.04em;
  padding-inline: 0.42rem;
  text-transform: uppercase;
}

.wb-chip--stage {
  background: var(--accent-soft);
  color: var(--accent);
}

.wb-chip--sinoe {
  background: color-mix(in srgb, #7c3aed 14%, var(--surface-raised));
  color: #7c3aed;
}

.wb-matter__title {
  display: block;
  margin: 0;
  overflow: hidden;
  color: var(--accent);
  font-size: 0.875rem;
  font-weight: 650;
  line-height: 1.25;
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wb-matter__title:hover {
  text-decoration: underline;
}

.wb-matter__title:focus-visible {
  outline: 2px solid var(--accent-ring);
  outline-offset: 2px;
  border-radius: 2px;
}

.wb-matter__client {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin: 0.2rem 0 0;
  overflow: hidden;
  color: var(--fg-subtle);
  font-size: 0.72rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Col: Por hacer (activity-stat task rows, F4 bespoke) ───────────────── */
.wb-actions-cell {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: stretch;
  gap: 0.2rem;
}

.wb-action-stat {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 1.65rem;
  padding: 0.15rem 0.35rem 0.15rem 0.4rem;
  border-radius: 0.375rem;
  border: 1px solid transparent;
  background: var(--surface-sunken);
  text-decoration: none;
  color: inherit;
  transition: background-color 0.12s ease, border-color 0.12s ease;
}

.wb-action-stat:hover {
  background: color-mix(in srgb, var(--surface-border) 45%, var(--surface-sunken));
  border-color: var(--surface-border);
}

.wb-action-stat:focus-visible {
  outline: 2px solid var(--accent-ring);
  outline-offset: 1px;
}

.wb-action-stat__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--fg-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wb-action-stat__go {
  margin-left: 0.1rem;
  color: var(--fg-subtle);
  opacity: 0.55;
}

.wb-action-stat:hover .wb-action-stat__go {
  opacity: 0.85;
}

/* Overflow badge "+N" */
.wb-action-overflow {
  align-self: flex-start;
  display: inline-grid;
  min-width: 1.45rem;
  min-height: 1.35rem;
  place-items: center;
  border: 1px solid var(--surface-border);
  border-radius: 0.3rem;
  background: var(--surface-raised);
  color: var(--fg-muted);
  font-size: 0.62rem;
  font-weight: 700;
  padding: 0.1rem 0.28rem;
  cursor: default;
}

/* ── Col: Plazo ──────────────────────────────────────────────────────────── */
:deep(.wb-deadline-tag.p-tag) {
  font-size: 0.68rem;
  white-space: nowrap;
}

/* ── Col: Involucrados ───────────────────────────────────────────────────── */
.wb-involved {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
}

/* Stack: primary on top, collab row below — column layout */
.wb-inv-stack {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: center;
  /* Width = primary diameter so collab row centers under it */
  width: 2.15rem;
}

/* Primary (responsable) avatar — largest, accent ring, always on top */
.wb-avatar-primary {
  display: inline-grid;
  width: 2.15rem;
  height: 2.15rem;
  flex-shrink: 0;
  place-items: center;
  border-radius: 999px;
  box-shadow:
    0 0 0 2px var(--surface-raised),
    0 0 0 3.5px color-mix(in srgb, var(--accent) 40%, var(--surface-border));
  color: var(--fg-on-brand);
  font-size: 0.7rem;
  font-weight: 760;
  position: relative;
  /* Only needs to be above collaborators (z-index 2), not above sticky headers */
  z-index: 4;
  cursor: default;
}

.wb-avatar-primary--empty {
  background: var(--surface-sunken);
  border: 1.5px dashed var(--surface-border);
  box-shadow: none;
  color: var(--fg-subtle);
  font-size: 0.82rem;
}

/* Collab row: horizontal, sits just below primary — small overlap so they read as connected */
.wb-collab-row {
  display: flex;
  flex-direction: row;
  justify-content: center;
  margin-top: -0.18rem;   /* tiny touch-up: collabs clearly below, primary not covered */
}

/* Each collaborator avatar — horizontal overlap */
.wb-avatar-collab--h {
  display: inline-grid;
  width: 1.4rem;
  height: 1.4rem;
  place-items: center;
  border-radius: 999px;
  border: 2px solid var(--surface-raised);
  color: var(--fg-on-brand);
  font-size: 0.5rem;
  font-weight: 760;
  margin-left: -0.35rem;
  opacity: 0.9;
  position: relative;
  z-index: 2;   /* always behind the primary (z-index 5) */
  cursor: default;
}

.wb-collab-row .wb-avatar-collab--h:first-child {
  margin-left: 0;
}

.wb-involved__more-link:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--accent) 44%, var(--surface-border));
  outline-offset: 2px;
}

/* Copy block: name + role + "more" link */
.wb-involved__copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 0.06rem;
}

.wb-involved__name {
  overflow: hidden;
  color: var(--fg-default);
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wb-involved__name--empty {
  color: var(--fg-subtle);
  font-style: italic;
  font-weight: 400;
}

.wb-involved__role {
  color: var(--accent);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* Clickable "+N involucrados" text link below the role */
.wb-involved__more-link {
  align-self: flex-start;
  border: none;
  background: none;
  color: var(--fg-subtle);
  cursor: pointer;
  font: inherit;
  font-size: 0.65rem;
  padding: 0;
  transition: color 0.12s ease;
}

.wb-involved__more-link:hover {
  color: var(--accent);
  text-decoration: underline;
}

/* ── Involucrados Popover ─────────────────────────────────────────────────── */
:deep(.wb-inv-pop) {
  width: min(100vw - 2rem, 15rem);
}

.wb-inv-pop__header {
  border-bottom: 1px solid var(--surface-border);
  padding: 0.55rem 0.75rem 0.45rem;
}

.wb-inv-pop__header p {
  margin: 0;
  color: var(--fg-muted);
  font-size: 0.67rem;
  font-weight: 750;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.wb-inv-pop__list {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin: 0;
  padding: 0.35rem;
  list-style: none;
}

.wb-inv-pop__item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  border-radius: 0.55rem;
  padding: 0.5rem 0.55rem;
}

.wb-inv-pop__item:first-child {
  background: color-mix(in srgb, var(--accent-soft) 55%, transparent);
}

.wb-inv-pop__avatar {
  display: inline-grid;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  place-items: center;
  border-radius: 999px;
  color: var(--fg-on-brand);
  font-size: 0.65rem;
  font-weight: 760;
}

.wb-inv-pop__avatar--primary {
  box-shadow:
    0 0 0 2px var(--surface-raised),
    0 0 0 3.5px color-mix(in srgb, var(--accent) 40%, var(--surface-border));
}

.wb-inv-pop__copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 0.08rem;
}

.wb-inv-pop__copy strong {
  overflow: hidden;
  color: var(--fg-default);
  font-size: 0.82rem;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wb-inv-pop__copy small {
  color: var(--fg-subtle);
  font-size: 0.7rem;
}

.wb-inv-pop__badge {
  flex-shrink: 0;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 0.58rem;
  font-weight: 750;
  letter-spacing: 0.04em;
  padding: 0.12rem 0.4rem;
  text-transform: uppercase;
}

/* ── Col: Acciones ───────────────────────────────────────────────────────── */
.wb-row-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

:deep(.wb-row-actions .p-button) {
  width: 1.9rem;
  height: 1.9rem;
  padding: 0;
}

:deep(.wb-row-actions .p-button-icon) {
  font-size: 0.78rem;
}

/* ── Empty state ─────────────────────────────────────────────────────────── */
.wb-empty {
  display: flex;
  min-height: 18rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  color: var(--fg-muted);
  text-align: center;
}

.wb-empty .pi {
  color: var(--fg-subtle);
  font-size: 2.25rem;
}

.wb-empty h3 {
  margin: 0;
  color: var(--fg-default);
  font-size: 1rem;
}

.wb-empty p {
  margin: 0;
  max-width: 24rem;
  font-size: 0.82rem;
}

/* ── Footer / Paginator ──────────────────────────────────────────────────── */
.wb-footer {
  flex-shrink: 0;
  border-top: 1px solid var(--surface-border);
  background: var(--surface-raised);
}

:deep(.wb-footer .p-paginator) {
  padding: 0.35rem 0.75rem;
  background: transparent;
  border: none;
  font-size: 0.78rem;
}

:deep(.wb-footer .p-paginator .p-paginator-current) {
  color: var(--fg-subtle);
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
}

/* ── Responsive ──────────────────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .wb-signal,
  :deep(.wb-table .p-datatable-tbody > tr) {
    transition: none;
  }
}

@container (max-width: 640px) {
  .wb-toolbar__primary {
    min-height: 0;
  }

  :deep(.wb-scope-select .p-selectbutton) {
    width: 100%;
    flex-wrap: wrap;
    min-height: 0;
  }

  :deep(.wb-scope-select .p-togglebutton) {
    flex: 1 1 auto;
    min-height: 2.5rem;
  }

  .wb-toolbar__row--main {
    flex-direction: column;
    align-items: stretch;
  }

  .wb-search {
    max-width: none;
    width: 100%;
  }

  .wb-count {
    margin-left: 0;
  }
}
</style>
