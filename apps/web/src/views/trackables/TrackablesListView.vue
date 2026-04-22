<template>
  <div class="flex flex-col gap-6">
    <div v-if="!authReady" class="flex justify-center py-20">
      <ProgressSpinner />
    </div>
    <template v-else-if="!canTrackableRead">
      <div class="flex flex-col items-center justify-center gap-3 py-16 text-center text-[var(--fg-muted)]">
        <i class="pi pi-lock text-4xl opacity-60" />
        <p class="m-0">{{ t('trackables.noPermission') }}</p>
      </div>
    </template>
    <template v-else>
    <ConfirmDialog />

    <PageHeader :title="t('trackables.title')" :subtitle="t('trackables.pageSubtitle')">
      <template #actions>
        <Button
          v-if="canTrackableCreate && listScope === 'active'"
          :label="t('trackables.newMatter')"
          icon="pi pi-plus"
          size="small"
          @click="showCreateDialog = true"
        />
      </template>
    </PageHeader>

    <SelectButton
      v-model="listScope"
      :options="scopeOptions"
      option-label="label"
      option-value="value"
      :allow-empty="false"
      class="scope-tabs"
    />

    <template v-if="listScope === 'trash'">
      <template v-if="!canDocRead">
        <div class="flex flex-col items-center justify-center gap-3 py-16 text-center text-[var(--fg-muted)]">
          <i class="pi pi-lock text-4xl opacity-60" />
          <p>{{ t('trackables.trashNoPermission') }}</p>
        </div>
      </template>
      <template v-else>
        <DataTable
          v-if="trashDocuments.length > 0 || trashLoading"
          :value="trashDocuments"
          :loading="trashLoading"
          paginator
          :rows="20"
          striped-rows
        >
          <Column field="title" :header="t('trackables.docTitle')">
            <template #body="{ data }">
              <div class="flex items-center gap-2">
                <i :class="getFileIcon(data.mimeType)" />
                <span class="text-[var(--fg-default)]">{{ data.title }}</span>
              </div>
            </template>
          </Column>
          <Column field="deletedAt" :header="t('trackables.trashDeletedAt')" sortable>
            <template #body="{ data }">
              <span class="text-[var(--fg-muted)]">
                {{ new Date(data.deletedAt).toLocaleDateString('es-PE') }}
              </span>
            </template>
          </Column>
          <Column v-if="canDocUpdate || canDocDelete" :header="t('common.actions')">
            <template #body="{ data }">
              <div class="flex gap-1">
                <Button
                  v-if="canDocUpdate"
                  icon="pi pi-replay"
                  text
                  rounded
                  size="small"
                  @click="restoreDocument(data)"
                />
                <Button
                  v-if="canDocDelete"
                  icon="pi pi-trash"
                  text
                  rounded
                  severity="danger"
                  size="small"
                  @click="permanentDeleteDocument(data)"
                />
              </div>
            </template>
          </Column>
        </DataTable>
        <div
          v-else-if="!trashLoading"
          class="flex flex-col items-center justify-center py-20 text-[var(--fg-subtle)]"
        >
          <i class="pi pi-trash text-5xl mb-4" />
          <p class="text-lg">{{ t('trackables.trashEmpty') }}</p>
        </div>
      </template>
    </template>

    <template v-else>
    <div class="flex flex-wrap gap-3 items-center">
      <InputText
        v-model="filters.search"
        :placeholder="t('trackables.searchPlaceholder')"
        class="w-72"
        @input="resetAndLoad"
      />
      <Dropdown
        v-if="listScope === 'active'"
        v-model="filters.status"
        :options="statusFilterOptions"
        option-label="label"
        option-value="value"
        placeholder="Estado"
        show-clear
        class="min-w-[11rem]"
        @change="resetAndLoad"
      />
      <Dropdown
        v-model="filters.type"
        :options="typeSelectOptions"
        option-label="label"
        option-value="value"
        :placeholder="t('trackables.typeLabel')"
        show-clear
        class="w-40"
        @change="resetAndLoad"
      />
    </div>

    <DataTable
      :value="trackables"
      :loading="loading"
      paginator
      lazy
      :rows="rows"
      :total-records="totalRecords"
      :first="first"
      striped-rows
      @page="onPage"
    >
      <Column field="title" header="Título">
        <template #body="{ data }">
          <router-link
            :to="`/trackables/${data.id}`"
            class="text-accent hover:underline font-medium"
          >
            {{ data.title }}
          </router-link>
        </template>
      </Column>
      <Column field="type" :header="t('trackables.typeLabel')">
        <template #body="{ data }">
          <Tag :value="typeLabel(data.type)" :severity="typeSeverity(data.type)" />
        </template>
      </Column>
      <Column field="status" header="Estado">
        <template #body="{ data }">
          <StatusBadge :status="data.status" />
        </template>
      </Column>
      <Column field="assignedTo" header="Asignado">
        <template #body="{ data }">
          <span class="text-[var(--fg-muted)]">{{ data.assignedTo?.name || data.assignedTo?.email || '-' }}</span>
        </template>
      </Column>
      <Column field="dueDate" header="Vencimiento">
        <template #body="{ data }">
          <span v-if="data.dueDate" class="text-[var(--fg-muted)]">
            {{ new Date(data.dueDate).toLocaleDateString('es-PE', { month: 'short', day: 'numeric', year: 'numeric' }) }}
          </span>
          <span v-else class="text-[var(--fg-subtle)]">-</span>
        </template>
      </Column>
      <Column v-if="rowHasTrackableActions" header="Acciones">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button
              v-if="canTrackableUpdate"
              icon="pi pi-pencil"
              text
              rounded
              size="small"
              v-tooltip.top="'Editar expediente'"
              @click="openEditDialog(data)"
            />
            <Button
              v-if="canTrackableUpdate && listScope === 'active'"
              icon="pi pi-inbox"
              text
              rounded
              size="small"
              v-tooltip.top="'Archivar'"
              @click="archiveTrackable(data)"
            />
            <Button
              v-if="canTrackableUpdate && listScope === 'archived'"
              icon="pi pi-replay"
              text
              rounded
              size="small"
              severity="success"
              v-tooltip.top="'Volver a activar'"
              @click="reactivateTrackable(data)"
            />
            <Button
              v-if="canTrackableDelete"
              icon="pi pi-trash"
              text
              rounded
              size="small"
              severity="danger"
              v-tooltip.top="'Eliminar o archivar'"
              @click="openDeleteWizard(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>
    </template>

    <Dialog
      v-model:visible="showCreateDialog"
      header="Nuevo expediente"
      :modal="true"
      :style="{ width: 'min(520px, 96vw)' }"
      @show="onCreateDialogShow"
    >
      <div class="pt-2">
        <p class="text-xs text-[var(--fg-muted)] m-0 mb-4">
          Paso {{ createWizardStep + 1 }} de 3 · Identificación, partes y plantilla de actuaciones
        </p>

        <div v-show="createWizardStep === 0" class="flex flex-col gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-[var(--fg-default)]">Título</label>
            <InputText v-model="newTrackable.title" placeholder="Nombre del expediente" autofocus />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-[var(--fg-default)]">Materia / tipo de servicio</label>
            <Dropdown
              v-model="newTrackable.matterType"
              :options="matterTypeOptions"
              option-label="label"
              option-value="value"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-[var(--fg-default)]">{{ t('trackables.typeLabel') }}</label>
            <Dropdown
              v-model="newTrackable.type"
              :options="typeSelectOptions"
              option-label="label"
              option-value="value"
              :placeholder="t('trackables.typePlaceholder')"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-[var(--fg-default)]">N.º de expediente</label>
            <InputText v-model="newTrackable.expedientNumber" placeholder="Opcional" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-[var(--fg-default)]">Juzgado / órgano</label>
            <InputText v-model="newTrackable.court" placeholder="Opcional" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-[var(--fg-default)]">Jurisdicción (código)</label>
            <InputText v-model="newTrackable.jurisdiction" maxlength="8" placeholder="PE" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-[var(--fg-default)]">Descripción</label>
            <Textarea v-model="newTrackable.description" rows="2" placeholder="Opcional" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-[var(--fg-default)]">Fecha de vencimiento</label>
            <Calendar v-model="newTrackable.dueDate" date-format="dd/mm/yy" placeholder="dd/mm/aaaa" show-icon />
          </div>
        </div>

        <div v-show="createWizardStep === 1" class="flex flex-col gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-[var(--fg-default)]">Cliente</label>
            <Dropdown
              v-model="newTrackable.clientId"
              :options="clientsOptions"
              option-label="name"
              option-value="id"
              placeholder="Seleccionar cliente"
              filter
              show-clear
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-[var(--fg-default)]">Contraparte</label>
            <InputText v-model="newTrackable.counterpartyName" placeholder="Nombre o razón social (opcional)" />
          </div>
        </div>

        <div v-show="createWizardStep === 2" class="flex flex-col gap-4">
          <p class="text-sm text-[var(--fg-muted)] m-0">
            Podés aplicar una plantilla de actuaciones al crear el expediente, o dejarlo vacío y armar el flujo después.
          </p>
          <div v-if="wizardTemplatesLoading" class="flex justify-center py-6">
            <ProgressSpinner style="width: 36px; height: 36px" stroke-width="4" />
          </div>
          <div v-else class="flex flex-col gap-1">
            <label class="text-sm font-medium text-[var(--fg-default)]">Plantilla (opcional)</label>
            <Dropdown
              v-model="createWizardTemplateId"
              :options="wizardTemplateOptions"
              option-label="label"
              option-value="value"
              placeholder="Sin plantilla"
              filter
              show-clear
            />
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" text @click="closeCreateDialog" />
        <Button
          v-if="createWizardStep > 0"
          label="Atrás"
          severity="secondary"
          @click="createWizardStep -= 1"
        />
        <Button
          v-if="createWizardStep < 2"
          label="Siguiente"
          icon="pi pi-arrow-right"
          icon-pos="right"
          :disabled="createWizardStep === 0 && (!newTrackable.title?.trim() || !newTrackable.type)"
          @click="createWizardStep += 1"
        />
        <Button
          v-if="createWizardStep === 2"
          label="Crear expediente"
          icon="pi pi-check"
          :disabled="!newTrackable.title?.trim() || !newTrackable.type"
          :loading="creating"
          @click="createTrackable"
        />
      </template>
    </Dialog>

    <Dialog
      v-model:visible="showEditDialog"
      header="Editar expediente"
      :modal="true"
      :style="{ width: '640px' }"
      @hide="resetEditForm"
    >
      <div v-if="editLoading" class="flex justify-center py-10">
        <ProgressSpinner />
      </div>
      <div v-else class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-[var(--fg-default)]">Título</label>
          <InputText v-model="editForm.title" placeholder="Título" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-[var(--fg-default)]">{{ t('trackables.typeLabel') }}</label>
          <Dropdown
            v-model="editForm.type"
            :options="typeSelectOptions"
            option-label="label"
            option-value="value"
            :placeholder="t('trackables.typeLabel')"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-[var(--fg-default)]">Estado</label>
          <Dropdown
            v-model="editForm.status"
            :options="trackableStatusEditOptions"
            option-label="label"
            option-value="value"
            placeholder="Estado"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-[var(--fg-default)]">Cliente</label>
          <Dropdown
            v-model="editForm.clientId"
            :options="clientsOptions"
            option-label="name"
            option-value="id"
            placeholder="Seleccionar cliente"
            filter
            show-clear
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-[var(--fg-default)]">Contraparte</label>
          <InputText v-model="editForm.counterpartyName" placeholder="Nombre de la contraparte" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-[var(--fg-default)]">Tipo de servicio</label>
          <Dropdown
            v-model="editForm.matterType"
            :options="matterTypeOptions"
            option-label="label"
            option-value="value"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-[var(--fg-default)]">Abogado a cargo</label>
          <Dropdown
            v-model="editForm.assignedToId"
            :options="userOptions"
            option-label="label"
            option-value="value"
            placeholder="Sin asignar"
            filter
            show-clear
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-[var(--fg-default)]">Descripción</label>
          <Textarea v-model="editForm.description" rows="3" placeholder="Descripción (opcional)" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-[var(--fg-default)]">Fecha de vencimiento</label>
          <Calendar v-model="editForm.dueDate" date-format="dd/mm/yy" placeholder="dd/mm/aaaa" show-icon />
        </div>
        <router-link
          v-if="editingId"
          :to="`/trackables/${editingId}`"
          class="text-sm text-accent hover:underline inline-flex items-center gap-1"
          @click="showEditDialog = false"
        >
          <i class="pi pi-external-link text-xs" />
          Abrir expediente
        </router-link>
      </div>
      <template #footer>
        <Button label="Cancelar" text @click="showEditDialog = false" />
        <Button
          label="Guardar"
          icon="pi pi-check"
          :disabled="!editForm.title?.trim() || !editForm.type || savingEdit"
          :loading="savingEdit"
          @click="saveEdit"
        />
      </template>
    </Dialog>

    <Dialog
      v-model:visible="showDeleteWizard"
      :header="deleteWizardTitle"
      :modal="true"
      :closable="deletePhase !== 'running'"
      :close-on-escape="deletePhase !== 'running'"
      :style="{ width: deletePhase === 'choose' ? '520px' : '560px' }"
      @hide="resetDeleteWizard"
    >
      <div v-if="deletePhase === 'choose'" class="flex flex-col gap-4 pt-1">
        <p class="text-sm text-[var(--fg-muted)]">
          ¿Qué querés hacer con <span class="font-semibold">{{ deleteTarget?.title }}</span>?
        </p>
        <p class="text-sm text-[var(--fg-subtle)]">
          <strong>Archivar</strong> oculta el expediente del trabajo diario pero conserva todo.
          <strong>Eliminar</strong> borra permanentemente documentos, carpetas y el flujo.
        </p>
        <div class="flex flex-col sm:flex-row gap-2">
          <Button
            v-if="canTrackableUpdate"
            label="Archivar expediente"
            icon="pi pi-inbox"
            class="flex-1"
            outlined
            @click="archiveFromWizard"
          />
          <Button
            label="Eliminar permanentemente…"
            icon="pi pi-times"
            severity="danger"
            class="flex-1"
            @click="deletePhase = 'confirmText'"
          />
        </div>
      </div>

      <div v-else-if="deletePhase === 'confirmText'" class="flex flex-col gap-4 pt-1">
        <p class="text-sm text-[var(--fg-muted)]">
          Esta acción no se puede deshacer. Escribí <strong>eliminar</strong> para continuar.
        </p>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-[var(--fg-default)]">Confirmación</label>
          <InputText
            v-model="deleteConfirmText"
            placeholder="eliminar"
            autocomplete="off"
            @keyup.enter="canSubmitDeleteWord && runPermanentDelete()"
          />
        </div>
        <div class="flex justify-end gap-2">
          <Button label="Volver" text @click="deletePhase = 'choose'; deleteConfirmText = ''" />
          <Button
            label="Continuar"
            icon="pi pi-arrow-right"
            severity="danger"
            :disabled="!canSubmitDeleteWord"
            @click="runPermanentDelete"
          />
        </div>
      </div>

      <div v-else-if="deletePhase === 'running' || deletePhase === 'done'" class="flex flex-col gap-4 pt-1">
        <Steps
          v-model:active-step="deleteProgressStep"
          :model="deleteProgressModel"
          :readonly="true"
          class="w-full"
        />
        <div v-if="deletePhase === 'running'" class="flex items-center gap-2 text-sm text-[var(--fg-muted)]">
          <ProgressSpinner style="width: 28px; height: 28px" stroke-width="4" />
          <span>Eliminando datos del expediente…</span>
        </div>
        <div v-else class="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
          <i class="pi pi-check-circle" />
          <span>Expediente eliminado correctamente.</span>
        </div>
      </div>

      <div v-else-if="deletePhase === 'error'" class="flex flex-col gap-3 pt-1">
        <p class="text-sm text-red-600 dark:text-red-400">
          No se pudo eliminar el expediente. Probá de nuevo o contactá soporte si persiste.
        </p>
        <Button label="Cerrar" @click="showDeleteWizard = false" />
      </div>

      <template v-if="deletePhase === 'done'" #footer>
        <Button label="Cerrar" icon="pi pi-times" @click="showDeleteWizard = false" />
      </template>
    </Dialog>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import ProgressSpinner from 'primevue/progressspinner';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import Dialog from 'primevue/dialog';
