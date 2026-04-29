<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Skeleton from 'primevue/skeleton';
import Paginator from 'primevue/paginator';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import PageHeader from '@/components/common/PageHeader.vue';
import {
  useMockActivityLog,
  MOCK_ACTORS,
  ACTIVITY_CATEGORIES,
  categoryLabel,
  kindLabel,
  kindIcon,
  kindAccentColor,
  actorAvatarColor,
  formatActivityDate,
  type ActivityCategory,
  type ActivityKind,
  type MockActivityEvent,
} from './mocks';

const { events } = useMockActivityLog();

// -----------------------------------------------------------------------
// Filters
// -----------------------------------------------------------------------
const searchQuery = ref('');
const categoryFilter = ref<ActivityCategory | null>(null);
const actorFilter = ref<string | null>(null);
const dateRangeFilter = ref<'24h' | '7d' | '30d' | null>(null);
const currentPage = ref(1);
const pageSize = ref(15);
const loading = ref(false);

const actorFilterOptions = [
  { label: 'Todos los actores', value: null },
  ...MOCK_ACTORS.map((a) => ({ label: a.name, value: a.id })),
];

const dateRangeOptions = [
  { label: 'Cualquier momento', value: null },
  { label: 'Últimas 24h', value: '24h' },
  { label: 'Últimos 7 días', value: '7d' },
  { label: 'Últimos 30 días', value: '30d' },
];

const hasActiveFilters = computed(
  () =>
    !!searchQuery.value.trim() ||
    categoryFilter.value !== null ||
    actorFilter.value !== null ||
    dateRangeFilter.value !== null,
);

function clearFilters() {
  searchQuery.value = '';
  categoryFilter.value = null;
  actorFilter.value = null;
  dateRangeFilter.value = null;
}

function simulateLoad(ms = 350) {
  loading.value = true;
  return new Promise<void>((resolve) =>
    setTimeout(() => {
      loading.value = false;
      resolve();
    }, ms),
  );
}

watch([searchQuery, categoryFilter, actorFilter, dateRangeFilter], async () => {
  currentPage.value = 1;
  await simulateLoad();
});

// -----------------------------------------------------------------------
// Filter helpers
// -----------------------------------------------------------------------
function withinRange(iso: string, range: '24h' | '7d' | '30d'): boolean {
  const ageMs = Date.now() - new Date(iso).getTime();
  const ageH = ageMs / (1000 * 60 * 60);
  if (range === '24h') return ageH <= 24;
  if (range === '7d') return ageH <= 24 * 7;
  return ageH <= 24 * 30;
}

const filteredEvents = computed<MockActivityEvent[]>(() => {
  return events.value.filter((ev) => {
    const q = searchQuery.value.toLowerCase().trim();
    const matchSearch =
      !q ||
      ev.summary.toLowerCase().includes(q) ||
      ev.actor.name.toLowerCase().includes(q) ||
      (ev.contextLabel?.toLowerCase().includes(q) ?? false);
    const matchCategory = categoryFilter.value === null || ev.category === categoryFilter.value;
    const matchActor = actorFilter.value === null || ev.actor.id === actorFilter.value;
    const matchRange = dateRangeFilter.value === null || withinRange(ev.timestamp, dateRangeFilter.value);
    return matchSearch && matchCategory && matchActor && matchRange;
  });
});

const totalRecords = computed(() => filteredEvents.value.length);

const paginatedEvents = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredEvents.value.slice(start, start + pageSize.value);
});

function onPageChange(event: { page: number; rows: number }) {
  currentPage.value = event.page + 1;
  pageSize.value = event.rows;
}
</script>

