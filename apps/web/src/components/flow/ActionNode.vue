<template>
  <div
    class="rounded-md border-2 shadow-sm px-3 py-2 min-w-[180px] bg-white cursor-pointer hover:shadow-md transition-shadow"
    :style="{ borderColor: data.statusColor }"
    @click="$emit('select')"
  >
    <Handle type="target" :position="Position.Top" />

    <div class="flex items-center gap-2 mb-1">
      <i :class="actionIcon" class="text-sm" :style="{ color: data.statusColor }" />
      <span class="text-sm truncate">{{ data.label }}</span>
    </div>

    <div class="flex items-center justify-between">
      <StatusBadge :status="data.status" size="small" />
      <div class="flex items-center gap-1">
        <i v-if="data.requiresDocument" class="pi pi-file text-xs text-gray-400" />
        <Avatar
          v-if="data.assignedTo"
          :label="(data.assignedTo.firstName || data.assignedTo.email)[0].toUpperCase()"
          size="small"
          shape="circle"
        />
      </div>
    </div>

    <Handle type="source" :position="Position.Bottom" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Handle, Position } from '@vue-flow/core';
import Avatar from 'primevue/avatar';
import StatusBadge from '../common/StatusBadge.vue';

const props = defineProps<{
  data: {
    label: string;
    status: string;
    statusColor: string;
    assignedTo?: { firstName?: string; email: string } | null;
    requiresDocument: boolean;
    actionType?: string;
  };
}>();

defineEmits<{ select: [] }>();

const actionIcon = computed(() => {
  const icons: Record<string, string> = {
    doc_creation: 'pi pi-file-edit',
    doc_upload: 'pi pi-upload',
    approval: 'pi pi-check-circle',
    data_entry: 'pi pi-pencil',
    external_check: 'pi pi-external-link',
    notification: 'pi pi-bell',
    generic: 'pi pi-circle',
  };
  return icons[props.data.actionType || 'generic'] || 'pi pi-circle';
});
</script>
