<template>
  <div class="process-kanban flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--surface-app)]">
    <div v-if="loadError" class="p-4 text-sm text-red-600">
      {{ loadError }}
    </div>
    <div v-else-if="loading" class="p-6 text-sm text-fg-muted">…</div>
    <div v-else class="flex min-h-0 flex-1 flex-col">
      <div
        class="kanban-board-scroll min-h-[24rem] flex-1 overflow-auto px-4 pb-4 [scrollbar-gutter:stable]"
      >
        <div class="flex min-h-full min-w-max gap-3 pb-1 pt-2">
          <div
            v-for="st in orderedStages"
            :key="st.id"
            class="process-kanban-col flex w-[min(100vw,18rem)] max-w-[20rem] flex-shrink-0 flex-col rounded-lg border border-gray-200/90 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800/80"
            :class="st.isReverted ? 'opacity-60 grayscale' : ''"
            @dragover.prevent="onColDragOver"
            @drop="onColDrop($event, st.id)"
          >
            <div
              class="sticky top-0 z-10 flex flex-col gap-1 rounded-t-lg border-b border-gray-200 bg-white/95 px-3 py-2 dark:border-gray-600 dark:bg-gray-800/95"
            >
              <div class="flex items-start justify-between gap-2">
                <span class="line-clamp-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
                  {{ stageTitle(st) }}
                </span>
                <div class="flex shrink-0 flex-wrap items-center justify-end gap-0.5">
                  <Tag
                    v-if="isStageEditsLocked(st)"
                    :value="isWorkClosed(st) ? t('processTrack.stage.workClosedTag') : t('processTrack.stage.readOnlyShort')"
                    rounded
                    :severity="isWorkClosed(st) ? 'warn' : 'secondary'"
                    class="text-[10px]"
                  />
                  <Tag :value="stageStatusLabel(st)" rounded severity="secondary" class="shrink-0 text-[10px]" />
                </div>
              </div>
              <p v-if="progressMap[st.id]?.targetDueDate" class="m-0 text-[11px] text-gray-500 dark:text-gray-400">
                {{ t('processTrack.sprint.targetDueDate') }}:
                {{ formatDate(progressMap[st.id]!.targetDueDate!) }}
              </p>
              <p class="m-0 text-[11px] text-gray-600 dark:text-gray-300">
                {{ t('processTrack.sprint.progress') }}: {{ progressMap[st.id]?.done ?? 0 }} /
                {{ progressMap[st.id]?.total ?? 0 }} ·
                {{ t('processTrack.sprint.mandatory') }}:
                {{ progressMap[st.id]?.mandatoryDone ?? 0 }} /
                {{ progressMap[st.id]?.mandatoryTotal ?? 0 }}
              </p>
              <div class="flex flex-wrap gap-1.5">
                <Button
                  v-if="st.status === 'active' && !st.isReverted"
                  size="small"
                  :label="t('processTrack.stage.closeWork')"
                  :loading="advancingId === st.id"
                  @click="onAdvance(st)"
                />
                <Button
                  v-if="canReopen(st)"
                  size="small"
                  severity="secondary"
                  :label="t('processTrack.stage.reopen')"
                  :loading="reopening"
                  @click="openReopen(st)"
                />
              </div>
            </div>
            <div class="flex flex-1 flex-col gap-2 p-2">
              <p v-if="!activityList(st).length" class="m-0 text-center text-xs text-gray-400 py-3">
                {{ t('processTrack.activity.empty') }}
              </p>
              <div
                v-for="a in activityList(st)"
                :key="a.id"
                :draggable="!a.isReverted && !isStageEditsLocked(st)"
                class="rounded-lg border border-gray-200 bg-gray-50/80 p-2 text-sm dark:border-gray-600 dark:bg-gray-700/50"
                :class="[
                  a.isReverted || isStageEditsLocked(st) ? 'pointer-events-none opacity-50' : '',
                  !a.isReverted && !isStageEditsLocked(st) ? 'cursor-grab active:cursor-grabbing' : '',
                ]"
                @dragstart="onCardDragStart($event, a.id)"
                @dragend="onCardDragEnd"
              >
                <div class="mb-1 flex items-start justify-between gap-1">
                  <span class="font-medium leading-tight text-gray-900 dark:text-gray-50">{{ a.title }}</span>
                  <div class="flex shrink-0 items-center gap-0.5">
                    <Tag v-if="a.isMandatory" :value="t('processTrack.sprint.mandatory')" class="!text-[9px]" />
                    <Button
                      v-if="!a.isReverted && !isStageEditsLocked(st)"
                      icon="pi pi-ellipsis-v"
                      rounded
                      text
                      size="small"
                      :aria-label="t('common.actions')"
                      @click="(e) => openActMenu(e, a, st.id)"
                    />
                  </div>
                </div>
                <p class="m-0 text-[10px] text-gray-500">
                  {{ activityStateLabel(a.workflowStateCategory) }}
                </p>
                <Button
                  v-if="!a.isReverted && !isStageEditsLocked(st) && (a.workflowStateCategory || '').toLowerCase() !== 'done'"
                  class="mt-2"
                  size="small"
                  text
                  :label="t('processTrack.activity.markDone')"
                  :loading="completingId === a.id"
                  @click="onComplete(a)"
                />
              </div>
              <Button
                v-if="!st.isReverted && !isStageEditsLocked(st) && (st.status === 'active' || st.status === 'pending')"
                size="small"
                severity="secondary"
                :label="t('processTrack.activity.addCustom')"
                :loading="addOpenFor === st.id"
                @click="startAddCustom(st.id)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <ConfirmDialog />
    <ReopenStageDialog ref="reopenRef" :stages="reopenOptions" @confirm="onReopenConfirm" />
    <AdvanceStageDialog ref="advanceRef" @done="load" />
    <Menu ref="actMenu" :model="actMenuModel" :popup="true" />
    <ActivityCreateDialog
      ref="activityCreateRef"
      :process-track-id="processTrackId"
      :stages="createStageOptions"
      @created="load"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import ConfirmDialog from 'primevue/confirmdialog';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Menu from 'primevue/menu';
