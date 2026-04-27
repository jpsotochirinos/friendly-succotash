<template>
  <Drawer
    v-model:visible="open"
    position="right"
    :header="t('globalCalendar.openActivity')"
    :style="drawerStyle"
    class="cal-event-drawer"
  >
    <div v-if="event" class="flex flex-col gap-4">
      <div>
        <h3 class="text-lg font-semibold text-[var(--fg-default)] m-0 leading-snug">{{ event.title }}</h3>
        <p class="text-sm text-[var(--fg-muted)] m-0 mt-1">{{ timeLabel }}</p>
      </div>

      <div class="flex flex-wrap gap-2">
        <Tag v-if="kindLabel" :value="kindLabel" severity="secondary" />
        <Tag v-if="priorityLabel" :value="priorityLabel" :severity="prioritySeverity" />
        <Tag v-if="event.source === 'birthday'" :value="t('globalCalendar.legendBirthday')" severity="info" />
        <Tag v-if="event.source === 'external'" :value="t('globalCalendar.filterKindExternal')" severity="info" />
        <Tag v-if="event.source === 'public_holiday_pe'" :value="t('globalCalendar.filterKindPeruHoliday')" severity="success" />
      </div>

      <div v-if="trackableTitle && trackableId" class="text-sm">
        <span class="text-[var(--fg-muted)]">{{ t('globalCalendar.trackableLabel') }}: </span>
        <RouterLink
          v-if="canOpenFlow"
          class="text-[var(--accent)] font-medium"
          :to="{ name: 'expediente', params: { id: trackableId } }"
        >
          {{ trackableTitle }}
        </RouterLink>
        <span v-else class="font-medium text-[var(--fg-default)]">{{ trackableTitle }}</span>
      </div>

      <div v-if="location" class="text-sm">
        <p class="text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)] m-0 mb-1">{{ t('globalCalendar.drawerLocation') }}</p>
        <p class="m-0 text-[var(--fg-default)]">{{ location }}</p>
      </div>

      <div v-if="assigneeLine" class="text-sm">
        <p class="text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)] m-0 mb-1">{{ t('globalCalendar.drawerAssignees') }}</p>
        <p class="m-0 text-[var(--fg-default)]">{{ assigneeLine }}</p>
      </div>

      <div v-if="isWorkflow && canUpdate" class="flex flex-col gap-2 pt-2 border-t border-[var(--surface-border)]">
        <div class="flex flex-wrap gap-2">
          <RouterLink v-if="flowLink && canOpenFlow" v-slot="{ navigate }" :to="flowLink" custom>
            <Button
              :label="t('globalCalendar.openActivity')"
              icon="pi pi-external-link"
              size="small"
              type="button"
              @click="navigate"
            />
          </RouterLink>
          <RouterLink v-if="flowLink && canOpenFlow" v-slot="{ navigate }" :to="flowLink" custom>
            <Button
              :label="t('globalCalendar.drawerReschedule')"
              icon="pi pi-calendar"
              size="small"
              outlined
              type="button"
              @click="navigate"
            />
          </RouterLink>
        </div>
        <div v-if="userOptions.length" class="flex flex-wrap items-end gap-2">
          <div class="flex flex-col gap-1 min-w-[12rem] flex-1">
            <label class="text-xs font-medium text-[var(--fg-muted)]">{{ t('globalCalendar.drawerDelegate') }}</label>
            <Dropdown
              v-model="delegateUserId"
              :options="userOptions"
              option-label="label"
              option-value="value"
              :placeholder="t('globalCalendar.assignPlaceholder')"
              class="w-full"
              show-clear
            />
          </div>
          <Button
            :label="t('common.save')"
            icon="pi pi-check"
            size="small"
            type="button"
            :disabled="!delegateUserId || delegating"
            :loading="delegating"
            @click="runDelegate"
          />
        </div>
        <div v-if="transitions.length" class="flex flex-col gap-1">
          <span class="text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)]">{{ t('common.actions') }}</span>
          <div class="flex flex-wrap gap-2">
            <Button
              v-for="tr in transitions"
              :key="tr.to"
              :label="tr.label"
              size="small"
              severity="secondary"
              type="button"
              :loading="transitioning === tr.to"
              @click="runTransition(tr.to)"
            />
          </div>
        </div>
      </div>

      <div v-if="!isWorkflow" class="text-sm text-[var(--fg-muted)]">
        {{ t('globalCalendar.selectDayPrompt') }}
      </div>
    </div>
  </Drawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import Drawer from 'primevue/drawer';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Dropdown from 'primevue/dropdown';
import { apiClient } from '@/api/client';
import type { ApiCalendarEvent } from '@/composables/useCalendarAdapter';
import { parseActivityIdFromEventId } from '@/composables/useCalendarAdapter';
import { classifyApiEvent } from '@/composables/calendarEventKind';

const props = defineProps<{
  visible: boolean;
  event: ApiCalendarEvent | null;
  canOpenFlow: boolean;
  canUpdate: boolean;
  userOptions: Array<{ label: string; value: string }>;
}>();

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void;
  (e: 'updated'): void;
}>();

const { t, locale } = useI18n();
const toast = useToast();

