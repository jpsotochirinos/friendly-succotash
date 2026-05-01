<template>
  <div class="cal-toolbar-filters flex min-w-0 flex-1 flex-wrap items-center gap-1">
    <div class="cal-toolbar-filters__chips flex min-w-0 max-w-full flex-wrap items-center gap-1.5">
    <CalendarFilterTrigger
      :a11y-label="t('globalCalendar.filterKinds')"
      :expanded="kindPopoverOpen"
      :active="selectedKindRows.length > 0"
      icon="pi pi-th-large"
      @toggle="(e) => kindPopoverRef?.toggle(e)"
    >
      <AvatarGroup v-if="selectedKindRows.length > 0" class="cal-filter-avatar-group">
        <Avatar
          v-for="k in visibleKindAvatars"
          :key="k.value"
          :label="avatarInitials(k.label)"
          shape="circle"
          size="small"
          class="cal-filter-avatar"
          :style="{ background: hashAvatarColor(k.value), color: '#fff' }"
          :aria-label="k.label"
          v-tooltip.top="k.label"
        />
        <Avatar
          v-if="kindOverflowCount > 0"
          :label="`+${kindOverflowCount}`"
          shape="circle"
          size="small"
          class="cal-filter-avatar"
          :style="{
            background: 'var(--surface-sunken)',
            color: 'var(--fg-muted)',
            border: '1px solid var(--surface-border)',
          }"
          :aria-label="kindOverflowTooltip"
          v-tooltip.top="kindOverflowTooltip"
        />
      </AvatarGroup>
      <div
        v-else
        class="cal-filter-trigger-empty"
        v-tooltip.top="t('globalCalendar.filterKinds')"
      >
        <i class="pi pi-th-large" aria-hidden="true" />
      </div>
    </CalendarFilterTrigger>
    <Popover
      ref="kindPopoverRef"
      class="cal-filter-popover w-[min(100vw-2rem,20rem)] border border-[var(--surface-border)] bg-[var(--surface-raised)] shadow-lg"
      @show="kindPopoverOpen = true"
      @hide="kindPopoverOpen = false"
    >
      <div class="flex max-h-[min(320px,50vh)] flex-col gap-1 overflow-hidden rounded-xl">
        <div class="shrink-0 border-b border-[var(--surface-border)] px-3 py-2">
          <p class="m-0 text-[11px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">
            {{ t('globalCalendar.filterKinds') }}
          </p>
        </div>
        <ul class="m-0 min-h-0 list-none space-y-0.5 overflow-y-auto overscroll-contain p-1">
          <li v-for="opt in kindOptions" :key="opt.value">
            <label
              :for="`cal-filter-kind-${opt.value}`"
              class="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-[color-mix(in_srgb,var(--accent-soft)_50%,transparent)]"
            >
              <Checkbox
                :model-value="calStore.filters.kinds.includes(opt.value)"
                binary
                :input-id="`cal-filter-kind-${opt.value}`"
                @update:model-value="(v) => setKindChecked(opt.value, !!v)"
              />
              <Avatar
                :label="avatarInitials(opt.label)"
                shape="circle"
                size="small"
                class="cal-filter-avatar cal-filter-avatar--row shrink-0"
                :style="{ background: hashAvatarColor(opt.value), color: '#fff' }"
                aria-hidden="true"
              />
              <span class="min-w-0 flex-1 truncate text-sm text-[var(--fg-default)]">{{ opt.label }}</span>
            </label>
          </li>
        </ul>
      </div>
    </Popover>

    <CalendarFilterTrigger
      :a11y-label="t('globalCalendar.filterPriority')"
      :expanded="priorityPopoverOpen"
      :active="selectedPriorityRows.length > 0"
      icon="pi pi-flag"
      @toggle="(e) => priorityPopoverRef?.toggle(e)"
    >
      <AvatarGroup v-if="selectedPriorityRows.length > 0" class="cal-filter-avatar-group">
        <Avatar
          v-for="p in visiblePriorityAvatars"
          :key="p.value"
          :label="priorityAbbrev(p.value)"
          shape="circle"
          size="small"
          class="cal-filter-avatar cal-filter-avatar--priority"
          :style="{ background: priorityAccent(p.value), color: '#fff' }"
          :aria-label="p.label"
          v-tooltip.top="p.label"
        />
        <Avatar
          v-if="priorityOverflowCount > 0"
          :label="`+${priorityOverflowCount}`"
          shape="circle"
          size="small"
          class="cal-filter-avatar"
          :style="{
            background: 'var(--surface-sunken)',
            color: 'var(--fg-muted)',
            border: '1px solid var(--surface-border)',
          }"
          :aria-label="priorityOverflowTooltip"
          v-tooltip.top="priorityOverflowTooltip"
        />
      </AvatarGroup>
      <div
        v-else
        class="cal-filter-trigger-empty"
        v-tooltip.top="t('globalCalendar.filterPriority')"
      >
        <i class="pi pi-flag" aria-hidden="true" />
      </div>
    </CalendarFilterTrigger>
    <Popover
      ref="priorityPopoverRef"
      class="cal-filter-popover w-[min(100vw-2rem,20rem)] border border-[var(--surface-border)] bg-[var(--surface-raised)] shadow-lg"
      @show="priorityPopoverOpen = true"
      @hide="priorityPopoverOpen = false"
    >
      <div class="flex max-h-[min(280px,50vh)] flex-col gap-1 overflow-hidden rounded-xl">
        <div class="shrink-0 border-b border-[var(--surface-border)] px-3 py-2">
          <p class="m-0 text-[11px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">
            {{ t('globalCalendar.filterPriority') }}
          </p>
        </div>
        <ul class="m-0 min-h-0 list-none space-y-0.5 overflow-y-auto overscroll-contain p-1">
          <li v-for="opt in priorityOptions" :key="opt.value">
            <label
              :for="`cal-filter-priority-${opt.value}`"
              class="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-[color-mix(in_srgb,var(--accent-soft)_50%,transparent)]"
            >
              <Checkbox
                :model-value="calStore.filters.priorities.includes(opt.value)"
                binary
                :input-id="`cal-filter-priority-${opt.value}`"
                @update:model-value="(v) => setPriorityChecked(opt.value, !!v)"
              />
              <span
                class="cal-priority-row-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
                :style="{
                  background: colorMixSoft(priorityAccent(opt.value)),
                  color: priorityAccent(opt.value),
                  border: `1px solid color-mix(in srgb, ${priorityAccent(opt.value)} 35%, var(--surface-border))`,
                }"
                aria-hidden="true"
              >
                <i :class="priorityIcon(opt.value)" />
              </span>
              <span class="min-w-0 flex-1 truncate text-sm text-[var(--fg-default)]">{{ opt.label }}</span>
            </label>
          </li>
        </ul>
      </div>
    </Popover>

    <template v-if="showAssigneeFilter && userOptions.length > 0">
      <CalendarFilterTrigger
        :a11y-label="t('globalCalendar.filterAssignee')"
        :expanded="assigneePopoverOpen"
        :active="selectedAssigneeRows.length > 0"
        icon="pi pi-user-plus"
        @toggle="(e) => assigneePopoverRef?.toggle(e)"
      >
        <AvatarGroup v-if="selectedAssigneeRows.length > 0" class="cal-filter-avatar-group">
          <Avatar
            v-for="u in visibleAssigneeAvatars"
            :key="u.value"
            :label="avatarInitials(u.label)"
            shape="circle"
            size="small"
            class="cal-filter-avatar"
            :style="{ background: hashAvatarColor(u.label), color: '#fff' }"
            :aria-label="u.label"
            v-tooltip.top="u.label"
          />
          <Avatar
            v-if="assigneeOverflowCount > 0"
            :label="`+${assigneeOverflowCount}`"
            shape="circle"
            size="small"
            class="cal-filter-avatar"
            :style="{
              background: 'var(--surface-sunken)',
              color: 'var(--fg-muted)',
              border: '1px solid var(--surface-border)',
            }"
            :aria-label="assigneeOverflowTooltip"
            v-tooltip.top="assigneeOverflowTooltip"
          />
        </AvatarGroup>
        <div
          v-else
          class="cal-filter-trigger-empty"
          v-tooltip.top="t('globalCalendar.filterAssignee')"
        >
          <i class="pi pi-user-plus" aria-hidden="true" />
        </div>
      </CalendarFilterTrigger>
      <Popover
        ref="assigneePopoverRef"
        class="cal-filter-popover w-[min(100vw-2rem,20rem)] border border-[var(--surface-border)] bg-[var(--surface-raised)] shadow-lg"
        @show="assigneePopoverOpen = true"
        @hide="assigneePopoverOpen = false"
      >
        <div class="flex max-h-[min(320px,50vh)] flex-col gap-1 overflow-hidden rounded-xl">
          <div class="shrink-0 border-b border-[var(--surface-border)] px-3 py-2">
            <p class="m-0 text-[11px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">
              {{ t('globalCalendar.filterAssignee') }}
            </p>
          </div>
          <ul class="m-0 min-h-0 list-none space-y-0.5 overflow-y-auto overscroll-contain p-1">
            <li v-for="u in userOptions" :key="u.value">
              <label
                :for="`cal-filter-assignee-${u.value}`"
                class="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-[color-mix(in_srgb,var(--accent-soft)_50%,transparent)]"
              >
                <Checkbox
                  :model-value="calStore.filters.assignees.includes(u.value)"
                  binary
                  :input-id="`cal-filter-assignee-${u.value}`"
                  @update:model-value="(v) => setAssigneeChecked(u.value, !!v)"
                />
                <Avatar
                  :label="avatarInitials(u.label)"
                  shape="circle"
                  size="small"
                  class="cal-filter-avatar cal-filter-avatar--row shrink-0"
                  :style="{ background: hashAvatarColor(u.label), color: '#fff' }"
                  aria-hidden="true"
                />
                <span class="min-w-0 flex-1 truncate text-sm text-[var(--fg-default)]">{{ u.label }}</span>
              </label>
            </li>
          </ul>
        </div>
      </Popover>
    </template>
    </div>

    <Button
      v-if="hasActiveFilters"
      :label="t('globalCalendar.filterReset')"
      icon="pi pi-filter-slash"
      size="small"
      outlined
      severity="secondary"
      type="button"
      class="cal-toolbar-filters__reset cal-toolbar-filters__reset--active shrink-0"
      :aria-label="t('globalCalendar.filterReset')"
      @click="calStore.resetFilters()"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import Avatar from 'primevue/avatar';