import Textarea from 'primevue/textarea';
import Calendar from 'primevue/calendar';
import Tag from 'primevue/tag';
import SelectButton from 'primevue/selectbutton';
import Steps from 'primevue/steps';
import ConfirmDialog from 'primevue/confirmdialog';
import { useConfirm } from 'primevue/useconfirm';
import StatusBadge from '@/components/common/StatusBadge.vue';
import PageHeader from '@/components/common/PageHeader.vue';
import { apiClient } from '@/api/client';
import { usePermissions } from '@/composables/usePermissions';
import { useAuthStore } from '@/stores/auth.store';
import { useToast } from 'primevue/usetoast';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const confirm = useConfirm();
const { can } = usePermissions();
const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

type ListScope = 'active' | 'archived' | 'trash';

const authReady = computed(() => user.value != null);
const canTrackableRead = computed(() => can('trackable:read'));
const canTrackableCreate = computed(() => can('trackable:create'));
const canTrackableUpdate = computed(() => can('trackable:update'));
const canTrackableDelete = computed(() => can('trackable:delete'));
const canDocRead = computed(() => can('document:read'));
const canDocUpdate = computed(() => can('document:update'));
const canDocDelete = computed(() => can('document:delete'));
const rowHasTrackableActions = computed(
  () => canTrackableUpdate.value || canTrackableDelete.value,
);

