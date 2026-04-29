<template>
  <div class="matters-toolbar-scope-filters flex flex-wrap items-center gap-1.5">
    <template v-if="showStatus">
      <button
        type="button"
        class="matters-filter-trigger"
        :aria-label="t('trackables.statusFilterPlaceholder')"
        :aria-expanded="statusPopoverOpen"
        aria-haspopup="dialog"
        @click="(e) => statusPopoverRef?.toggle(e)"
      >
        <span
          v-if="status"
          class="matters-filter-trigger__status-dot shrink-0"
          :style="{ background: statusAccent(status) }"
          aria-hidden="true"
        />
        <span v-if="status" class="min-w-0 max-w-[9rem] truncate text-[11px] font-semibold text-[var(--fg-default)]">
          {{ statusLabel(status) }}
        </span>
        <div
          v-else
          class="matters-filter-trigger-empty"
          v-tooltip.top="t('trackables.statusFilterPlaceholder')"
        >
          <i class="pi pi-flag" aria-hidden="true" />
        </div>
        <span class="matters-filter-trigger__chev" aria-hidden="true">
          <i class="pi pi-chevron-down" />
        </span>
      </button>
      <Popover
        ref="statusPopoverRef"
        class="matters-scope-filter-popover w-[min(100vw-2rem,20rem)] border border-[var(--surface-border)] bg-[var(--surface-raised)] shadow-lg"
        @show="statusPopoverOpen = true"
        @hide="statusPopoverOpen = false"
      >
        <div class="flex max-h-[min(280px,50vh)] flex-col gap-1 overflow-hidden rounded-xl">
          <div class="shrink-0 border-b border-[var(--surface-border)] px-3 py-2">
            <p class="m-0 text-[11px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">
              {{ t('trackables.statusFilterPlaceholder') }}
            </p>
          </div>
          <ul class="m-0 min-h-0 list-none space-y-0.5 overflow-y-auto overscroll-contain p-1">
            <li>
              <button
                type="button"
                class="matters-scope-filter-row"
                :class="{ 'matters-scope-filter-row--active': !status }"
                @click="pickStatus(null)"
              >
                <span class="min-w-0 flex-1 truncate text-left text-sm text-[var(--fg-default)]">
                  {{ t('trackables.filterStatusAny') }}
                </span>
              </button>
            </li>
            <li v-for="opt in statusOptions" :key="opt.value">
              <button
                type="button"
                class="matters-scope-filter-row"
                :class="{ 'matters-scope-filter-row--active': status === opt.value }"
                @click="pickStatus(opt.value)"
              >
                <span
                  class="matters-filter-trigger__status-dot shrink-0"
                  :style="{ background: statusAccent(opt.value) }"
                  aria-hidden="true"
                />
                <span class="min-w-0 flex-1 truncate text-left text-sm text-[var(--fg-default)]">{{ opt.label }}</span>
              </button>
            </li>
          </ul>
        </div>
      </Popover>
    </template>

    <button
      type="button"
      class="matters-filter-trigger"
      :aria-label="t('trackables.assigneeFilterPlaceholder')"
      :aria-expanded="assigneePopoverOpen"
      aria-haspopup="dialog"
      @click="(e) => assigneePopoverRef?.toggle(e)"
    >
      <Avatar
        v-if="assigneeTriggerAvatar"
        :label="assigneeTriggerAvatar.initials"
        shape="circle"
        size="small"
        class="matters-filter-avatar shrink-0"
        :style="{ background: assigneeTriggerAvatar.bg, color: '#fff' }"
        :aria-label="assigneeTriggerAvatar.label"
        v-tooltip.top="assigneeTriggerAvatar.label"
      />
      <div
        v-else-if="assignedToId === UNASSIGNED"
        class="matters-filter-trigger-empty"
        v-tooltip.top="unassignedLabel"
      >
        <i class="pi pi-user-minus" aria-hidden="true" />
      </div>
      <div
        v-else
        class="matters-filter-trigger-empty"
        v-tooltip.top="t('trackables.assigneeFilterPlaceholder')"
      >
        <i class="pi pi-user-plus" aria-hidden="true" />
      </div>
      <span class="matters-filter-trigger__chev" aria-hidden="true">
        <i class="pi pi-chevron-down" />
      </span>
    </button>
    <Popover
      ref="assigneePopoverRef"
      class="matters-scope-filter-popover w-[min(100vw-2rem,22rem)] border border-[var(--surface-border)] bg-[var(--surface-raised)] shadow-lg"
      @show="onAssigneePopoverShow"
      @hide="onAssigneePopoverHide"
    >
      <div class="flex max-h-[min(360px,50vh)] flex-col gap-1 overflow-hidden rounded-xl">
        <div class="shrink-0 border-b border-[var(--surface-border)] px-3 py-2">
          <p class="m-0 text-[11px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">
            {{ t('trackables.assigneeFilterPlaceholder') }}
          </p>
        </div>
        <div class="shrink-0 border-b border-[var(--surface-border)] px-2 py-2">
          <IconField class="w-full">
            <InputIcon class="pi pi-search text-[var(--fg-subtle)]" />
            <InputText
              v-model="assigneeSearchQ"
              size="small"
              class="w-full min-w-0 text-sm"
              :placeholder="t('trackables.assigneeFilterSearchPlaceholder')"
              autocomplete="off"
              :aria-label="t('trackables.assigneeFilterSearchPlaceholder')"
            />
          </IconField>
        </div>
        <ul class="m-0 min-h-0 flex-1 list-none space-y-0.5 overflow-y-auto overscroll-contain p-1">
          <li>
            <button type="button" class="matters-scope-filter-row" :class="{ 'matters-scope-filter-row--active': !assignedToId }" @click="pickAssignee(null)">
              <span class="min-w-0 flex-1 truncate text-left text-sm text-[var(--fg-default)]">
                {{ t('trackables.filterAssigneeAny') }}
              </span>
            </button>
          </li>
          <li v-if="unassignedOption">
            <button
              type="button"
              class="matters-scope-filter-row"
              :class="{ 'matters-scope-filter-row--active': assignedToId === UNASSIGNED }"
              @click="pickAssignee(UNASSIGNED)"
            >
              <span
                class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-[var(--surface-border)] bg-[var(--surface-sunken)] text-[var(--fg-subtle)]"
                aria-hidden="true"
              >
                <i class="pi pi-user-minus text-[0.65rem]" />
              </span>
              <span class="min-w-0 flex-1 truncate text-left text-sm text-[var(--fg-default)]">{{ unassignedOption.label }}</span>
            </button>
          </li>
          <li v-for="opt in filteredUserAssigneeOptions" :key="opt.value">
            <button
              type="button"
              class="matters-scope-filter-row"
              :class="{ 'matters-scope-filter-row--active': assignedToId === opt.value }"
              @click="pickAssignee(opt.value)"
            >
              <Avatar
                :label="avatarInitials(opt.label)"
                shape="circle"
                size="small"
                class="matters-filter-avatar matters-filter-avatar--row shrink-0"
                :style="{ background: hashAvatarColor(opt.label), color: '#fff' }"
                aria-hidden="true"
              />
              <span class="min-w-0 flex-1 truncate text-left text-sm text-[var(--fg-default)]">{{ opt.label }}</span>
            </button>
          </li>
          <li v-if="filteredUserAssigneeOptions.length === 0 && assigneeSearchQ.trim()" class="px-2 py-4 text-center text-xs text-[var(--fg-muted)]">
            {{ t('trackables.assigneeFilterNoMatches') }}
          </li>
        </ul>
      </div>
    </Popover>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import Popover from 'primevue/popover';
