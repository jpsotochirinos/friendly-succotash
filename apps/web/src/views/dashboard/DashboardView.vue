<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
      <h1 class="text-2xl font-bold dark:text-gray-100">Dashboard</h1>
      <div class="flex items-center gap-3">
        <Dropdown
          v-model="selectedTrackableId"
          :options="trackableOptions"
          option-label="label"
          option-value="value"
          placeholder="Todos los trackables"
          show-clear
          class="w-64"
          @change="onFilterChange"
        />
        <Button icon="pi pi-refresh" text rounded @click="refreshAll" />
      </div>
    </div>

    <!-- Summary cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card v-for="card in summaryCards" :key="card.label">
        <template #content>
          <div class="text-center">
            <div class="text-3xl font-bold" :class="card.color">{{ card.value }}</div>
            <div class="text-sm text-gray-500 dark:text-gray-100 mt-1">{{ card.label }}</div>
          </div>
        </template>
      </Card>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Clientes by status chart -->
      <Card>
        <template #title>Estado de trackables</template>
        <template #content>
          <Chart type="doughnut" :data="trackableChartData" :options="chartOptions" />
        </template>
      </Card>

      <!-- Progress by trackable -->
      <Card>
        <template #title>Progreso por trackable</template>
        <template #content>
          <div class="space-y-3">
            <div v-for="t in progressData" :key="t.id" class="flex items-center gap-3">
              <span class="text-sm font-medium w-40 truncate">{{ t.title }}</span>
              <ProgressBar :value="Number(t.progress_pct)" class="flex-1" />
              <span class="text-xs text-gray-500 w-10 text-right">{{ t.progress_pct }}%</span>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Upcoming deadlines -->
      <Card>
        <template #title>
          <div class="flex items-center gap-2">
            Próximos vencimientos
            <Tag v-if="overdueCount > 0" :value="`${overdueCount} vencidos`" severity="danger" />
          </div>
        </template>
        <template #content>
          <DataTable :value="deadlines" :rows="10" striped-rows size="small">
            <Column field="title" header="Actividad" />
            <Column field="trackable_title" header="Trackable" />
            <Column field="due_date" header="Vencimiento">
              <template #body="{ data }">
                <span :class="{ 'text-red-600 font-bold': isOverdue(data.due_date) }">
                  {{ formatDate(data.due_date) }}
                </span>
              </template>
            </Column>
            <Column field="assigned_to_name" header="Asignado" />
          </DataTable>
        </template>
      </Card>

      <!-- Workload -->
      <Card>
        <template #title>Carga de trabajo por usuario</template>
        <template #content>
          <Chart type="bar" :data="workloadChartData" :options="barChartOptions" />
        </template>
      </Card>
    </div>

    <!-- Global filterable activity list -->
    <Card>
      <template #title>
        <div class="flex items-center justify-between">
          <span>Todas las actividades</span>
          <div class="flex gap-2">
            <Dropdown
              v-model="activityFilters.status"
              :options="statusOptions"
              placeholder="Estado"
              show-clear
              class="w-40"
              @change="loadGlobalActions"
            />
            <Dropdown
              v-model="activityFilters.itemType"
              :options="typeOptions"
              placeholder="Tipo"
              show-clear
              class="w-36"
              @change="loadGlobalActions"
            />
            <ToggleButton
              v-model="activityFilters.overdue"
              on-label="Vencidos"
              off-label="Todos"
              @change="loadGlobalActions"
            />
          </div>
        </div>
      </template>
      <template #content>
        <DataTable
          :value="globalActions"
          :loading="loadingActions"
          paginator
          :rows="20"
          :total-records="globalActionsTotal"
          lazy
          @page="onPageChange"
          striped-rows
        >
          <Column field="title" header="Actividad" />
          <Column field="trackable_title" header="Trackable" />
          <Column field="item_type" header="Tipo">
            <template #body="{ data }">
              <Tag :value="data.item_type" />
            </template>
          </Column>
          <Column field="status" header="Estado">
            <template #body="{ data }">
              <StatusBadge :status="data.status" size="small" />
            </template>
          </Column>
          <Column field="due_date" header="Vencimiento">
            <template #body="{ data }">
              <span v-if="data.due_date" :class="{ 'text-red-600': isOverdue(data.due_date) }">
                {{ formatDate(data.due_date) }}
              </span>
            </template>
          </Column>
          <Column field="assigned_to_name" header="Asignado" />
        </DataTable>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import Card from 'primevue/card';