const scopeOptions = computed(() => {
  const opts: { label: string; value: ListScope }[] = [
    { label: t('trackables.scopeActive'), value: 'active' },
    { label: t('trackables.scopeArchived'), value: 'archived' },
  ];
  if (canDocRead.value) {
    opts.push({ label: t('nav.trash'), value: 'trash' });
  }
  return opts;
});

const trashDocuments = ref<any[]>([]);
const trashLoading = ref(false);

const trackables = ref<any[]>([]);
const loading = ref(false);
const totalRecords = ref(0);
const first = ref(0);
const rows = ref(20);

const filters = ref({
  search: '',
  status: null as string | null,
  type: null as string | null,
});

const listScope = ref<ListScope>(
  route.query.scope === 'trash' ? 'trash' : 'active',
);

const statusFilterOptions = [
  { label: 'Creado', value: 'created' },
  { label: 'Activo', value: 'active' },
  { label: 'En revisión', value: 'under_review' },
  { label: 'Completado', value: 'completed' },
];
const typeOptions = ['case', 'process', 'project', 'audit'];
const typeSelectOptions = computed(() =>
  typeOptions.map((value) => ({ value, label: t(`trackables.types.${value}`) })),
);
function typeLabel(value: string): string {
  if (!value) return '';
  const key = `trackables.types.${value}`;
  const translated = t(key);
  return translated === key ? value : translated;
}