import AvatarGroup from 'primevue/avatargroup';
import Checkbox from 'primevue/checkbox';
import Popover from 'primevue/popover';
import { useCalendarStore } from '@/stores/calendar.store';
import { useCalendarFilterMultiselectOptions } from '@/composables/useCalendarFilterMultiselectOptions';
import type { CalendarFilterKind, CalendarPriorityFilter } from '@/composables/calendarEventKind';
import { avatarInitials, hashAvatarColor } from '@/utils/avatarColor';
import CalendarFilterTrigger from './CalendarFilterTrigger.vue';

const MAX_FILTER_AVATARS = 3;

const props = defineProps<{
  showAssigneeFilter: boolean;
  userOptions: Array<{ label: string; value: string }>;
}>();

const { t } = useI18n();
const calStore = useCalendarStore();
const { kindOptions, priorityOptions } = useCalendarFilterMultiselectOptions();

/** Hay algo distinto del estado por defecto (ningún criterio aplicado). */
const hasActiveFilters = computed(() => {
  const f = calStore.filters;
  return (
    f.kinds.length > 0 ||
    f.priorities.length > 0 ||
    f.assignees.length > 0 ||
    f.trackables.length > 0
  );
});

const kindPopoverRef = ref<InstanceType<typeof Popover> | null>(null);
const kindPopoverOpen = ref(false);
const priorityPopoverRef = ref<InstanceType<typeof Popover> | null>(null);
const priorityPopoverOpen = ref(false);
const assigneePopoverRef = ref<InstanceType<typeof Popover> | null>(null);
const assigneePopoverOpen = ref(false);