import InputText from 'primevue/inputtext';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import Avatar from 'primevue/avatar';
import { avatarInitials, hashAvatarColor } from '@/utils/avatarColor';

const UNASSIGNED = '__unassigned__';

const props = defineProps<{
  showStatus: boolean;
  statusOptions: Array<{ label: string; value: string }>;
  assigneeOptions: Array<{ label: string; value: string }>;
}>();

const status = defineModel<string | null>('status');
const assignedToId = defineModel<string | null>('assignedToId');

const emit = defineEmits<{ (e: 'applied'): void }>();

const { t } = useI18n();

const statusPopoverRef = ref<InstanceType<typeof Popover> | null>(null);
const statusPopoverOpen = ref(false);
const assigneePopoverRef = ref<InstanceType<typeof Popover> | null>(null);
const assigneePopoverOpen = ref(false);
const assigneeSearchQ = ref('');

const unassignedOption = computed(() => props.assigneeOptions.find((o) => o.value === UNASSIGNED) ?? null);

const userAssigneeOptions = computed(() => props.assigneeOptions.filter((o) => o.value !== UNASSIGNED));

const filteredUserAssigneeOptions = computed(() => {
  const q = assigneeSearchQ.value.trim().toLowerCase();
  const list = userAssigneeOptions.value;
  if (!q) return list;
  return list.filter((o) => o.label.toLowerCase().includes(q));
});