const trackableStatusEditOptions = [
  { label: 'Creado', value: 'created' },
  { label: 'Activo', value: 'active' },
  { label: 'En revisión', value: 'under_review' },
  { label: 'Completado', value: 'completed' },
  { label: 'Archivado', value: 'archived' },
];

const matterTypeOptions = [
  { label: 'Litigio', value: 'litigation' },
  { label: 'Corporativo', value: 'corporate' },
  { label: 'Laboral', value: 'labor' },
  { label: 'Familia', value: 'family' },
  { label: 'Tributario', value: 'tax' },
  { label: 'Penal', value: 'criminal' },
  { label: 'Administrativo', value: 'administrative' },
  { label: 'Asesoría', value: 'advisory' },
  { label: 'Inmobiliario', value: 'real_estate' },
  { label: 'Otro', value: 'other' },
];

const clientsOptions = ref<Array<{ id: string; name: string }>>([]);
const users = ref<Array<{ id: string; firstName?: string; email: string }>>([]);
const userOptions = computed(() =>
  users.value.map((u) => ({
    label: u.firstName ? `${u.firstName} (${u.email})` : u.email,
    value: u.id,
  })),
);

async function loadClientsForCase() {
  try {
    const { data } = await apiClient.get('/clients', { params: { limit: 500 } });
    const list = Array.isArray(data?.data) ? data.data : [];
    clientsOptions.value = list.map((cl: { id: string; name: string }) => ({
      id: cl.id,
      name: cl.name,
    }));
  } catch {
    clientsOptions.value = [];
  }
}