import Chart from 'primevue/chart';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import ProgressBar from 'primevue/progressbar';
import Tag from 'primevue/tag';
import Dropdown from 'primevue/dropdown';
import ToggleButton from 'primevue/togglebutton';
import Button from 'primevue/button';
import StatusBadge from '@/components/common/StatusBadge.vue';
import { apiClient } from '@/api/client';

const trackableStats = ref<any[]>([]);
const deadlines = ref<any[]>([]);
const overdueItems = ref<any[]>([]);
const workloadData = ref<any[]>([]);
const progressData = ref<any[]>([]);
const globalActions = ref<any[]>([]);
const globalActionsTotal = ref(0);
const loadingActions = ref(false);
const selectedTrackableId = ref<string | null>(null);
const trackableOptions = ref<{label: string; value: string}[]>([]);

const activityFilters = ref({
  status: null as string | null,
  itemType: null as string | null,
  overdue: false,
  page: 1,
});

const statusOptions = ['pending', 'active', 'in_progress', 'under_review', 'validated', 'closed', 'rejected'];
const typeOptions = ['service', 'task', 'action'];

const overdueCount = computed(() => overdueItems.value.length);

const summaryCards = computed(() => {
  const total = trackableStats.value.reduce((s, t) => s + parseInt(t.count), 0);
  const active = trackableStats.value.find((t) => t.status === 'active')?.count || 0;
  return [
    { label: 'Total trackables', value: total, color: 'text-gray-800' },
    { label: 'Activos', value: active, color: 'text-blue-600' },
    { label: 'Vencidos', value: overdueCount.value, color: 'text-red-600' },
    { label: 'Próximos 14 días', value: deadlines.value.length, color: 'text-amber-600' },
  ];
});

const trackableChartData = computed(() => ({
  labels: trackableStats.value.map((t) => t.status),
  datasets: [{
    data: trackableStats.value.map((t) => parseInt(t.count)),
    backgroundColor: ['#94a3b8', '#3b82f6', '#8b5cf6', '#22c55e', '#6b7280'],
  }],
}));

const chartOptions = { responsive: true, plugins: { legend: { position: 'bottom' as const } } };

const workloadChartData = computed(() => ({
  labels: workloadData.value.map((w) => w.first_name || w.email),
  datasets: [
    { label: 'Pendientes', data: workloadData.value.map((w) => w.pending_count), backgroundColor: '#94a3b8' },
    { label: 'En progreso', data: workloadData.value.map((w) => w.in_progress_count), backgroundColor: '#3b82f6' },
    { label: 'En revisión', data: workloadData.value.map((w) => w.under_review_count), backgroundColor: '#8b5cf6' },
  ],
}));

const barChartOptions = { responsive: true, scales: { x: { stacked: true }, y: { stacked: true } } };

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-PE', { month: 'short', day: 'numeric' });
}

function isOverdue(d: string) {
  return new Date(d) < new Date();
}

async function loadDashboard() {
  const params = selectedTrackableId.value ? { trackableId: selectedTrackableId.value } : {};
  const [stats, dl, overdue, wl, prog] = await Promise.all([
    apiClient.get('/dashboard/trackables-by-status', { params }),
    apiClient.get('/dashboard/upcoming-deadlines', { params }),
    apiClient.get('/dashboard/overdue', { params }),
    apiClient.get('/dashboard/workload', { params }),
    apiClient.get('/dashboard/progress', { params }),
  ]);
  trackableStats.value = stats.data;
  deadlines.value = dl.data;
  overdueItems.value = overdue.data;
  workloadData.value = wl.data;
  progressData.value = prog.data;
}

async function loadGlobalActions() {
  loadingActions.value = true;
  const { data } = await apiClient.get('/dashboard/global-actions', {
    params: {
      status: activityFilters.value.status || undefined,
      itemType: activityFilters.value.itemType || undefined,
      overdue: activityFilters.value.overdue || undefined,
      page: activityFilters.value.page,
      limit: 20,
      trackableId: selectedTrackableId.value || undefined,
    },
  });
  globalActions.value = data.data;
  globalActionsTotal.value = data.total;
  loadingActions.value = false;
}

function onFilterChange() {
  loadDashboard();
  loadGlobalActions();
}

function refreshAll() {
  loadDashboard();
  loadGlobalActions();
}

function onPageChange(event: any) {
  activityFilters.value.page = event.page + 1;
  loadGlobalActions();
}

onMounted(() => {
  apiClient.get('/trackables').then(({ data }) => {
    trackableOptions.value = data.data.map((t: any) => ({ label: t.title, value: t.id }));
  });
  loadDashboard();
  loadGlobalActions();
});
</script>
