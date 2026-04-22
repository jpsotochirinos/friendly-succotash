<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { apiClient } from '../../api/client';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Checkbox from 'primevue/checkbox';
import Tag from 'primevue/tag';
import Dropdown from 'primevue/dropdown';
import ConfirmDialog from 'primevue/confirmdialog';
import {
  ROLE_TEMPLATE_IDS,
  codesForTemplate,
  permissionLabelKey,
  categoryLabelKey,
  type RoleTemplateId,
} from '@/constants/role-templates';
import PageHeader from '@/components/common/PageHeader.vue';

const { t, te } = useI18n();
const toast = useToast();
const confirm = useConfirm();

interface Permission {
  id: string;
  code: string;
  category: string;
  description?: string;
}

interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  permissions: Permission[];
}

const roles = ref<Role[]>([]);
const allPermissions = ref<Permission[]>([]);
const loading = ref(false);

const dialogVisible = ref(false);
const editingRole = ref<Role | null>(null);
const form = ref({ name: '', description: '', permissionIds: [] as string[] });
const selectedTemplateId = ref<RoleTemplateId | ''>('');

const templateOptions = computed(() => {
  const none = { value: '' as const, label: t('rolesAdmin.templateNone') };
  const rest = ROLE_TEMPLATE_IDS.map((id) => ({
    value: id,
    label: t(`rolesAdmin.templates.${id}.name`),
  }));
  return [none, ...rest];
});

const groupedPermissions = computed(() => {
  const groups: Record<string, Permission[]> = {};
  for (const p of allPermissions.value) {
    if (!groups[p.category]) groups[p.category] = [];
    groups[p.category].push(p);
  }
  return groups;
});

function labelForPermission(perm: Permission): string {
  const key = permissionLabelKey(perm.code);
  if (te(key)) return t(key);
  return perm.description || perm.code;
}

function labelForCategory(category: string): string {
  const key = categoryLabelKey(category);
  if (te(key)) return t(key);
  return category;
}

function applyTemplate(id: RoleTemplateId | '') {
  if (!id) return;
  const codes = new Set(codesForTemplate(id));
  form.value.permissionIds = allPermissions.value.filter((p) => codes.has(p.code)).map((p) => p.id);
  form.value.name = t(`rolesAdmin.templates.${id}.name`);
  form.value.description = t(`rolesAdmin.templates.${id}.desc`);
}

async function loadRoles() {
  loading.value = true;
  try {
    const { data } = await apiClient.get('/roles');
    roles.value = data;
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: t('rolesAdmin.loadError'), life: 3000 });
  } finally {
    loading.value = false;
  }
}

async function loadPermissions() {
  try {
    const { data } = await apiClient.get('/roles/permissions');
    allPermissions.value = data;
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: t('rolesAdmin.loadPermsError'), life: 3000 });
  }
}

function openCreate() {
  editingRole.value = null;
  form.value = { name: '', description: '', permissionIds: [] };
  selectedTemplateId.value = '';
  dialogVisible.value = true;
}

function openEdit(role: Role) {
  editingRole.value = role;
  form.value = {
    name: role.name,
    description: role.description ?? '',
    permissionIds: role.permissions.map((p) => p.id),
  };
  selectedTemplateId.value = '';
  dialogVisible.value = true;
}

watch(selectedTemplateId, (id) => {
  if (!editingRole.value && id) {
    applyTemplate(id as RoleTemplateId);
  }
});

async function saveRole() {
  try {
    const payload = {
      name: form.value.name,
      description: form.value.description || undefined,
      permissionIds: form.value.permissionIds,
    };

    if (editingRole.value) {
      await apiClient.patch(`/roles/${editingRole.value.id}`, payload);
      toast.add({ severity: 'success', summary: t('rolesAdmin.save'), detail: t('rolesAdmin.saveOk'), life: 3000 });
    } else {
      await apiClient.post('/roles', payload);
      toast.add({ severity: 'success', summary: t('rolesAdmin.save'), detail: t('rolesAdmin.saveOk'), life: 3000 });
    }

    dialogVisible.value = false;
    await loadRoles();
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: t('rolesAdmin.saveError'), life: 3000 });
  }
}