async function loadUsers() {
  try {
    const { data } = await apiClient.get('/users', { params: { limit: 100 } });
    users.value = Array.isArray(data) ? data : data.data;
  } catch {
    users.value = [];
  }
}

const showCreateDialog = ref(false);
const creating = ref(false);
const createWizardStep = ref(0);
const createWizardTemplateId = ref<string | null>(null);
const wizardTemplatesRaw = ref<Array<{ id: string; name: string }>>([]);
const wizardTemplatesLoading = ref(false);
const wizardTemplateOptions = computed(() =>
  wizardTemplatesRaw.value.map((t) => ({ label: t.name, value: t.id })),
);

const newTrackable = ref({
  title: '',
  type: null as string | null,
  matterType: 'other' as string,
  description: '',
  dueDate: null as Date | null,
  expedientNumber: '',
  court: '',
  jurisdiction: 'PE',
  clientId: null as string | null,
  counterpartyName: '',
});

async function onCreateDialogShow() {
  createWizardStep.value = 0;
  createWizardTemplateId.value = null;
  await loadClientsForCase();
  wizardTemplatesLoading.value = true;
  try {
    const { data } = await apiClient.get('/workflow-templates', { params: { includeSystem: true } });
    wizardTemplatesRaw.value = Array.isArray(data) ? data : [];
  } catch {
    wizardTemplatesRaw.value = [];
  } finally {
    wizardTemplatesLoading.value = false;
  }
}