<template>
  <div class="flex flex-col gap-6">

    <!-- Page header -->
    <PageHeader
      title="Registro de actividad"
      subtitle="Historial cronológico de eventos del despacho. Solo lectura — sin acciones."
    />

    <!-- Main card -->
    <div class="app-card flex flex-col overflow-hidden table-card">

      <!-- Toolbar -->
      <div
        class="flex items-center gap-2 px-4 py-3 flex-wrap"
        style="border-bottom: 1px solid var(--surface-border); background: var(--surface-raised);"
      >
        <IconField class="flex-1 min-w-[220px]">
          <InputIcon class="pi pi-search" style="color: var(--fg-subtle);" />
          <InputText
            v-model="searchQuery"
            placeholder="Buscar en el registro…"
            size="small"
            class="w-full"
          />
        </IconField>

        <Dropdown
          v-model="categoryFilter"
          :options="ACTIVITY_CATEGORIES"
          option-label="label"
          option-value="value"
          placeholder="Categoría"
          show-clear
          size="small"
          class="toolbar-dropdown"
        />

        <Dropdown
          v-model="actorFilter"
          :options="actorFilterOptions"
          option-label="label"
          option-value="value"
          placeholder="Actor"
          show-clear
          size="small"
          class="toolbar-dropdown"
        />

        <Dropdown
          v-model="dateRangeFilter"
          :options="dateRangeOptions"
          option-label="label"
          option-value="value"
          placeholder="Rango"
          show-clear
          size="small"
          class="toolbar-dropdown"
        />

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
          {{ totalRecords }} evento{{ totalRecords !== 1 ? 's' : '' }}
        </span>
      </div>

      <!-- Skeleton -->
      <div v-if="loading" class="flex-1 min-h-0 overflow-auto">
        <div
          v-for="row in 8"
          :key="row"
          class="grid items-center gap-4 px-4 py-3"
          style="grid-template-columns: 110px minmax(180px, 1fr) 130px minmax(220px, 2fr); border-bottom: 1px solid var(--surface-border);"
        >
          <Skeleton height="0.7rem" width="80%" />
          <div class="flex items-center gap-2">
            <Skeleton shape="circle" size="1.75rem" />
            <Skeleton height="0.7rem" width="65%" />
          </div>
          <Skeleton height="1.1rem" width="5rem" border-radius="999px" />
          <Skeleton height="0.75rem" width="85%" />
        </div>
      </div>

      <!-- DataTable -->
      <DataTable
        v-else
        :value="paginatedEvents"
        data-key="id"
        size="small"
        scrollable
        scroll-height="flex"
        row-hover
        responsive-layout="scroll"
        class="flex-1 min-h-0 informational-table"
        :table-props="{ 'aria-label': 'Registro de actividad' }"
      >
        <template #empty>
          <div class="flex flex-col items-center gap-3 py-16" style="color: var(--fg-subtle);">
            <i class="pi pi-history text-4xl opacity-40" />
            <p class="m-0 text-sm">
              {{ hasActiveFilters ? 'Sin eventos con los filtros aplicados' : 'No hay eventos registrados' }}
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

        <!-- Fecha / Hora -->
        <Column header="Fecha / Hora" style="width: 110px;">
          <template #body="{ data }">
            <div class="flex flex-col">
              <span class="text-xs font-medium tabular-nums" style="color: var(--fg-default);">
                {{ formatActivityDate(data.timestamp).date }}
              </span>
              <span class="text-[10px] tabular-nums" style="color: var(--fg-subtle);">
                {{ formatActivityDate(data.timestamp).time }}
              </span>
            </div>
          </template>
        </Column>

        <!-- Actor -->
        <Column header="Actor" style="min-width: 180px;">
          <template #body="{ data }">
            <div class="flex items-center gap-2 min-w-0">
              <div
                class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                :style="{ background: actorAvatarColor(data.actor.id), color: '#fff' }"
              >
                {{ data.actor.initials }}
              </div>
              <div class="flex flex-col min-w-0">
                <span class="text-xs font-medium truncate" style="color: var(--fg-default);">
                  {{ data.actor.name }}
                </span>
                <span class="text-[10px] truncate" style="color: var(--fg-subtle);">
                  {{ data.actor.email }}
                </span>
              </div>
            </div>
          </template>
        </Column>

        <!-- Acción -->
        <Column header="Acción" style="width: 130px;">
          <template #body="{ data }">
            <span
              class="info-action-chip"
              :style="{ '--action-accent': kindAccentColor[data.kind as ActivityKind] } as Record<string, string>"
            >
              <i :class="kindIcon[data.kind as ActivityKind]" class="text-[10px]" />
              {{ kindLabel[data.kind as ActivityKind] }}
            </span>
          </template>
        </Column>

        <!-- Detalle -->
        <Column header="Detalle" style="min-width: 220px;">
          <template #body="{ data }">
            <div class="flex flex-col gap-0.5 min-w-0">
              <span class="text-xs leading-snug" style="color: var(--fg-default);">
                {{ data.summary }}
                <span v-if="data.contextLabel" class="font-semibold" style="color: var(--accent);">
                  «{{ data.contextLabel }}»
                </span>
              </span>
              <span
                v-if="data.detail"
                class="text-[10px] truncate"
                style="color: var(--fg-subtle); font-style: italic;"
              >
                {{ data.detail }}
              </span>
              <span class="info-category-chip" :class="`info-category-chip--${data.category}`">
                {{ categoryLabel[data.category as ActivityCategory] }}
              </span>
            </div>
          </template>
        </Column>
      </DataTable>

      <!-- Paginator -->
      <div
        v-if="!loading && totalRecords > 0"
        style="border-top: 1px solid var(--surface-border); background: var(--surface-raised);"
      >
        <Paginator
          :rows="pageSize"
          :total-records="totalRecords"
          :rows-per-page-options="[10, 15, 25, 50]"
          :first="(currentPage - 1) * pageSize"
          current-page-report-template="{first}–{last} de {totalRecords} eventos"
          template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
          @page="onPageChange"
        />
      </div>
    </div>

  </div>
