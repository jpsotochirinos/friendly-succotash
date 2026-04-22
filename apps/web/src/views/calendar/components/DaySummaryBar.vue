<template>
  <div
    class="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] px-3 py-2 text-sm"
  >
    <span class="text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)] mr-1">{{ t('globalCalendar.summaryTitle') }}</span>
    <Tag
      v-if="conflicts > 0"
      severity="warn"
      rounded
      class="cursor-pointer text-xs font-medium !px-2.5 !py-1"
      @click="$emit('open-conflicts')"
    >
      <span class="inline-flex items-center gap-1.5">
        <i class="pi pi-exclamation-triangle" />
        {{ t('globalCalendar.summaryConflicts', { n: conflicts }) }}
      </span>
    </Tag>
    <Tag v-else severity="success" rounded class="text-xs !px-2.5 !py-1">
      <span class="inline-flex items-center gap-1.5">
        <i class="pi pi-check-circle" />
        {{ t('globalCalendar.summaryNoConflicts') }}
      </span>
    </Tag>
    <Tag
      rounded
      class="text-xs font-medium !px-2.5 !py-1"
      :severity="dueToday > 0 ? 'danger' : 'secondary'"
    >
      <span class="inline-flex items-center gap-1.5">
        <i class="pi pi-flag text-[var(--p-red-500)]" />
        {{ t('globalCalendar.summaryDueToday', { n: dueToday }) }}
      </span>
    </Tag>
    <Tag
      rounded
      class="text-xs font-medium !px-2.5 !py-1"
      :severity="unassigned > 0 ? 'warn' : 'secondary'"
    >
      <span class="inline-flex items-center gap-1.5">
        <i class="pi pi-user-minus text-[var(--p-orange-500)]" />
        {{ t('globalCalendar.summaryUnassigned', { n: unassigned }) }}
      </span>
    </Tag>
    <Tag rounded severity="secondary" class="text-xs !px-2.5 !py-1">
      <span class="inline-flex items-center gap-1.5 text-[var(--fg-muted)]">
        <i class="pi pi-gift text-pink-500" />
        {{ t('globalCalendar.summaryBirthdays', { n: birthdays }) }}
      </span>
    </Tag>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import Tag from 'primevue/tag';

defineProps<{
  conflicts: number;
  dueToday: number;
  unassigned: number;
  birthdays: number;
}>();

defineEmits<{
  (e: 'open-conflicts'): void;
}>();

const { t } = useI18n();
</script>