const selectedKindRows = computed(() => {
  const set = new Set(calStore.filters.kinds);
  return kindOptions.value.filter((o) => set.has(o.value));
});

const visibleKindAvatars = computed(() => selectedKindRows.value.slice(0, MAX_FILTER_AVATARS));

const kindOverflowCount = computed(() => Math.max(0, selectedKindRows.value.length - MAX_FILTER_AVATARS));

const kindOverflowTooltip = computed(() =>
  selectedKindRows.value.slice(MAX_FILTER_AVATARS).map((k) => k.label).join(', '),
);

const selectedPriorityRows = computed(() => {
  const set = new Set(calStore.filters.priorities);
  return priorityOptions.value.filter((o) => set.has(o.value));
});

const visiblePriorityAvatars = computed(() => selectedPriorityRows.value.slice(0, MAX_FILTER_AVATARS));

const priorityOverflowCount = computed(() =>
  Math.max(0, selectedPriorityRows.value.length - MAX_FILTER_AVATARS),
);

const priorityOverflowTooltip = computed(() =>
  selectedPriorityRows.value.slice(MAX_FILTER_AVATARS).map((p) => p.label).join(', '),
);

const selectedAssigneeRows = computed(() => {
  const set = new Set(calStore.filters.assignees);
  return props.userOptions.filter((u) => set.has(u.value));
});