const open = computed({
  get: () => props.visible,
  set: (v: boolean) => emit('update:visible', v),
});

const drawerStyle = computed(() =>
  typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
    ? { width: '100vw' }
    : { width: 'min(420px, 100vw)' },
);

const isWorkflow = computed(() => props.event?.source === 'workflow');

const activityInstanceId = computed(
  () => (props.event?.extendedProps?.activityInstanceId as string) || null,
);
const workflowItemId = computed(() => {
  if (!props.event?.id) return (props.event?.extendedProps?.workflowItemId as string) || null;
  const parsed = parseActivityIdFromEventId(props.event.id);
  if (parsed?.kind === 'ai') return null;
  if (parsed?.kind === 'wi') return parsed.id;
  return (props.event?.extendedProps?.workflowItemId as string) || null;
});

const trackableId = computed(() => String(props.event?.extendedProps?.trackableId || ''));

const trackableTitle = computed(() => String(props.event?.extendedProps?.trackableTitle || ''));

const flowLink = computed(() => {
  if (!trackableId.value) return null;
  if (activityInstanceId.value) {
    return {
      name: 'expediente' as const,
      params: { id: trackableId.value },
      query: { activityInstanceId: activityInstanceId.value, tab: '1' },
    };
  }
  if (!workflowItemId.value) return null;
  return {
    name: 'expediente' as const,
    params: { id: trackableId.value },
    query: { workflowItemId: workflowItemId.value },
  };
});

const timeLabel = computed(() => {
  const e = props.event;
  if (!e) return '';
  if (e.allDay) return t('globalCalendar.allDay');
  const s = new Date(e.start);
  const end = new Date(e.end);
  return `${s.toLocaleString(locale.value)} – ${end.toLocaleString(locale.value)}`;
});

const kindLabel = computed(() => {
  const e = props.event;
  if (!e || e.source !== 'workflow') return '';
  const k = classifyApiEvent(e);
  const map: Record<string, string> = {
    hearing: t('globalCalendar.kindHearing'),
    deadline: t('globalCalendar.filterKindDeadline'),
    meeting: t('globalCalendar.kindMeeting'),
    call: t('globalCalendar.kindCall'),
    task: t('globalCalendar.kindTask'),
    filing: t('globalCalendar.kindFiling'),
    other: t('globalCalendar.kindOther'),
  };
  return map[k] || String(e.extendedProps?.kind || '');
});

const priorityLabel = computed(() => {
  const p = props.event?.extendedProps?.priority as string | undefined;
  if (!p || props.event?.source !== 'workflow') return '';
  const map: Record<string, string> = {
    low: t('globalCalendar.priorityLow'),
    normal: t('globalCalendar.priorityNormal'),
    high: t('globalCalendar.priorityHigh'),
    urgent: t('globalCalendar.priorityUrgent'),
  };
  return map[p] || p;
});

const prioritySeverity = computed(() => {
  const p = props.event?.extendedProps?.priority as string | undefined;
  if (p === 'urgent') return 'danger' as const;
  if (p === 'high') return 'warn' as const;
  return 'secondary' as const;
});

const location = computed(() => String(props.event?.extendedProps?.location || ''));

const assigneeLine = computed(() => {
  const e = props.event;
  if (!e || e.source !== 'workflow') return '';
  const name = e.extendedProps?.assignedToName as string | undefined;
  const email = e.extendedProps?.assignedToEmail as string | undefined;
  if (name) return name;
  if (email) return email;
  return '';
});

const delegateUserId = ref<string | null>(null);
const delegating = ref(false);
const transitioning = ref<string | null>(null);
const transitions = ref<Array<{ to: string; label: string }>>([]);

watch(
  () => [props.visible, workflowItemId.value] as const,
  async ([vis, wid]) => {
    delegateUserId.value = null;
    transitions.value = [];
    if (!vis || !wid || !props.canUpdate) return;
    try {
      const { data } = await apiClient.get<Array<{ to: string; label: string }>>(`/workflow-items/${wid}/transitions`);
      transitions.value = Array.isArray(data) ? data : [];
    } catch {
      transitions.value = [];
    }
  },
  { immediate: true },
);

async function runDelegate() {
  const id = workflowItemId.value;
  const uid = delegateUserId.value;
  if (!id || !uid) return;
  delegating.value = true;
  try {
    await apiClient.patch(`/workflow-items/${id}`, { assignedToId: uid });
    toast.add({ severity: 'success', summary: t('globalCalendar.drawerDelegated'), life: 3500 });
    emit('updated');
    emit('update:visible', false);
  } catch {
    toast.add({ severity: 'error', summary: t('globalCalendar.createError'), life: 4000 });
  } finally {
    delegating.value = false;
  }
}

async function runTransition(target: string) {
  const id = workflowItemId.value;
  if (!id) return;
  transitioning.value = target;
  try {
    await apiClient.patch(`/workflow-items/${id}/transition`, { status: target });
    toast.add({ severity: 'success', summary: t('globalCalendar.drawerCompleted'), life: 3500 });
    emit('updated');
    emit('update:visible', false);
  } catch {
    toast.add({ severity: 'error', summary: t('globalCalendar.createError'), life: 4000 });
  } finally {
    transitioning.value = null;
  }
}
</script>
