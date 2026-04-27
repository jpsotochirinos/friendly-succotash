<script setup lang="ts">
import { ref } from 'vue';
import LegalStagePanel from './LegalStagePanel.vue';
import type { LegalProcessTimelineResponse } from '@/api/legal-process';

defineProps<{
  trackableId: string;
  timeline: Extract<LegalProcessTimelineResponse, { hasProcess: true }>;
}>();

const emit = defineEmits<{ reload: [] }>();

const selectedStageId = ref<string | null>(null);

function chipClass(status: string) {
  if (status === 'active') return 'border-primary bg-primary/10';
  if (status === 'completed') return 'border-green-500/60 bg-green-500/10';
  return 'border-[var(--surface-border)] bg-[var(--surface-sunken)]/40 opacity-80';
}
</script>

<template>
  <div class="legal-process-timeline space-y-4">
    <div class="flex flex-wrap gap-2">
      <button
        v-for="stage in timeline.stages"
        :key="stage.id"
        type="button"
        :class="[
          'rounded-lg border px-3 py-2 text-left transition-colors',
          chipClass(stage.status),
        ]"
        @click="selectedStageId = stage.id"
      >
        <div class="font-semibold text-sm text-[var(--fg-default)]">
          <span v-if="stage.stageOrderIndex != null">{{ stage.stageOrderIndex }}. </span>{{ stage.name }}
        </div>
        <div v-if="stage.deadlineDays" class="text-xs text-[var(--fg-muted)]">
          {{ stage.deadlineDays }} días · {{ stage.deadlineCalendarType }}
        </div>
        <div v-if="stage.deadlineLawRef" class="text-xs text-[var(--fg-muted)]">
          {{ stage.deadlineLawRef }}
        </div>
      </button>
    </div>

    <div v-if="timeline.deadlines.length" class="text-sm space-y-1">
      <div class="font-medium text-[var(--fg-default)]">Plazos registrados</div>
      <ul class="m-0 pl-4 list-disc text-[var(--fg-muted)]">
        <li v-for="d in timeline.deadlines" :key="d.id">
          {{ d.dueDate?.slice?.(0, 10) ?? d.dueDate }} — {{ d.status }}
        </li>
      </ul>
    </div>

    <LegalStagePanel
      v-if="selectedStageId"
      :trackable-id="trackableId"
      :stage-id="selectedStageId"
      :deadline-type="timeline.stages.find((s) => s.id === selectedStageId)?.deadlineType ?? 'none'"
      @close="selectedStageId = null"
      @reload="emit('reload')"
    />
  </div>
</template>
