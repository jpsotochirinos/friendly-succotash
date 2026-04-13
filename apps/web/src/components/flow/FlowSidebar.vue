<template>
  <div
    v-if="selectedItem"
    class="w-96 bg-white border-l shadow-lg p-6 overflow-y-auto"
  >
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold">{{ selectedItem.title }}</h3>
      <Button icon="pi pi-times" text rounded @click="$emit('close')" />
    </div>

    <div class="space-y-4">
      <div>
        <label class="text-sm text-gray-500">{{ $t('common.status') }}</label>
        <StatusBadge :status="selectedItem.status" />
      </div>

      <div v-if="selectedItem.description">
        <label class="text-sm text-gray-500">Descripción</label>
        <p class="text-sm">{{ selectedItem.description }}</p>
      </div>

      <div v-if="selectedItem.assignedTo">
        <label class="text-sm text-gray-500">Asignado a</label>
        <p class="text-sm">{{ selectedItem.assignedTo.firstName }} {{ selectedItem.assignedTo.lastName }}</p>
      </div>

      <div v-if="selectedItem.dueDate">
        <label class="text-sm text-gray-500">Fecha límite</label>
        <p class="text-sm">{{ formatDate(selectedItem.dueDate) }}</p>
      </div>

      <Divider />

      <div v-if="availableTransitions.length > 0">
        <label class="text-sm text-gray-500 mb-2 block">Acciones disponibles</label>
        <div class="flex flex-wrap gap-2">
          <Button
            v-for="t in availableTransitions"
            :key="t.to"
            :label="t.label"
            :severity="getTransitionSeverity(t.to)"
            size="small"
            @click="$emit('transition', selectedItem.id, t.to)"
          />
        </div>
      </div>

      <div v-if="selectedItem.requiresDocument">
        <Divider />
        <label class="text-sm text-gray-500 mb-2 block">Documento requerido</label>
        <Button
          label="Abrir editor"
          icon="pi pi-file-edit"
          size="small"
          outlined
          @click="$emit('openEditor', selectedItem.id)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import Divider from 'primevue/divider';
import StatusBadge from '../common/StatusBadge.vue';

defineProps<{
  selectedItem: any;
  availableTransitions: Array<{ to: string; label: string }>;
}>();

defineEmits<{
  close: [];
  transition: [itemId: string, targetStatus: string];
  openEditor: [itemId: string];
}>();

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('es-PE', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function getTransitionSeverity(to: string): string {
  const map: Record<string, string> = {
    active: 'info',
    in_progress: 'warn',
    under_review: 'info',
    validated: 'success',
    closed: 'success',
    rejected: 'danger',
    skipped: 'secondary',
  };
  return map[to] || 'primary';
}
</script>