const showEditDialog = ref(false);
const editLoading = ref(false);
const savingEdit = ref(false);
const editingId = ref<string | null>(null);
const editForm = ref({
  title: '',
  type: null as string | null,
  status: 'created' as string,
  description: '',
  dueDate: null as Date | null,
  clientId: null as string | null,
  counterpartyName: '',
  matterType: 'other' as string,
  assignedToId: null as string | null,
});

const showDeleteWizard = ref(false);
const deleteTarget = ref<any | null>(null);
type DeletePhase = 'choose' | 'confirmText' | 'running' | 'done' | 'error';
const deletePhase = ref<DeletePhase>('choose');
const deleteConfirmText = ref('');
const deleteProgressStep = ref(0);
const deleteProgressModel = [
  { label: 'Documentos' },
  { label: 'Carpetas' },
  { label: 'Actuaciones' },
  { label: 'Expediente' },
];

let deleteProgressTimer: ReturnType<typeof setInterval> | null = null;

const deleteWizardTitle = computed(() => {
  if (deletePhase.value === 'confirmText') return 'Confirmar eliminación';
  if (deletePhase.value === 'running' || deletePhase.value === 'done') return 'Eliminando expediente';
  if (deletePhase.value === 'error') return 'Error';
  return 'Expediente';
});

const canSubmitDeleteWord = computed(
  () => deleteConfirmText.value.trim().toLowerCase() === 'eliminar',
);

const typeSeverityMap: Record<string, string> = {
  case: 'info',
  process: 'warn',
  project: 'success',
  audit: 'secondary',
};

function typeSeverity(type: string): string {
  return typeSeverityMap[type] || 'secondary';
}

async function loadTrash() {
  if (!canDocRead.value) return;
  trashLoading.value = true;
  try {
    const { data } = await apiClient.get('/documents/trash/list');
    trashDocuments.value = data;
  } finally {
    trashLoading.value = false;
  }
}

async function restoreDocument(doc: any) {
  if (!canDocUpdate.value) return;
  await apiClient.post(`/documents/${doc.id}/restore`);
  trashDocuments.value = trashDocuments.value.filter((d) => d.id !== doc.id);
  toast.add({
    severity: 'success',
    summary: t('trackables.trashRestored'),
    life: 3000,
  });
}

function permanentDeleteDocument(doc: any) {
  if (!canDocDelete.value) return;
  confirm.require({
    message: t('trackables.trashConfirmMessage'),
    header: t('trackables.trashConfirmHeader'),
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      await apiClient.delete(`/documents/${doc.id}/permanent`);
      trashDocuments.value = trashDocuments.value.filter((d) => d.id !== doc.id);
      toast.add({
        severity: 'info',
        summary: t('trackables.trashPermanentGone'),
        life: 3000,
      });
    },
  });
}

function getFileIcon(mimeType: string): string {
  if (mimeType?.includes('pdf')) return 'pi pi-file-pdf text-red-600';
  if (mimeType?.includes('word') || mimeType?.includes('document')) return 'pi pi-file-word text-accent';
  if (mimeType?.includes('image')) return 'pi pi-image text-emerald-600';
  return 'pi pi-file text-[var(--fg-subtle)]';
}

function syncScopeFromRoute() {
  if (route.query.scope === 'trash' && canTrackableRead.value && canDocRead.value) {
    listScope.value = 'trash';
  }
}

onMounted(syncScopeFromRoute);
watch(() => route.query.scope, syncScopeFromRoute);