</template>

<style scoped>
/* -----------------------------------------------------------------------
   Card constraints
----------------------------------------------------------------------- */
.table-card {
  max-height: calc(100vh - 200px);
  min-height: 400px;
}

/* -----------------------------------------------------------------------
   Toolbar dropdowns
----------------------------------------------------------------------- */
:deep(.toolbar-dropdown.p-select),
:deep(.toolbar-dropdown.p-dropdown) {
  min-width: 160px;
  max-width: 200px;
}

/* -----------------------------------------------------------------------
   DataTable density tuning
----------------------------------------------------------------------- */
:deep(.informational-table .p-datatable-thead > tr > th) {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--fg-muted);
  background: var(--surface-sunken);
  padding: 0.625rem 0.75rem;
}

:deep(.informational-table .p-datatable-tbody > tr > td) {
  padding: 0.625rem 0.75rem;
  vertical-align: middle;
}

/* -----------------------------------------------------------------------
   Action chip (kind: create/update/delete...)
----------------------------------------------------------------------- */
.info-action-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.55rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 600;
  border: 1px solid color-mix(in srgb, var(--action-accent) 22%, var(--surface-border));
  background: color-mix(in srgb, var(--action-accent) 9%, var(--surface-raised));
  color: var(--action-accent);
  white-space: nowrap;
}

html.dark .info-action-chip {
  background: color-mix(in srgb, var(--action-accent) 18%, transparent);
}

/* -----------------------------------------------------------------------
   Category mini-chip (under detail line)
----------------------------------------------------------------------- */
.info-category-chip {
  display: inline-block;
  margin-top: 0.25rem;
  padding: 0.05rem 0.4rem;
  border-radius: 4px;
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  width: fit-content;
}

.info-category-chip--expediente {
  background: color-mix(in srgb, #2563eb 12%, var(--surface-raised));
  color: #1d4ed8;
}
.info-category-chip--documento {
  background: color-mix(in srgb, #10b981 12%, var(--surface-raised));
  color: #047857;
}
.info-category-chip--cliente {
  background: color-mix(in srgb, #d97706 12%, var(--surface-raised));
  color: #b45309;
}
.info-category-chip--parte {
  background: var(--surface-sunken);
  color: var(--fg-muted);
}
.info-category-chip--auth {
  background: color-mix(in srgb, #64748b 14%, var(--surface-raised));
  color: #475569;
}
.info-category-chip--workflow {
  background: color-mix(in srgb, #7c3aed 12%, var(--surface-raised));
  color: #6d28d9;
}

html.dark .info-category-chip--expediente {
  background: color-mix(in srgb, #2563eb 28%, transparent);
  color: #93c5fd;
}
html.dark .info-category-chip--documento {
  background: color-mix(in srgb, #10b981 28%, transparent);
  color: #6ee7b7;
}
html.dark .info-category-chip--cliente {
  background: color-mix(in srgb, #d97706 28%, transparent);
  color: #fbbf24;
}
html.dark .info-category-chip--workflow {
  background: color-mix(in srgb, #7c3aed 28%, transparent);
  color: #c4b5fd;
}
</style>
