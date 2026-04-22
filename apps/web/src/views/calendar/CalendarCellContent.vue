<template>
  <span class="block">
    <div
      class="text-xs font-medium mb-0.5"
      :class="cell.isToday ? 'text-blue-800 dark:text-blue-200 font-bold' : 'text-[var(--fg-muted)]'"
    >
      {{ cell.day }}
    </div>
    <p
      v-if="cell.holidayLabel"
      class="text-[9px] leading-tight text-rose-800 dark:text-rose-200 font-medium truncate mb-0.5 m-0"
      :title="cell.holidayLabel"
    >
      {{ cell.holidayLabel }}
    </p>
    <div :class="multilineTitles ? 'space-y-1 mt-1' : 'space-y-0.5'">
      <template v-if="cell.trackableSummaries.length">
        <div
          v-for="sum in cell.trackableSummaries.slice(0, multilineTitles ? 8 : 2)"
          :key="sum.trackableId"
          :class="[
            multilineTitles ? 'text-xs px-1.5 py-1 rounded' : 'text-[10px] px-1 py-0.5 rounded',
            'truncate',
            trackableChipClass(sum.trackableId),
          ]"
          :title="sum.trackableTitle"
        >
          {{ truncateTitle(sum.trackableTitle, multilineTitles ? 48 : 22) }}
        </div>
        <div
          v-if="!multilineTitles && cell.trackableSummaries.length > 2"
          class="text-[10px] px-1 text-[var(--fg-muted)] font-medium"
        >
          +{{ cell.trackableSummaries.length - 2 }} {{ t('globalCalendar.moreTrackables') }}
        </div>
        <div
          v-else-if="multilineTitles && cell.trackableSummaries.length > 8"
          class="text-xs text-[var(--fg-muted)] font-medium px-1"
        >
          +{{ cell.trackableSummaries.length - 8 }} {{ t('globalCalendar.moreTrackables') }}
        </div>
      </template>
    </div>
  </span>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { trackableChipClass, type GlobalCalendarCell } from '@/composables/useGlobalWorkflowCalendar';

defineProps<{
  cell: GlobalCalendarCell;
  multilineTitles?: boolean;
}>();

const { t } = useI18n();

function truncateTitle(s: string, max: number) {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}
</script>