import {
  advanceStage,
  completeActivity,
  deleteProcessTrackActivity,
  moveActivity,
  reopenStage,
} from '@/api/process-tracks';
import { isStageEditsLocked, isStageWorkClosed } from '@tracker/shared';
import { useProcessTrackData, type StageRow } from '@/composables/useProcessTrackData';
import ReopenStageDialog from './ReopenStageDialog.vue';
import AdvanceStageDialog from './AdvanceStageDialog.vue';
import ActivityCreateDialog from './ActivityCreateDialog.vue';

const props = defineProps<{ processTrackId: string }>();

const { t } = useI18n();
const toast = useToast();
const confirm = useConfirm();

const {
  loading,
  loadError,
  progressMap,
  pt,
  currentStageOrder,
  errMsg,
  formatDate,
  stageTitle,
  load,
} = useProcessTrackData(() => props.processTrackId);

const orderedStages = computed(() => {
  const list = pt.value?.stageInstances ?? [];
  return [...list].sort((a, b) => a.order - b.order);
});

const createStageOptions = computed(() =>
  orderedStages.value
    .filter((s) => !isStageEditsLocked(s))
    .map((s) => ({
      id: s.id,
      label: stageTitle(s),
    })),
);

function stageStatusLabel(st: StageRow) {
  if (st.isReverted) return t('processTrack.stage.status.reverted');
  const s = (st.status || '').toLowerCase();
  if (s === 'active') return t('processTrack.stage.status.active');
  if (s === 'pending') return t('processTrack.stage.status.pending');
  if (s === 'completed') return t('processTrack.stage.status.completed');
  if (s === 'skipped') return t('processTrack.stage.status.skipped');
  return st.status;
}