async function loadTrackables(page = 1) {
  if (listScope.value === 'trash') return;
  loading.value = true;
  try {
    const { data } = await apiClient.get('/trackables', {
      params: {
        page,
        limit: rows.value,
        scope: listScope.value,
        search: filters.value.search || undefined,
        status:
          listScope.value === 'active' ? filters.value.status || undefined : undefined,
        type: filters.value.type || undefined,
      },
    });
    trackables.value = data.data;
    totalRecords.value = data.total;
  } finally {
    loading.value = false;
  }
}

function resetAndLoad() {
  first.value = 0;
  loadTrackables(1);
}

function onPage(event: any) {
  first.value = event.first;
  loadTrackables(event.page + 1);
}

function closeCreateDialog() {
  showCreateDialog.value = false;
  createWizardStep.value = 0;
  createWizardTemplateId.value = null;
  newTrackable.value = {
    title: '',
    type: null,
    matterType: 'other',
    description: '',
    dueDate: null,
    expedientNumber: '',
    court: '',
    jurisdiction: 'PE',
    clientId: null,
    counterpartyName: '',
  };
}

async function createTrackable() {
  if (!canTrackableCreate.value) return;
  creating.value = true;
  try {
    const { data: created } = await apiClient.post('/trackables', {
      title: newTrackable.value.title.trim(),
      type: newTrackable.value.type,
      matterType: newTrackable.value.matterType,
      description: newTrackable.value.description.trim() || undefined,
      dueDate: newTrackable.value.dueDate?.toISOString() || undefined,
      expedientNumber: newTrackable.value.expedientNumber.trim() || undefined,
      court: newTrackable.value.court.trim() || undefined,
      jurisdiction: newTrackable.value.jurisdiction.trim() || 'PE',
      clientId: newTrackable.value.clientId,
      counterpartyName: newTrackable.value.counterpartyName.trim() || undefined,
    });
    const id = created?.id as string | undefined;
    if (id && createWizardTemplateId.value) {
      await apiClient.post(`/workflow-templates/${createWizardTemplateId.value}/instantiate`, {
        trackableId: id,
        startDate: new Date().toISOString().slice(0, 10),
      });
    }
    closeCreateDialog();
    await loadTrackables(1);
    first.value = 0;
    if (id) {
      router.push(`/trackables/${id}`);
    }
  } catch {
    toast.add({ severity: 'error', summary: 'No se pudo crear el expediente', life: 4000 });
  } finally {
    creating.value = false;
  }
}

async function archiveTrackable(trackable: any) {
  if (!canTrackableUpdate.value) return;
  try {
    await apiClient.patch(`/trackables/${trackable.id}`, { status: 'archived' });
    toast.add({ severity: 'success', summary: 'Expediente archivado', life: 3000 });
    await loadTrackables(1);
    first.value = 0;
  } catch {
    toast.add({ severity: 'error', summary: 'Error al archivar', life: 3000 });
  }
}

async function reactivateTrackable(trackable: any) {
  if (!canTrackableUpdate.value) return;
  try {
    await apiClient.patch(`/trackables/${trackable.id}`, { status: 'active' });
    toast.add({ severity: 'success', summary: 'Expediente reactivado', life: 3000 });
    first.value = 0;
    await loadTrackables(1);
  } catch {
    toast.add({ severity: 'error', summary: 'Error al reactivar', life: 3000 });
  }
}

async function openEditDialog(row: any) {
  if (!canTrackableUpdate.value) return;
  editingId.value = row.id;
  showEditDialog.value = true;
  editLoading.value = true;
  try {
    const { data } = await apiClient.get(`/trackables/${row.id}`);
    const client = data.client as { id?: string } | undefined;
    const assignedTo = data.assignedTo as { id?: string } | undefined;
    editForm.value = {
      title: data.title ?? '',
      type: data.type ?? null,
      status: data.status ?? 'created',
      description: data.description ?? '',
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      clientId: client?.id ?? null,
      counterpartyName: (data.counterpartyName as string) ?? '',
      matterType: (data.matterType as string) ?? 'other',
      assignedToId: assignedTo?.id ?? null,
    };
  } catch {
    toast.add({ severity: 'error', summary: 'No se pudo cargar el expediente', life: 3000 });
    showEditDialog.value = false;
  } finally {
    editLoading.value = false;
  }
}

function resetEditForm() {
  editingId.value = null;
  editForm.value = {
    title: '',
    type: null,
    status: 'created',
    description: '',
    dueDate: null,
    clientId: null,
    counterpartyName: '',
    matterType: 'other',
    assignedToId: null,
  };
}