function confirmDelete(role: Role) {
  confirm.require({
    message: t('rolesAdmin.deleteConfirm', { name: role.name }),
    header: t('rolesAdmin.deleteHeader'),
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await apiClient.delete(`/roles/${role.id}`);
        toast.add({ severity: 'success', summary: t('rolesAdmin.deleteOk'), life: 3000 });
        await loadRoles();
      } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: t('rolesAdmin.deleteError'), life: 3000 });
      }
    },
  });
}

onMounted(() => {
  loadRoles();
  loadPermissions();
});
</script>

<template>
  <div class="flex flex-col gap-6 max-w-6xl mx-auto w-full">
    <ConfirmDialog />

    <PageHeader :title="t('rolesAdmin.title')" :subtitle="t('rolesAdmin.pageSubtitle')">
      <template #actions>
        <Button :label="t('rolesAdmin.newRole')" icon="pi pi-plus" size="small" @click="openCreate" />
      </template>
    </PageHeader>

    <DataTable
      :value="roles"
      :loading="loading"
      striped-rows
      responsive-layout="scroll"
      class="text-sm"
      :pt="{
        root: { style: { background: 'var(--surface-raised)' } },
      }"
    >
      <Column field="name" :header="t('rolesAdmin.name')" sortable />
      <Column field="description" :header="t('rolesAdmin.description')" />
      <Column :header="t('rolesAdmin.permissionsCount')">
        <template #body="{ data }">
          <Tag :value="String(data.permissions?.length ?? 0)" severity="info" />
        </template>
      </Column>
      <Column :header="t('rolesAdmin.system')">
        <template #body="{ data }">
          <Tag v-if="data.isSystem" :value="t('rolesAdmin.system')" severity="warn" />
          <Tag v-else :value="t('rolesAdmin.custom')" severity="success" />
        </template>
      </Column>
      <Column :header="t('rolesAdmin.actions')">
        <template #body="{ data }">
          <div class="flex gap-2">
            <Button
              icon="pi pi-pencil"
              severity="info"
              text
              rounded
              @click="openEdit(data)"
            />
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              @click="confirmDelete(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog
      v-model:visible="dialogVisible"
      :header="editingRole ? t('rolesAdmin.editRole') : t('rolesAdmin.createRole')"
      modal
      :style="{ width: 'min(640px, 96vw)' }"
      :content-style="{ background: 'var(--surface-raised)' }"
    >
      <div class="flex flex-col gap-4 pt-2">
        <div v-if="!editingRole" class="flex flex-col gap-2">
          <label class="text-sm font-medium text-fg">{{
            t('rolesAdmin.templateLabel')
          }}</label>
          <Dropdown
            v-model="selectedTemplateId"
            :options="templateOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            :placeholder="t('rolesAdmin.templatePlaceholder')"
          />
          <p class="text-xs leading-relaxed text-fg-muted">
            {{ t('rolesAdmin.templateHint') }}
          </p>
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-fg">{{ t('rolesAdmin.name') }} *</label>
          <InputText v-model="form.name" class="w-full" />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-fg">{{ t('rolesAdmin.description') }}</label>
          <Textarea v-model="form.description" rows="3" class="w-full" />
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-fg">{{ t('rolesAdmin.permissions') }}</label>
          <div
            v-for="(perms, category) in groupedPermissions"
            :key="category"
            class="rounded-lg border border-surface-border bg-surface-sunken p-3 mb-2"
          >
            <h4 class="text-sm font-semibold mb-3 text-fg">
              {{ labelForCategory(String(category)) }}
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div v-for="perm in perms" :key="perm.id" class="flex items-start gap-2">
                <Checkbox v-model="form.permissionIds" :input-id="perm.id" :value="perm.id" class="mt-0.5" />
                <label :for="perm.id" class="cursor-pointer text-sm leading-snug">
                  <span class="block text-fg">{{ labelForPermission(perm) }}</span>
                  <span class="text-xs font-mono opacity-60" :title="perm.code">{{ perm.code }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <Button :label="t('rolesAdmin.cancel')" severity="secondary" text @click="dialogVisible = false" />
        <Button
          :label="t('rolesAdmin.save')"
          icon="pi pi-check"
          :disabled="!form.name.trim()"
          @click="saveRole"
        />
      </template>
    </Dialog>
  </div>
</template>