function activityStateLabel(cat: string) {
  const c = (cat || '').toLowerCase();
  if (c === 'done') return t('processTrack.activity.state.done');
  if (c === 'in_progress' || c === 'in_review') return t('processTrack.activity.state.inProgress');
  if (c === 'cancelled') return t('processTrack.activity.state.cancelled');
  return t('processTrack.activity.state.todo');
}

function activityList(st: StageRow) {
  const acts = st.activities ?? [];
  return acts.filter((a) => a.workflowStateCategory?.toLowerCase() !== 'cancelled');
}

function canReopen(st: StageRow) {
  const status = (st.status || '').toLowerCase();
  if (status !== 'completed' && status !== 'skipped') return false;
  if (st.order >= currentStageOrder.value) return false;
  return !st.isReverted;
}

function isWorkClosed(st: StageRow) {
  return isStageWorkClosed(st.metadata as Record<string, unknown> | null);
}

function pendingOpenForAdvance(st: StageRow) {
  return activityList(st).filter((a) => {
    if (a.isReverted) return false;
    const c = (a.workflowStateCategory || '').toLowerCase();
    return c !== 'done' && c !== 'cancelled';
  });
}

const completingId = ref<string | null>(null);
const advancingId = ref<string | null>(null);
const reopening = ref(false);
const reopenRef = ref<InstanceType<typeof ReopenStageDialog> | null>(null);
const advanceRef = ref<InstanceType<typeof AdvanceStageDialog> | null>(null);
const activityCreateRef = ref<InstanceType<typeof ActivityCreateDialog> | null>(null);
const reopenOptions = ref<{ id: string; label: string }[]>([]);
const addOpenFor = ref<string | null>(null);
const actMenu = ref<InstanceType<typeof Menu> | null>(null);
const actMenuTarget = ref<{ activityId: string; stageId: string } | null>(null);
let dragActivityId: string | null = null;

async function onComplete(a: { id: string }) {
  completingId.value = a.id;
  try {
    await completeActivity(props.processTrackId, a.id);
    await load();
  } catch (e) {
    toast.add({ severity: 'error', summary: errMsg(e, t('processTrack.activity.markDone')), life: 4000 });
  } finally {
    completingId.value = null;
  }
}

function onAdvance(st: StageRow) {
  const pend = pendingOpenForAdvance(st);
  if (pend.length > 0) {
    advanceRef.value?.show({
      processTrackId: props.processTrackId,
      stageInstanceId: st.id,
      pending: pend.map((x) => ({ id: x.id, title: x.title })),
    });
    return;
  }
  if (!progressMap.value[st.id]?.canAdvance) {
    toast.add({ severity: 'warn', summary: t('processTrack.sprint.advance'), life: 3000 });
    return;
  }
  confirm.require({
    header: t('processTrack.stage.closeWorkConfirmTitle'),
    message: t('processTrack.stage.closeWorkConfirmMessage'),
    icon: 'pi pi-exclamation-circle',
    acceptLabel: t('processTrack.stage.closeWork'),
    rejectLabel: t('common.cancel'),
    accept: async () => {
      await runKanbanAdvanceWhenClean(st);
    },
  });
}

async function runKanbanAdvanceWhenClean(st: StageRow) {
  advancingId.value = st.id;
  try {
    await advanceStage(props.processTrackId, st.id);
    toast.add({ severity: 'success', summary: t('processTrack.stage.closeWork'), life: 2200 });
    await load();
  } catch (e) {
    const p = (e as { response?: { data?: { pending?: { id: string; title: string }[] } } })?.response?.data
      ?.pending;
    if (p?.length) {
      advanceRef.value?.show({ processTrackId: props.processTrackId, stageInstanceId: st.id, pending: p });
      return;
    }
    toast.add({ severity: 'error', summary: errMsg(e, t('processTrack.sprint.advance')), life: 4000 });
  } finally {
    advancingId.value = null;
  }
}