async function saveEdit() {
  if (!editingId.value || !canTrackableUpdate.value) return;
  savingEdit.value = true;
  try {
    await apiClient.patch(`/trackables/${editingId.value}`, {
      title: editForm.value.title.trim(),
      type: editForm.value.type,
      status: editForm.value.status,
      description: editForm.value.description.trim() || undefined,
      dueDate: editForm.value.dueDate?.toISOString() || undefined,
      matterType: editForm.value.matterType,
      counterpartyName: editForm.value.counterpartyName?.trim() || undefined,
      clientId: editForm.value.clientId,
      assignedToId: editForm.value.assignedToId,
    });
    toast.add({ severity: 'success', summary: 'Cambios guardados', life: 3000 });
    showEditDialog.value = false;
    await loadTrackables(Math.floor(first.value / rows.value) + 1);
  } catch {
    toast.add({ severity: 'error', summary: 'Error al guardar', life: 3000 });
  } finally {
    savingEdit.value = false;
  }
}

function clearDeleteProgressTimer() {
  if (deleteProgressTimer) {
    clearInterval(deleteProgressTimer);
    deleteProgressTimer = null;
  }
}

function openDeleteWizard(trackable: any) {
  if (!canTrackableDelete.value) return;
  deleteTarget.value = trackable;
  deletePhase.value = 'choose';
  deleteConfirmText.value = '';
  deleteProgressStep.value = 0;
  showDeleteWizard.value = true;
}

function resetDeleteWizard() {
  clearDeleteProgressTimer();
  deleteTarget.value = null;
  deletePhase.value = 'choose';
  deleteConfirmText.value = '';
  deleteProgressStep.value = 0;
}

async function archiveFromWizard() {
  if (!deleteTarget.value || !canTrackableUpdate.value) return;
  try {
    await apiClient.patch(`/trackables/${deleteTarget.value.id}`, { status: 'archived' });
    toast.add({ severity: 'success', summary: 'Expediente archivado', life: 3000 });
    showDeleteWizard.value = false;
    await loadTrackables(Math.floor(first.value / rows.value) + 1);
  } catch {
    toast.add({ severity: 'error', summary: 'Error al archivar', life: 3000 });
  }
}

async function runPermanentDelete() {
  if (!deleteTarget.value || !canTrackableDelete.value || !canSubmitDeleteWord.value) return;

  deletePhase.value = 'running';
  deleteProgressStep.value = 0;
  clearDeleteProgressTimer();

  deleteProgressTimer = setInterval(() => {
    if (deleteProgressStep.value < deleteProgressModel.length - 1) {
      deleteProgressStep.value += 1;
    }
  }, 550);

  try {
    await apiClient.delete(`/trackables/${deleteTarget.value.id}`);
    clearDeleteProgressTimer();
    deleteProgressStep.value = deleteProgressModel.length - 1;
    deletePhase.value = 'done';
    toast.add({ severity: 'success', summary: 'Expediente eliminado', life: 3000 });
    await loadTrackables(Math.floor(first.value / rows.value) + 1);
  } catch {
    clearDeleteProgressTimer();
    deletePhase.value = 'error';
    toast.add({ severity: 'error', summary: 'Error al eliminar', life: 4000 });
  }
}

watch(
  [authReady, canTrackableRead, listScope],
  ([ready, read, scope]) => {
    if (!ready || !read) return;
    if (scope === 'trash') {
      if (!canDocRead.value) {
        listScope.value = 'active';
        return;
      }
      loadTrash();
      return;
    }
    void loadClientsForCase();
    void loadUsers();
    loadTrackables(1);
  },
  { immediate: true },
);

watch(listScope, (scope) => {
  first.value = 0;
  if (scope !== 'trash') {
    filters.value.status = null;
  }
  if (scope === 'trash' && canDocRead.value) {
    router.replace({ path: '/trackables', query: { scope: 'trash' } });
  } else if (scope !== 'trash') {
    router.replace({ path: '/trackables', query: {} });
  }
});

watch(canDocRead, (ok) => {
  if (!ok && listScope.value === 'trash') {
    listScope.value = 'active';
    router.replace({ path: '/trackables', query: {} });
  }
});
</script>

<style scoped>
.scope-tabs :deep(.p-button) {
  flex: 1 1 auto;
}
@media (min-width: 640px) {
  .scope-tabs {
    width: fit-content;
  }
}
</style>
