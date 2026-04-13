<template>
  <div
    class="rounded-lg border-2 shadow-sm px-3 py-2.5 min-w-[220px] bg-white"
    :style="{ borderColor: data.statusColor }"
  >
    <Handle type="target" :position="Position.Top" />

    <div class="flex items-center gap-2 mb-1">
      <i class="pi pi-list text-base" :style="{ color: data.statusColor }" />
      <span class="font-medium text-sm truncate">{{ data.label }}</span>
    </div>

    <div class="flex items-center justify-between">
      <StatusBadge :status="data.status" size="small" />
      <div class="flex items-center gap-1">
        <i v-if="data.dueDate" class="pi pi-calendar text-xs text-gray-400" />
        <span v-if="data.dueDate" class="text-xs text-gray-400">
          {{ formatDate(data.dueDate) }}
        </span>
      </div>
    </div>

    <Handle type="source" :position="Position.Bottom" />
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';
import StatusBadge from '../common/StatusBadge.vue';

defineProps<{
  data: {
    label: string;
    status: string;
    statusColor: string;
    dueDate?: string | null;
  };
}>();

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('es-PE', { month: 'short', day: 'numeric' });
}
</script>