function openReopen(st: StageRow) {
  reopenOptions.value = [{ id: st.id, label: `${stageTitle(st)}` }];
  reopenRef.value?.show();
}

async function onReopenConfirm(p: { stageId: string; reason: string }) {
  reopening.value = true;
  try {
    await reopenStage(props.processTrackId, p.stageId, { reason: p.reason });
    toast.add({ severity: 'success', summary: t('processTrack.stage.reopen'), life: 2400 });
    reopenRef.value?.close();
    await load();
  } catch (e) {
    toast.add({ severity: 'error', summary: errMsg(e, t('processTrack.stage.reopen')), life: 4000 });
  } finally {
    reopening.value = false;
  }
}

function startAddCustom(stageId: string) {
  addOpenFor.value = stageId;
  activityCreateRef.value?.open(stageId);
  addOpenFor.value = null;
}

function onCardDragStart(e: DragEvent, activityId: string) {
  dragActivityId = activityId;
  e.dataTransfer?.setData('text/plain', activityId);
  e.dataTransfer!.effectAllowed = 'move';
}

function onCardDragEnd() {
  dragActivityId = null;
}

function onColDragOver() {
  /* need handler for drop target */
}

async function onColDrop(e: DragEvent, stageId: string) {
  e.preventDefault();
  const st = orderedStages.value.find((s) => s.id === stageId);
  if (st && isStageEditsLocked(st)) {
    toast.add({ severity: 'warn', summary: t('processTrack.stage.terminalReadOnly'), life: 3500 });
    dragActivityId = null;
    return;
  }
  const id = e.dataTransfer?.getData('text/plain') || dragActivityId;
  if (!id) return;
  try {
    await moveActivity(props.processTrackId, id, stageId);
    await load();
  } catch (err) {
    toast.add({ severity: 'error', summary: errMsg(err, t('processTrack.activity.reassignError')), life: 4000 });
  } finally {
    dragActivityId = null;
  }
}

function openActMenu(
  e: Event,
  a: { id: string },
  stageId: string,
) {
  actMenuTarget.value = { activityId: a.id, stageId };
  actMenu.value?.toggle(e);
}

const actMenuModel = computed(() => {
  const from = actMenuTarget.value?.stageId;
  const sub = orderedStages.value
    .filter((s) => s.id !== from && !isStageEditsLocked(s))
    .map((s) => ({
      label: `${t('processTrack.activity.reassignTo')}: ${stageTitle(s)}`,
      command: () => onMoveTo(s.id),
    }));
  return [
    {
      label: t('processTrack.activity.delete'),
      icon: 'pi pi-trash',
      command: () => onDeleteAct(),
    },
    ...(sub.length
      ? ([{ label: t('processTrack.activity.reassign'), items: sub }] as {
          label: string;
          items: typeof sub;
        }[])
      : []),
  ];
});

async function onDeleteAct() {
  const t0 = actMenuTarget.value;
  if (!t0) return;
  try {
    await deleteProcessTrackActivity(props.processTrackId, t0.activityId);
    toast.add({ severity: 'info', summary: t('common.success'), life: 2200 });
    await load();
  } catch (e) {
    toast.add({ severity: 'error', summary: errMsg(e, t('processTrack.activity.delete.error')), life: 4000 });
  }
  actMenuTarget.value = null;
}

async function onMoveTo(targetStageId: string) {
  const t0 = actMenuTarget.value;
  if (!t0) return;
  try {
    await moveActivity(props.processTrackId, t0.activityId, targetStageId);
    await load();
  } catch (e) {
    toast.add({ severity: 'error', summary: errMsg(e, t('processTrack.activity.reassignError')), life: 4000 });
  }
  actMenuTarget.value = null;
}

watch(
  () => props.processTrackId,
  (id) => {
    if (id) void load();
  },
  { immediate: true },
);
</script>