const visibleAssigneeAvatars = computed(() => selectedAssigneeRows.value.slice(0, MAX_FILTER_AVATARS));

const assigneeOverflowCount = computed(() =>
  Math.max(0, selectedAssigneeRows.value.length - MAX_FILTER_AVATARS),
);

const assigneeOverflowTooltip = computed(() =>
  selectedAssigneeRows.value.slice(MAX_FILTER_AVATARS).map((u) => u.label).join(', '),
);

function setKindChecked(kind: CalendarFilterKind, checked: boolean) {
  const next = new Set(calStore.filters.kinds);
  if (checked) next.add(kind);
  else next.delete(kind);
  calStore.setFilters({ kinds: Array.from(next) });
}

function setPriorityChecked(value: CalendarPriorityFilter, checked: boolean) {
  const next = new Set(calStore.filters.priorities);
  if (checked) next.add(value);
  else next.delete(value);
  calStore.setFilters({ priorities: Array.from(next) });
}

function setAssigneeChecked(userId: string, checked: boolean) {
  const next = new Set(calStore.filters.assignees);
  if (checked) next.add(userId);
  else next.delete(userId);
  calStore.setFilters({ assignees: Array.from(next) });
}

/** Hex only — safe inside template `color-mix(..., ${accent}, ...)` (no commas). */
function priorityAccent(value: CalendarPriorityFilter): string {
  switch (value) {
    case 'low':
      return '#64748b';
    case 'normal':
      return '#2d3fbf';
    case 'high':
      return '#d97706';
    case 'urgent':
      return '#dc2626';
    default:
      return '#2d3fbf';
  }
}

function priorityIcon(value: CalendarPriorityFilter): string {
  switch (value) {
    case 'low':
      return 'pi pi-angle-down';
    case 'normal':
      return 'pi pi-minus';
    case 'high':
      return 'pi pi-flag-fill';
    case 'urgent':
      return 'pi pi-bolt';
    default:
      return 'pi pi-circle';
  }
}

/** Una letra alfanumérica para chip de prioridad (traducción actual). */
const PRIORITY_LABEL_KEY: Record<CalendarPriorityFilter, string> = {
  low: 'globalCalendar.priorityLow',
  normal: 'globalCalendar.priorityNormal',
  high: 'globalCalendar.priorityHigh',
  urgent: 'globalCalendar.priorityUrgent',
};

function priorityAbbrev(value: CalendarPriorityFilter): string {
  const text = t(PRIORITY_LABEL_KEY[value] ?? 'globalCalendar.priorityNormal');
  for (const ch of text) {
    if (/[0-9A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/.test(ch)) {
      return ch.toUpperCase();
    }
  }
  return '?';
}

/** Soft circle fill for priority row icon (CSS color-mix). */
function colorMixSoft(hexOrVar: string): string {
  return `color-mix(in srgb, ${hexOrVar} 18%, var(--surface-raised))`;
}
</script>

<style scoped>
.cal-toolbar-filters__chips {
  flex: 0 1 auto;
  min-width: 0;
  max-width: 100%;
  flex-wrap: wrap;
  row-gap: 0.35rem;
}
.cal-filter-avatar--row :deep(.p-avatar) {
  width: 1.75rem;
  height: 1.75rem;
  font-size: 0.65rem;
}

.cal-toolbar-filters__reset.cal-toolbar-filters__reset {
  min-height: 2rem;
  height: 2rem;
  max-height: 2rem;
  padding-block: 0;
  padding-inline: 0.5rem;
  font-size: 0.7rem;
  border-radius: 9999px;
}
.cal-toolbar-filters__reset.cal-toolbar-filters__reset--active {
  border-color: color-mix(in srgb, var(--brand-zafiro, var(--accent)) 42%, var(--surface-border)) !important;
  color: var(--brand-zafiro, var(--accent)) !important;
  background: color-mix(in srgb, var(--brand-zafiro, var(--accent)) 12%, var(--surface-raised)) !important;
  font-weight: 600;
}
.cal-toolbar-filters__reset.cal-toolbar-filters__reset--active:not(:disabled):hover {
  background: color-mix(in srgb, var(--brand-zafiro, var(--accent)) 18%, var(--surface-raised)) !important;
  border-color: color-mix(in srgb, var(--brand-zafiro, var(--accent)) 58%, var(--surface-border)) !important;
}
.cal-toolbar-filters__reset :deep(.p-button-icon) {
  font-size: 0.7rem;
}
</style>
