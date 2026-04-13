<template>
  <div
    class="rounded-xl border-2 shadow-md px-4 py-3 min-w-[260px] bg-white"
    :style="{ borderColor: data.statusColor }"
  >
    <Handle type="target" :position="Position.Top" />

    <div class="flex items-center gap-2 mb-1">
      <i class="pi pi-folder text-lg" :style="{ color: data.statusColor }" />
      <span class="font-semibold text-sm truncate">{{ data.label }}</span>
    </div>

    <div class="flex items-center justify-between">
      <StatusBadge :status="data.status" size="small" />
      <span v-if="data.assignedTo" class="text-xs text-gray-500">
        {{ data.assignedTo.firstName || data.assignedTo.email }}
      </span>
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
    assignedTo?: { firstName?: string; email: string } | null;
  };
}>();
</script>
