<template>
  <div class="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <h1 class="text-xl font-semibold text-gray-800 dark:text-gray-100">{{ trackableTitle }}</h1>
      <div class="flex gap-2">
        <Button
          icon="pi pi-refresh"
          label="Recargar"
          size="small"
          outlined
          @click="refreshCurrentTab"
        />
        <Button
          v-if="activeTab === 0"
          icon="pi pi-plus"
          label="Agregar item"
          size="small"
          @click="showCreateDialog = true"
        />
      </div>
    </div>

    <TabView v-model:activeIndex="activeTab" class="flex-1 flex flex-col trackable-tabs">
      <!-- Tab 1: Flujo (Kanban) -->
      <TabPanel :value="0" header="Flujo">
        <div class="flex-1 overflow-x-auto p-4">
          <div class="flex gap-4 h-full">
            <div
              v-for="col in columns"
              :key="col.key"
              class="min-w-[280px] flex-shrink-0 flex flex-col rounded-lg shadow-sm"
              :class="col.bg"
            >
              <div
                class="px-4 py-3 rounded-t-lg border-t-4 flex items-center justify-between"
                :class="col.border"
              >
                <span class="font-semibold text-gray-700 dark:text-gray-200">{{ col.label }}</span>
                <Tag :value="String(columnItems(col.key).length)" rounded severity="secondary" />
              </div>

              <div class="flex-1 overflow-y-auto p-3 space-y-3">
                <div
                  v-for="item in columnItems(col.key)"
                  :key="item.id"
                  class="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-600 cursor-pointer hover:shadow-md transition-shadow"
                  @click="openSidebar(item)"
                >
                  <div class="flex items-start justify-between gap-2 mb-2">
                    <span class="font-medium text-gray-800 dark:text-gray-100 text-sm leading-tight">{{ item.title }}</span>
                    <Tag
                      :value="itemTypeLabel(item.itemType)"
                      :severity="itemTypeSeverity(item.itemType)"
                      class="flex-shrink-0"
                    />
                  </div>
                  <div v-if="item.assignedTo" class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <i class="pi pi-user mr-1" />{{ item.assignedTo.firstName || item.assignedTo.email }}
                  </div>
                  <div v-if="item.dueDate" class="text-xs" :class="isOverdue(item.dueDate) ? 'text-red-500 font-semibold' : 'text-gray-500 dark:text-gray-400'">
                    <i class="pi pi-calendar mr-1" />{{ formatDate(item.dueDate) }}
                    <span v-if="isOverdue(item.dueDate)"> — Vencido</span>
                  </div>
                </div>

                <div
                  v-if="columnItems(col.key).length === 0"
                  class="text-center text-sm text-gray-400 dark:text-gray-500 py-8"
                >
                  Sin items
                </div>
                <div>
                  <Button
                    v-if="activeTab === 0 && col.label === 'Pendiente' "
                    icon="pi pi-plus"
                    label="Agregar item"
                    size="small"
                    severity="secondary"
                    variant="text"
                    @click="showCreateDialog = true"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </TabPanel>

      <!-- Tab 2: Carpetas -->
      <TabPanel :value="1" header="Carpetas">
        <FolderBrowserView :trackable-id="trackableId" />
      </TabPanel>

      <!-- Tab 3: Calendario -->
      <TabPanel :value="2" header="Calendario">
        <div class="p-6 space-y-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <Button icon="pi pi-chevron-left" text rounded size="small" @click="prevMonth" />
              <h2 class="text-lg font-semibold dark:text-gray-100 min-w-[200px] text-center">
                {{ calendarMonthLabel }}
              </h2>
              <Button icon="pi pi-chevron-right" text rounded size="small" @click="nextMonth" />
            </div>
            <Button label="Hoy" size="small" outlined @click="goToday" />
          </div>

          <div class="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
            <div
              v-for="day in weekDays"
              :key="day"
              class="bg-gray-100 dark:bg-gray-800 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 py-2"
            >
              {{ day }}
            </div>
            <div
              v-for="cell in calendarCells"
              :key="cell.dateStr"
              class="bg-white dark:bg-gray-900 min-h-[100px] p-1.5"
              :class="{ 'opacity-40': !cell.currentMonth }"
            >
              <div class="text-xs font-medium mb-1" :class="cell.isToday ? 'text-blue-600 font-bold' : 'text-gray-500 dark:text-gray-400'">
                {{ cell.day }}
              </div>
              <div class="space-y-0.5">
                <div
                  v-for="ev in cell.events"
                  :key="ev.id"
                  class="text-xs px-1.5 py-0.5 rounded truncate cursor-pointer"
                  :class="calendarEventClass(ev)"
                  :title="ev.title"
                  @click="openSidebar(ev)"
                >
                  {{ ev.title }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </TabPanel>

      <!-- Tab 4: Actividades -->
      <TabPanel :value="3" header="Actividades">
        <div class="p-6 space-y-4">
          <div class="flex items-center justify-between flex-wrap gap-3">
            <h2 class="text-lg font-semibold dark:text-gray-100">Actividades del cliente</h2>
            <div class="flex gap-2 items-center">
              <Button
                v-if="activeTab === 3"
                icon="pi pi-plus"
                label="Agregar actividad"
                size="small"
                severity="secondary"
                variant="text"
                @click="showCreateDialog = true"
              />
              <Dropdown
                v-model="activityStatusFilter"
                :options="statusFilterOptions"
                placeholder="Estado"
                show-clear
                class="w-44"
              />
              <Dropdown
                v-model="activityTypeFilter"
                :options="itemTypeOptions"
                option-label="label"
                option-value="value"
                placeholder="Tipo"
                show-clear
                class="w-40"
              />
            </div>
          </div>

          <DataTable
            :value="filteredActivities"
            paginator
            :rows="20"
            striped-rows
          >
            <Column field="title" header="Actividad">
              <template #body="{ data }">
                <span
                  class="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium"
                  @click="openSidebar(data)"
                >
                  {{ data.title }}
                </span>
              </template>
            </Column>
            <Column field="itemType" header="Tipo">
              <template #body="{ data }">
                <Tag :value="itemTypeLabel(data.itemType)" :severity="itemTypeSeverity(data.itemType)" />
              </template>
            </Column>
            <Column field="status" header="Estado">
              <template #body="{ data }">
                <StatusBadge :status="data.status" />
              </template>
            </Column>
            <Column field="assignedTo" header="Asignado">
              <template #body="{ data }">
                <span class="dark:text-gray-300">{{ data.assignedTo?.firstName || data.assignedTo?.email || '-' }}</span>
              </template>
            </Column>
            <Column header="Fecha inicio">
              <template #body="{ data }">
                <span v-if="data.startDate" class="dark:text-gray-300">{{ formatDate(data.startDate) }}</span>
                <span v-else class="text-gray-400">-</span>
              </template>
            </Column>
            <Column header="Vencimiento">
              <template #body="{ data }">
                <span v-if="data.dueDate" :class="isOverdue(data.dueDate) ? 'text-red-500 font-semibold' : 'dark:text-gray-300'">
                  {{ formatDate(data.dueDate) }}
                </span>
                <span v-else class="text-gray-400">-</span>
              </template>
            </Column>
          </DataTable>
        </div>
      </TabPanel>

      <!-- Tab 5: Resumen (Dashboard) -->
      <TabPanel :value="4" header="Resumen">
        <div class="p-6 space-y-6">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold dark:text-gray-100">Resumen del cliente</h2>
            <Button icon="pi pi-refresh" text rounded @click="loadDashboardData" />
          </div>

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
            <Card>
              <template #title>Estado de actividades</template>
              <template #content>
                <Chart type="doughnut" :data="dashboardChartData" :options="doughnutOptions" />
              </template>
            </Card>

            <Card>
              <template #title>Progreso</template>
              <template #content>
                <div class="space-y-3">
                  <div v-for="prog in dashboardProgress" :key="prog.id" class="flex items-center gap-3">
                    <span class="text-sm font-medium w-40 truncate">{{ prog.title }}</span>
                    <ProgressBar :value="Number(prog.progress_pct)" class="flex-1" />
                    <span class="text-xs text-gray-500 w-10 text-right">{{ prog.progress_pct }}%</span>
                  </div>
                  <div v-if="dashboardProgress.length === 0" class="text-sm text-gray-400 text-center py-4">
                    Sin datos de progreso
                  </div>
                </div>
              </template>
            </Card>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <template #title>
                <div class="flex items-center gap-2">
                  Próximos vencimientos
                  <Tag v-if="dashboardOverdueCount > 0" :value="`${dashboardOverdueCount} vencidos`" severity="danger" />
                </div>
              </template>
              <template #content>
                <DataTable :value="dashboardDeadlines" :rows="10" striped-rows size="small">
                  <Column field="title" header="Actividad" />
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

            <Card>
              <template #title>Carga de trabajo por usuario</template>
              <template #content>
                <Chart type="bar" :data="dashboardWorkloadData" :options="barChartOptions" />
              </template>
            </Card>
          </div>
        </div>
      </TabPanel>
    </TabView>

    <!-- Item detail sidebar -->
    <div
      v-if="editingItem"
      class="fixed top-0 right-0 h-full w-[520px] bg-white dark:bg-gray-800 shadow-2xl border-l border-gray-200 dark:border-gray-700 z-50 flex flex-col"
    >
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">Detalle del item</h2>
        <Button icon="pi pi-times" text rounded @click="closeSidebar" />
      </div>

      <div class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-2 flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Título</label>
            <InputText v-model="editingItem.title" class="w-full" />
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tipo</label>
            <Dropdown
              v-model="editingItem.itemType"
              :options="itemTypeOptions"
              option-label="label"
              option-value="value"
              placeholder="Seleccionar tipo"
              class="w-full"
              @change="initDeliverables(editingItem!.itemType)"
            />
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Estado</label>
            <p class="text-sm text-gray-800 dark:text-gray-100 py-2">{{ statusLabel(editingItem.status) }}</p>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Asignado a</label>
            <Dropdown
              v-model="editingAssignedToId"
              :options="userOptions"
              option-label="label"
              option-value="value"
              placeholder="Seleccionar usuario"
              filter
              show-clear
              class="w-full"
            />
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Prioridad</label>
            <Dropdown
              v-model="editingPriority"
              :options="priorityOptions"
              option-label="label"
              option-value="value"
              placeholder="Seleccionar prioridad"
              show-clear
              class="w-full"
            />
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Fecha de inicio</label>
            <Calendar
              :model-value="dateFromIso(editingItem.startDate)"
              date-format="dd/mm/yy"
              show-icon
              class="w-full"
              @update:model-value="onEditStartDate"
            />
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Fecha límite</label>
            <Calendar
              :model-value="dateFromIso(editingItem.dueDate)"
              date-format="dd/mm/yy"
              show-icon
              class="w-full"
              @update:model-value="onEditDueDate"
            />
          </div>

          <div class="col-span-2 flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Creado el</label>
            <p class="text-sm text-gray-800 dark:text-gray-100 py-2">
              {{ editingItem.createdAt ? formatDate(editingItem.createdAt) : '—' }}
            </p>
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Detalle / Descripción</label>
          <Textarea
            v-model="editingItem.description"
            rows="3"
            auto-resize
            placeholder="Descripción del item..."
            class="w-full"
          />
        </div>

        <div class="flex justify-end">
          <Button
            label="Guardar cambios"
            icon="pi pi-check"
            size="small"
            :loading="itemSaving"
            @click="saveItem"
          />
        </div>

        <div v-if="availableTransitions.length > 0" class="border-t border-gray-200 dark:border-gray-600 pt-4">
          <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2 block">Transiciones</label>
          <div class="flex flex-wrap gap-2">
            <Button
              v-for="t in availableTransitions"
              :key="t.to"
              :label="t.label"
              size="small"
              outlined
              @click="handleTransition(editingItem!.id, t.to)"
            />
          </div>
        </div>

        <!-- Deliverables -->
        <div class="border-t border-gray-200 dark:border-gray-600 pt-4">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Entregables</label>
              <Tag
                :value="`${deliverablesProgress}%`"
                :severity="deliverablesProgress === 100 ? 'success' : deliverablesProgress > 50 ? 'warn' : 'info'"
                class="text-xs"
              />
            </div>
          </div>

          <div class="space-y-1">
            <div
              v-for="(d, idx) in currentDeliverables"
              :key="idx"
              class="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <Checkbox v-model="d.done" :binary="true" />
              <span
                class="text-sm"
                :class="d.done ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-700 dark:text-gray-200'"
              >
                {{ d.label }}
              </span>
            </div>
          </div>
        </div>

        <!-- Documents -->
        <div class="border-t border-gray-200 dark:border-gray-600 pt-4">
          <div class="flex items-center justify-between mb-3">
            <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Documentos</label>
            <div class="flex gap-1">
              <Button
                icon="pi pi-upload"
                text
                rounded
                size="small"
                v-tooltip="'Subir archivo'"
                @click="triggerFileUpload"
              />
              <Button
                icon="pi pi-file-edit"
                text
                rounded
                size="small"
                v-tooltip="'Nuevo documento'"
                @click="showNewDocDialog = true"
              />
            </div>
          </div>

          <div v-if="documentsLoading" class="text-center py-2">
            <i class="pi pi-spin pi-spinner text-gray-400 text-sm" />
          </div>

          <div v-else-if="itemDocuments.length === 0" class="text-xs text-gray-400 dark:text-gray-500 py-4 text-center">
            Sin documentos
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="doc in itemDocuments"
              :key="doc.id"
              class="p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors"
              @click="router.push(`/documents/${doc.id}/edit`)"
            >
              <div class="flex items-center gap-2 mb-1">
                <i class="pi pi-file text-xs text-gray-500" />
                <span class="font-medium text-gray-700 dark:text-gray-200 truncate">{{ doc.title }}</span>
              </div>
              <div v-if="doc.reviewStatus" class="text-xs text-gray-500 dark:text-gray-400">
                {{ doc.reviewStatus }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="editingItem"
      class="fixed inset-0 bg-black/20 z-40"
      @click="closeSidebar"
    />

    <Dialog
      v-model:visible="showCreateDialog"
      header="Nuevo item de workflow"
      :modal="true"
      :style="{ width: '480px' }"
    >
      <div class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Título *</label>
          <InputText v-model="newItem.title" placeholder="Título del item" />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Tipo *</label>
          <Dropdown
            v-model="newItem.itemType"
            :options="itemTypeOptions"
            option-label="label"
            option-value="value"
            placeholder="Seleccionar tipo"
          />
        </div>

        <div v-if="newItem.itemType === 'action'" class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de acción</label>
          <Dropdown
            v-model="newItem.actionType"
            :options="actionTypeOptions"
            option-label="label"
            option-value="value"
            placeholder="Seleccionar tipo de acción"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Asignado a</label>
          <Dropdown
            v-model="newItem.assignedToId"
            :options="userOptions"
            option-label="label"
            option-value="value"
            placeholder="Seleccionar usuario"
            filter
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Item padre</label>
          <Dropdown
            v-model="newItem.parentId"
            :options="parentOptions"
            option-label="label"
            option-value="value"
            placeholder="Ninguno"
            show-clear
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Fecha inicio</label>
          <Calendar v-model="newItem.dueDate" date-format="dd/mm/yy" show-icon />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Fecha límite</label>
          <Calendar v-model="newItem.startDate" date-format="dd/mm/yy" show-icon />
        </div>
      </div>

      <template #footer>
        <Button label="Cancelar" text @click="showCreateDialog = false" />
        <Button label="Crear" :disabled="!newItem.title || !newItem.itemType" @click="createItem" />
      </template>
    </Dialog>

    <Dialog
      v-model:visible="showNewDocDialog"
      header="Nuevo documento"
      :modal="true"
      :style="{ width: '480px' }"
    >
      <div class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1">
          <label for="new-doc-title" class="text-sm font-medium text-gray-700 dark:text-gray-300">Título *</label>
          <InputText id="new-doc-title" v-model="newDocTitle" placeholder="Título del documento" />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Carpeta destino</label>
          <Dropdown
            v-model="newDocFolderId"
            :options="folderOptions"
            option-label="label"
            option-value="value"
            placeholder="Seleccionar carpeta"
            :disabled="folderOptions.length === 0"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Plantilla (opcional)</label>
          <div v-if="selectedTemplateDoc" class="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <i class="pi pi-file-word text-blue-500" />
            <span class="flex-1 text-sm text-blue-700 dark:text-blue-300 truncate">{{ selectedTemplateDoc.title }}</span>
            <Button icon="pi pi-times" text rounded size="small" severity="secondary" @click="selectedTemplateDoc = null" />
          </div>
          <Button
            v-else
            label="Buscar plantilla"
            icon="pi pi-search"
            outlined
            size="small"
            severity="secondary"
            @click="showTemplateSearch = true"
          />
        </div>
      </div>

      <template #footer>
        <Button label="Cancelar" text @click="closeNewDocDialog" />
        <Button
          label="Crear"
          icon="pi pi-check"
          :disabled="!newDocTitle || !newDocFolderId"
          @click="createDocument"
        />
      </template>
    </Dialog>

    <TemplateSearchDialog
      v-model:visible="showTemplateSearch"
      @select="onTemplateSelected"
      @create-blank="showTemplateSearch = false"
    />

    <input
      ref="uploadInputRef"
      type="file"
      style="display: none"
      @change="handleFileUpload"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import Dialog from 'primevue/dialog';
import Calendar from 'primevue/calendar';
import Tag from 'primevue/tag';
import Textarea from 'primevue/textarea';
import Checkbox from 'primevue/checkbox';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Card from 'primevue/card';
import Chart from 'primevue/chart';
import ProgressBar from 'primevue/progressbar';
import { useToast } from 'primevue/usetoast';
import { apiClient } from '@/api/client';
import TemplateSearchDialog from '@/components/documents/TemplateSearchDialog.vue';
import StatusBadge from '@/components/common/StatusBadge.vue';
import FolderBrowserView from '@/views/documents/FolderBrowserView.vue';

interface AssignedUser {
  id?: string;
  firstName?: string;
  email: string;
}

interface WorkflowItem {
  id: string;
  title: string;
  itemType: string;
  status: string;
  description?: string;
  startDate?: string;
  dueDate?: string;
  createdAt?: string;
  assignedTo?: AssignedUser;
  metadata?: Record<string, unknown>;
}

const route = useRoute();
const router = useRouter();
const toast = useToast();
const trackableId = route.params.id as string;

const activeTab = ref(0);
const items = ref<WorkflowItem[]>([]);
const trackableTitle = ref('');
const selectedItem = ref<WorkflowItem | null>(null);
const editingItem = ref<WorkflowItem | null>(null);
const itemSaving = ref(false);
const availableTransitions = ref<Array<{ to: string; label: string }>>([]);
const showCreateDialog = ref(false);
const users = ref<Array<{ id: string; firstName?: string; email: string }>>([]);

const rootFolderId = ref<string | null>(null);
const folders = ref<Array<{ id: string; name: string; emoji?: string; parent?: { id: string } }>>([]);
const newDocFolderId = ref<string | null>(null);
const selectedTemplateDoc = ref<any>(null);
const showTemplateSearch = ref(false);
const itemDocuments = ref<Array<{ id: string; title: string; reviewStatus: string; mimeType?: string }>>([]);
const documentsLoading = ref(false);
const showNewDocDialog = ref(false);
const newDocTitle = ref('');
const uploadInputRef = ref<HTMLInputElement | null>(null);

const folderOptions = computed(() => {
  const options: { label: string; value: string }[] = [];
  function addFolder(folder: any, depth: number) {
    const prefix = '\u00A0\u00A0'.repeat(depth * 2) + (depth > 0 ? '└ ' : '');
    const emoji = folder.emoji ? `${folder.emoji} ` : '';
    options.push({ label: prefix + emoji + folder.name, value: folder.id });
    folders.value
      .filter((f) => f.parent?.id === folder.id)
      .forEach((child) => addFolder(child, depth + 1));
  }
  folders.value.filter((f) => !f.parent).forEach((f) => addFolder(f, 0));
  return options;
});

const columns = [
  { key: 'pending', label: 'Pendiente', bg: 'bg-gray-100 dark:bg-gray-800', border: 'border-gray-400' },
  { key: 'active', label: 'Activo', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-500' },
  { key: 'in_progress', label: 'En progreso', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-500' },
  { key: 'under_review', label: 'En revisión', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-500' },
  { key: 'validated', label: 'Validado', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-500' },
  { key: 'closed', label: 'Cerrado', bg: 'bg-gray-50 dark:bg-gray-800', border: 'border-gray-400' },
];

const statusMap: Record<string, string> = {
  pending: 'Pendiente',
  active: 'Activo',
  in_progress: 'En progreso',
  under_review: 'En revisión',
  validated: 'Validado',
  closed: 'Cerrado',
};

const itemTypeOptions = [
  { label: 'Servicio', value: 'service' },
  { label: 'Tarea', value: 'task' },
  { label: 'Acción', value: 'action' },
];

const actionTypeOptions = [
  { label: 'Creación de doc', value: 'doc_creation' },
  { label: 'Carga de doc', value: 'doc_upload' },
  { label: 'Revisión', value: 'doc_review' },
  { label: 'Aprobación', value: 'approval' },
  { label: 'Firma digital', value: 'digital_sign' },
  { label: 'Personalizado', value: 'custom' },
];

const priorityOptions = [
  { label: 'Alta', value: 'high' },
  { label: 'Media', value: 'medium' },
  { label: 'Baja', value: 'low' },
];

const editingPriority = computed({
  get: () => (editingItem.value?.metadata?.priority as string) ?? '',
  set: (val: string) => {
    if (!editingItem.value) return;
    if (!editingItem.value.metadata) editingItem.value.metadata = {};
    editingItem.value.metadata.priority = val;
  },
});

const editingAssignedToId = computed({
  get: () => editingItem.value?.assignedTo?.id ?? '',
  set: (val: string) => {
    if (!editingItem.value) return;
    const user = users.value.find((u) => u.id === val);
    editingItem.value.assignedTo = user
      ? { id: user.id, firstName: user.firstName, email: user.email }
      : undefined;
  },
});

const newItem = ref({
  title: '',
  itemType: '',
  actionType: '',
  assignedToId: '',
  parentId: '',
  dueDate: null as Date | null,
  startDate: null as Date | null,
});

const userOptions = computed(() =>
  users.value.map((u) => ({
    label: u.firstName ? `${u.firstName} (${u.email})` : u.email,
    value: u.id,
  })),
);

const parentOptions = computed(() =>
  items.value.map((i) => ({ label: i.title, value: i.id })),
);

function columnItems(status: string): WorkflowItem[] {
  return items.value.filter((i) => i.status === status);
}

function itemTypeLabel(type: string): string {
  const map: Record<string, string> = { service: 'Servicio', task: 'Tarea', action: 'Acción' };
  return map[type] ?? type;
}

function itemTypeSeverity(type: string): string {
  const map: Record<string, string> = { service: 'info', task: 'warn', action: 'secondary' };
  return map[type] ?? 'info';
}

function statusLabel(status: string): string {
  return statusMap[status] ?? status;
}

function isOverdue(dateStr: string): boolean {
  return new Date(dateStr) < new Date();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function dateFromIso(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function oneDate(value: Date | Date[] | (Date | null)[] | null | undefined): Date | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function onEditStartDate(value: Date | Date[] | (Date | null)[] | null | undefined) {
  if (!editingItem.value) return;
  const date = oneDate(value);
  editingItem.value.startDate = date ? date.toISOString() : undefined;
}

function onEditDueDate(value: Date | Date[] | (Date | null)[] | null | undefined) {
  if (!editingItem.value) return;
  const date = oneDate(value);
  editingItem.value.dueDate = date ? date.toISOString() : undefined;
}

// ── Data loading ───────────────────────────────────────────────────────────────
async function loadItems() {
  const { data } = await apiClient.get(`/trackables/${trackableId}/tree`);
  items.value = data;
}

async function loadTrackable() {
  const { data } = await apiClient.get(`/trackables/${trackableId}`);
  trackableTitle.value = data.title ?? `Trackable ${trackableId}`;
}

async function loadUsers() {
  const { data } = await apiClient.get('/users', { params: { limit: 100 } });
  users.value = Array.isArray(data) ? data : data.data;
}

async function loadFolders() {
  try {
    const { data } = await apiClient.get(`/folders/trackable/${trackableId}`);
    folders.value = Array.isArray(data) ? data : [];
    if (folders.value.length > 0) {
      rootFolderId.value = folders.value[0].id;
      newDocFolderId.value = folders.value[0].id;
    }
  } catch (error) {
    console.error('Error cargando carpetas:', error);
  }
}

async function loadItemDocuments(itemId: string) {
  try {
    documentsLoading.value = true;
    const { data } = await apiClient.get('/documents', { params: { workflowItemId: itemId } });
    itemDocuments.value = Array.isArray(data) ? data : data.data || [];
  } catch (error) {
    console.error('Error cargando documentos:', error);
    itemDocuments.value = [];
  } finally {
    documentsLoading.value = false;
  }
}

function refreshCurrentTab() {
  if (activeTab.value === 0) loadItems();
  else if (activeTab.value === 2) loadItems();
  else if (activeTab.value === 3) loadItems();
  else if (activeTab.value === 4) loadDashboardData();
}

// ── Sidebar ────────────────────────────────────────────────────────────────────
async function openSidebar(item: WorkflowItem) {
  selectedItem.value = item;
  editingItem.value = { ...item, metadata: item.metadata ? { ...item.metadata } : {} };
  initDeliverables(item.itemType);
  const { data } = await apiClient.get(`/workflow-items/${item.id}/transitions`);
  availableTransitions.value = data;
  await loadItemDocuments(item.id);
}

function closeSidebar() {
  selectedItem.value = null;
  editingItem.value = null;
  currentDeliverables.value = [];
}

async function saveItem() {
  if (!editingItem.value) return;
  try {
    itemSaving.value = true;
    await apiClient.patch(`/workflow-items/${editingItem.value.id}`, {
      title: editingItem.value.title,
      itemType: editingItem.value.itemType,
      description: editingItem.value.description,
      assignedToId: editingItem.value.assignedTo?.id || undefined,
      startDate: editingItem.value.startDate,
      dueDate: editingItem.value.dueDate,
      metadata: editingItem.value.metadata,
    });
    await loadItems();
    const refreshed = items.value.find((i) => i.id === editingItem.value!.id);
    if (refreshed) {
      selectedItem.value = refreshed;
      editingItem.value = { ...refreshed, metadata: refreshed.metadata ? { ...refreshed.metadata } : {} };
    }
    toast.add({ severity: 'success', summary: 'Item actualizado', life: 3000 });
  } catch {
    toast.add({ severity: 'error', summary: 'Error al guardar', life: 3000 });
  } finally {
    itemSaving.value = false;
  }
}

async function handleTransition(itemId: string, targetStatus: string) {
  await apiClient.patch(`/workflow-items/${itemId}/transition`, { status: targetStatus });
  await loadItems();
  if (editingItem.value?.id === itemId) {
    const refreshed = items.value.find((i) => i.id === itemId);
    if (refreshed) await openSidebar(refreshed);
  }
}

async function createItem() {
  const payload: Record<string, unknown> = {
    title: newItem.value.title,
    itemType: newItem.value.itemType,
    trackableId,
  };
  if (newItem.value.actionType && newItem.value.itemType === 'action') {
    payload.actionType = newItem.value.actionType;
  }
  if (newItem.value.assignedToId) payload.assignedToId = newItem.value.assignedToId;
  if (newItem.value.parentId) payload.parentId = newItem.value.parentId;
  if (newItem.value.dueDate) payload.dueDate = newItem.value.dueDate.toISOString();

  await apiClient.post('/workflow-items', payload);
  showCreateDialog.value = false;
  newItem.value = { title: '', itemType: '', actionType: '', assignedToId: '', parentId: '', dueDate: null, startDate: null };
  await loadItems();
  toast.add({ severity: 'success', summary: 'Item creado', life: 3000 });
}

// ── File upload & documents ────────────────────────────────────────────────────
function triggerFileUpload() {
  uploadInputRef.value?.click();
}

async function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  const uploadFolderId = rootFolderId.value;
  if (!file || !editingItem.value || !uploadFolderId) return;

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name.replace(/\.[^/.]+$/, ''));
    formData.append('folderId', uploadFolderId);
    formData.append('trackableId', trackableId);
    formData.append('workflowItemId', editingItem.value.id);

    await apiClient.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    await loadItemDocuments(editingItem.value.id);
    toast.add({ severity: 'success', summary: 'Archivo subido', life: 3000 });
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error al subir archivo', life: 3000 });
  }

  input.value = '';
}

function onTemplateSelected(template: any) {
  selectedTemplateDoc.value = template;
  if (!newDocTitle.value) {
    newDocTitle.value = template.title;
  }
}

function closeNewDocDialog() {
  showNewDocDialog.value = false;
  newDocTitle.value = '';
  selectedTemplateDoc.value = null;
  if (folders.value.length > 0) {
    newDocFolderId.value = folders.value[0].id;
  }
}

async function createDocument() {
  if (!newDocTitle.value || !editingItem.value || !newDocFolderId.value) return;

  try {
    let docId: string;

    if (selectedTemplateDoc.value) {
      const { data } = await apiClient.post(`/documents/${selectedTemplateDoc.value.id}/copy`, {
        targetFolderId: newDocFolderId.value,
        targetWorkflowItemId: editingItem.value.id,
        trackableId,
      });
      docId = data.id;
      await apiClient.patch(`/documents/${docId}`, { title: newDocTitle.value });
    } else {
      const { data } = await apiClient.post('/documents/create-blank', {
        title: newDocTitle.value,
        folderId: newDocFolderId.value,
        trackableId,
        workflowItemId: editingItem.value.id,
      });
      docId = data.id;
    }

    closeNewDocDialog();
    await loadItemDocuments(editingItem.value.id);
    router.push(`/documents/${docId}/edit`);
    toast.add({ severity: 'success', summary: 'Documento creado', life: 3000 });
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error al crear documento', life: 3000 });
  }
}

// ── Deliverables ───────────────────────────────────────────────────────────────
const deliverablesByType: Record<string, string[]> = {
  service: [
    'Definición del servicio',
    'Asignación de recursos',
    'Ejecución del servicio',
    'Control de calidad',
    'Entrega al cliente',
    'Cierre y documentación',
  ],
  task: [
    'Análisis de requerimientos',
    'Planificación de actividades',
    'Ejecución de la tarea',
    'Revisión de resultados',
    'Entrega final',
  ],
  action: [
    'Preparación de la acción',
    'Ejecución',
    'Verificación',
    'Registro de resultados',
  ],
};

interface Deliverable {
  label: string;
  done: boolean;
}

const currentDeliverables = ref<Deliverable[]>([]);

function initDeliverables(itemType: string) {
  const labels = deliverablesByType[itemType] ?? deliverablesByType.action;
  currentDeliverables.value = labels.map((label) => ({ label, done: false }));
}

const deliverablesProgress = computed(() => {
  const total = currentDeliverables.value.length;
  if (total === 0) return 0;
  const done = currentDeliverables.value.filter((d) => d.done).length;
  return Math.round((done / total) * 100);
});

// ── Calendar tab ───────────────────────────────────────────────────────────────
const calendarDate = ref(new Date());
const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const calendarMonthLabel = computed(() => {
  const d = calendarDate.value;
  return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
});

function prevMonth() {
  const d = new Date(calendarDate.value);
  d.setMonth(d.getMonth() - 1);
  calendarDate.value = d;
}

function nextMonth() {
  const d = new Date(calendarDate.value);
  d.setMonth(d.getMonth() + 1);
  calendarDate.value = d;
}

function goToday() {
  calendarDate.value = new Date();
}

const calendarCells = computed(() => {
  const year = calendarDate.value.getFullYear();
  const month = calendarDate.value.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  let startDay = firstDay.getDay() - 1;
  if (startDay < 0) startDay = 6;

  const cells: Array<{
    dateStr: string;
    day: number;
    currentMonth: boolean;
    isToday: boolean;
    events: WorkflowItem[];
  }> = [];

  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - startDay);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalCells = Math.ceil((startDay + lastDay.getDate()) / 7) * 7;

  for (let i = 0; i < totalCells; i++) {
    const cellDate = new Date(startDate);
    cellDate.setDate(startDate.getDate() + i);
    const dateStr = cellDate.toISOString().split('T')[0];

    const events = items.value.filter((item) => {
      if (!item.startDate && !item.dueDate) return false;
      const itemStart = item.startDate ? new Date(item.startDate).toISOString().split('T')[0] : null;
      const itemEnd = item.dueDate ? new Date(item.dueDate).toISOString().split('T')[0] : null;

      if (itemStart && itemEnd) return dateStr >= itemStart && dateStr <= itemEnd;
      if (itemStart) return dateStr === itemStart;
      if (itemEnd) return dateStr === itemEnd;
      return false;
    });

    cells.push({
      dateStr,
      day: cellDate.getDate(),
      currentMonth: cellDate.getMonth() === month,
      isToday: cellDate.getTime() === today.getTime(),
      events,
    });
  }

  return cells;
});

const calendarPalette = [
  'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
  'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
  'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
  'bg-lime-100 dark:bg-lime-900/40 text-lime-700 dark:text-lime-300',
  'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300',
  'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300',
  'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300',
  'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300',
  'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300',
  'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
  'bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-700 dark:text-fuchsia-300',
  'bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300',
  'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300',
];

function calendarEventClass(item: WorkflowItem): string {
  let hash = 0;
  for (let i = 0; i < item.id.length; i++) {
    hash = (hash * 31 + item.id.charCodeAt(i)) >>> 0;
  }
  return calendarPalette[hash % calendarPalette.length];
}

// ── Activities tab ─────────────────────────────────────────────────────────────
const activityStatusFilter = ref<string | null>(null);
const activityTypeFilter = ref<string | null>(null);
const statusFilterOptions = ['pending', 'active', 'in_progress', 'under_review', 'validated', 'closed'];

const filteredActivities = computed(() => {
  let result = items.value;
  if (activityStatusFilter.value) {
    result = result.filter((i) => i.status === activityStatusFilter.value);
  }
  if (activityTypeFilter.value) {
    result = result.filter((i) => i.itemType === activityTypeFilter.value);
  }
  return result;
});

// ── Dashboard / Resumen tab ────────────────────────────────────────────────────
const dashboardStats = ref<any[]>([]);
const dashboardDeadlines = ref<any[]>([]);
const dashboardOverdue = ref<any[]>([]);
const dashboardWorkload = ref<any[]>([]);
const dashboardProgress = ref<any[]>([]);

const dashboardOverdueCount = computed(() => dashboardOverdue.value.length);

const summaryCards = computed(() => {
  const total = dashboardStats.value.reduce((s, t) => s + parseInt(t.count), 0);
  const active = dashboardStats.value.find((t: any) => t.status === 'active')?.count || 0;
  return [
    { label: 'Total actividades', value: total, color: 'text-gray-800 dark:text-gray-100' },
    { label: 'Activos', value: active, color: 'text-blue-600' },
    { label: 'Vencidos', value: dashboardOverdueCount.value, color: 'text-red-600' },
    { label: 'Próximos 14 días', value: dashboardDeadlines.value.length, color: 'text-amber-600' },
  ];
});

const dashboardChartData = computed(() => ({
  labels: dashboardStats.value.map((t: any) => t.status),
  datasets: [{
    data: dashboardStats.value.map((t: any) => parseInt(t.count)),
    backgroundColor: ['#94a3b8', '#3b82f6', '#8b5cf6', '#22c55e', '#6b7280'],
  }],
}));

const doughnutOptions = { responsive: true, plugins: { legend: { position: 'bottom' as const } } };

const dashboardWorkloadData = computed(() => ({
  labels: dashboardWorkload.value.map((w: any) => w.first_name || w.email),
  datasets: [
    { label: 'Pendientes', data: dashboardWorkload.value.map((w: any) => w.pending_count), backgroundColor: '#94a3b8' },
    { label: 'En progreso', data: dashboardWorkload.value.map((w: any) => w.in_progress_count), backgroundColor: '#3b82f6' },
    { label: 'En revisión', data: dashboardWorkload.value.map((w: any) => w.under_review_count), backgroundColor: '#8b5cf6' },
  ],
}));

const barChartOptions = { responsive: true, scales: { x: { stacked: true }, y: { stacked: true } } };

async function loadDashboardData() {
  const params = { trackableId };
  const [stats, dl, overdue, wl, prog] = await Promise.all([
    apiClient.get('/dashboard/trackables-by-status', { params }),
    apiClient.get('/dashboard/upcoming-deadlines', { params }),
    apiClient.get('/dashboard/overdue', { params }),
    apiClient.get('/dashboard/workload', { params }),
    apiClient.get('/dashboard/progress', { params }),
  ]);
  dashboardStats.value = stats.data;
  dashboardDeadlines.value = dl.data;
  dashboardOverdue.value = overdue.data;
  dashboardWorkload.value = wl.data;
  dashboardProgress.value = prog.data;
}

const dashboardLoaded = ref(false);
watch(activeTab, (newTab) => {
  if (newTab === 4 && !dashboardLoaded.value) {
    dashboardLoaded.value = true;
    loadDashboardData();
  }
});

// ── Mount ──────────────────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([loadTrackable(), loadItems(), loadUsers(), loadFolders()]);

  const targetItemId = route.query.workflowItemId as string | undefined;
  if (targetItemId) {
    const target = items.value.find((i) => i.id === targetItemId);
    if (target) {
      await openSidebar(target);
    }
  }
});
</script>

<style scoped>
.trackable-tabs :deep(.p-tabview-panels) {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
}

.trackable-tabs :deep(.p-tabview-panel) {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.trackable-tabs :deep(.p-tabview-nav) {
  padding: 0 1.5rem;
}
</style>