const unassignedLabel = computed(() => unassignedOption.value?.label ?? t('trackables.unassigned'));

const assigneeTriggerAvatar = computed(() => {
  const id = assignedToId.value;
  if (id == null || id === '' || id === UNASSIGNED) return null;
  const opt = props.assigneeOptions.find((o) => o.value === id);
  if (!opt) return null;
  return {
    initials: avatarInitials(opt.label),
    bg: hashAvatarColor(opt.label),
    label: opt.label,
  };
});

function statusLabel(value: string) {
  return props.statusOptions.find((o) => o.value === value)?.label ?? value;
}

function statusAccent(value: string): string {
  switch (value) {
    case 'created':
      return '#64748b';
    case 'active':
      return '#2d3fbf';
    case 'under_review':
      return '#d97706';
    case 'completed':
      return '#15803d';
    default:
      return 'var(--fg-muted)';
  }
}

function onAssigneePopoverShow() {
  assigneePopoverOpen.value = true;
}

function onAssigneePopoverHide() {
  assigneePopoverOpen.value = false;
  assigneeSearchQ.value = '';
}

function pickStatus(next: string | null) {
  status.value = next;
  statusPopoverRef.value?.hide?.();
  emit('applied');
}

function pickAssignee(next: string | null) {
  assignedToId.value = next;
  assigneePopoverRef.value?.hide?.();
  emit('applied');
}
</script>

<style scoped>
/* Alineado con GlobalCalendarFiltersBar (cal-filter-trigger), escala toolbar ~32px. */
.matters-filter-trigger.matters-filter-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  flex-shrink: 0;
  max-width: 100%;
  box-sizing: border-box;
  min-height: 2rem;
  height: 2rem;
  max-height: 2rem;
  padding-block: 0;
  padding-inline: 0.28rem 0.38rem;
  gap: 0.35rem;
  border-radius: 9999px;
  border: 1px solid var(--surface-border);
  background: var(--surface-raised);
  color: var(--fg-muted);
  font: inherit;
  line-height: 1;
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    color 0.15s ease;
}
.matters-filter-trigger:hover {
  border-color: color-mix(in srgb, var(--brand-zafiro, var(--accent)) 28%, var(--surface-border));
  color: var(--fg-default);
}
.matters-filter-trigger:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--brand-zafiro, var(--accent)) 40%, var(--surface-border));
  outline-offset: 1px;
}

.matters-filter-trigger-empty {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 1.375rem;
  height: 1.375rem;
  min-width: 1.375rem;
  min-height: 1.375rem;
  flex-shrink: 0;
  border-radius: 9999px;
  border: 1px dashed var(--surface-border);
  background: var(--surface-sunken);
  color: var(--fg-subtle);
}
.matters-filter-trigger-empty .pi {
  font-size: 0.65rem;
}

.matters-filter-trigger__chev {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  margin-left: 0.05rem;
  opacity: 0.72;
}
.matters-filter-trigger__chev .pi {
  font-size: 9px;
}

.matters-filter-trigger__status-dot {
  width: 7px;
  height: 7px;
  border-radius: 9999px;
}

.matters-filter-trigger .matters-filter-avatar :deep(.p-avatar) {
  width: 1.375rem;
  height: 1.375rem;
  font-size: 0.52rem;
}

.matters-filter-avatar--row :deep(.p-avatar) {
  width: 1.75rem;
  height: 1.75rem;
  font-size: 0.65rem;
}

.matters-scope-filter-row {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  gap: 0.5rem;
  border: none;
  border-radius: 0.5rem;
  background: transparent;
  padding: 0.45rem 0.5rem;
  font: inherit;
  cursor: pointer;
  text-align: left;
  color: inherit;
  transition: background-color 0.12s ease;
}
.matters-scope-filter-row:hover {
  background: color-mix(in srgb, var(--accent-soft) 50%, transparent);
}
.matters-scope-filter-row:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--brand-zafiro, var(--accent)) 40%, var(--surface-border));
  outline-offset: 0;
}
.matters-scope-filter-row--active {
  background: color-mix(in srgb, var(--brand-zafiro, var(--accent)) 10%, var(--surface-raised));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--brand-zafiro, var(--accent)) 35%, var(--surface-border));
}
</style>
