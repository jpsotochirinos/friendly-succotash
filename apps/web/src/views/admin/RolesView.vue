<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
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
import ConfirmDialog from 'primevue/confirmdialog';

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

const toast = useToast();
const confirm = useConfirm();

const roles = ref<Role[]>([]);
const allPermissions = ref<Permission[]>([]);
const loading = ref(false);

const dialogVisible = ref(false);
const editingRole = ref<Role | null>(null);
const form = ref({ name: '', description: '', permissionIds: [] as string[] });

const groupedPermissions = computed(() => {
  const groups: Record<string, Permission[]> = {};
  for (const p of allPermissions.value) {
    if (!groups[p.category]) groups[p.category] = [];
    groups[p.category].push(p);
  }
  return groups;
});

async function loadRoles() {
  loading.value = true;
  try {
    const { data } = await apiClient.get('/roles');
    roles.value = data;
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los roles', life: 3000 });
  } finally {
    loading.value = false;
  }
}

async function loadPermissions() {
  try {
    const { data } = await apiClient.get('/roles/permissions');
    allPermissions.value = data;
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los permisos', life: 3000 });
  }
}

function openCreate() {
  editingRole.value = null;
  form.value = { name: '', description: '', permissionIds: [] };
  dialogVisible.value = true;
}

function openEdit(role: Role) {
  editingRole.value = role;
  form.value = {
    name: role.name,
    description: role.description ?? '',
    permissionIds: role.permissions.map((p) => p.id),
  };
  dialogVisible.value = true;
}

async function saveRole() {
  try {
    const payload = {
      name: form.value.name,
      description: form.value.description || undefined,
      permissionIds: form.value.permissionIds,
    };

    if (editingRole.value) {
      await apiClient.patch(`/roles/${editingRole.value.id}`, payload);
      toast.add({ severity: 'success', summary: 'Actualizado', detail: 'Rol actualizado correctamente', life: 3000 });
    } else {
      await apiClient.post('/roles', payload);
      toast.add({ severity: 'success', summary: 'Creado', detail: 'Rol creado correctamente', life: 3000 });
    }

    dialogVisible.value = false;
    await loadRoles();
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el rol', life: 3000 });
  }
}

function confirmDelete(role: Role) {
  confirm.require({
    message: `¿Estás seguro de eliminar el rol "${role.name}"?`,
    header: 'Confirmar eliminación',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await apiClient.delete(`/roles/${role.id}`);
        toast.add({ severity: 'success', summary: 'Eliminado', detail: 'Rol eliminado correctamente', life: 3000 });
        await loadRoles();
      } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el rol', life: 3000 });
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
  <div class="p-4">
    <ConfirmDialog />

    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold dark:text-white">Gestión de Roles</h1>
      <Button label="Nuevo rol" icon="pi pi-plus" @click="openCreate" />
    </div>

    <DataTable :value="roles" :loading="loading" stripedRows responsiveLayout="scroll" class="dark:bg-surface-800">
      <Column field="name" header="Nombre" sortable />
      <Column field="description" header="Descripción" />
      <Column header="Permisos">
        <template #body="{ data }">
          <Tag :value="String(data.permissions?.length ?? 0)" severity="info" />
        </template>
      </Column>
      <Column header="Sistema">
        <template #body="{ data }">
          <Tag v-if="data.isSystem" value="Sistema" severity="warn" />
          <Tag v-else value="Custom" severity="success" />
        </template>
      </Column>
      <Column header="Acciones">
        <template #body="{ data }">
          <div class="flex gap-2">
            <Button
              icon="pi pi-pencil"
              severity="info"
              text
              rounded
              :disabled="data.isSystem"
              @click="openEdit(data)"
            />
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              :disabled="data.isSystem"
              @click="confirmDelete(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog
      v-model:visible="dialogVisible"
      :header="editingRole ? 'Editar Rol' : 'Nuevo Rol'"
      modal
      :style="{ width: '600px' }"
      class="dark:bg-surface-800"
    >
      <div class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1">
          <label class="font-semibold dark:text-white">Nombre *</label>
          <InputText v-model="form.name" placeholder="Nombre del rol" class="w-full" />
        </div>

        <div class="flex flex-col gap-1">
          <label class="font-semibold dark:text-white">Descripción</label>
          <Textarea v-model="form.description" rows="3" placeholder="Descripción del rol" class="w-full" />
        </div>

        <div class="flex flex-col gap-2">
          <label class="font-semibold dark:text-white">Permisos</label>
          <div
            v-for="(perms, category) in groupedPermissions"
            :key="category"
            class="border border-surface-200 dark:border-surface-600 rounded p-3 mb-2"
          >
            <h4 class="font-semibold mb-2 capitalize dark:text-white">{{ category }}</h4>
            <div class="grid grid-cols-2 gap-2">
              <div v-for="perm in perms" :key="perm.id" class="flex items-center gap-2">
                <Checkbox v-model="form.permissionIds" :inputId="perm.id" :value="perm.id" />
                <label :for="perm.id" class="cursor-pointer dark:text-surface-300">{{ perm.code }}</label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <Button label="Cancelar" severity="secondary" text @click="dialogVisible = false" />
        <Button label="Guardar" icon="pi pi-check" :disabled="!form.name.trim()" @click="saveRole" />
      </template>
    </Dialog>
  </div>
</template>
