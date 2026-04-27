<template>
  <div class="process-stepper flex min-h-0 flex-1 flex-col overflow-hidden">
    <div v-if="loadError" class="p-4 text-sm text-red-600">
      {{ loadError }}
    </div>
    <div v-else-if="loading" class="p-6 text-sm text-fg-muted">…</div>
    <div v-else class="min-h-0 flex-1 overflow-y-auto px-1 pb-4 [scrollbar-gutter:stable]">
      <div
        class="mx-auto w-full max-w-2xl rounded-xl border border-surface-200/90 bg-surface-0 p-4 shadow-sm dark:border-surface-600 dark:bg-surface-900/40"
      >
        <div
          class="mb-4 flex cursor-pointer select-none items-start justify-between gap-2 border-b border-surface-200/80 pb-3 dark:border-surface-600"
          :aria-expanded="!stepperListCollapsed"
          role="button"
          tabindex="0"
          @click="stepperListCollapsed = !stepperListCollapsed"
          @keydown.enter.prevent="stepperListCollapsed = !stepperListCollapsed"
          @keydown.space.prevent="stepperListCollapsed = !stepperListCollapsed"
        >
          <div>
            <h2 class="m-0 text-base font-semibold text-fg">
              {{ t('processTrack.stepper.heading', { name: flowLabel }) }}
            </h2>
            <p class="m-0 mt-1 text-xs text-fg-muted">
              {{ t('processTrack.stepper.subtitle', { n: orderedStages.length }) }}
            </p>
          </div>
        </div>

        <ol v-show="!stepperListCollapsed" class="m-0 list-none space-y-0 p-0">
          <li
            v-for="(st, idx) in orderedStages"
            :key="st.id"
            class="border-b border-surface-200/60 last:border-0 dark:border-surface-700/80"
          >
            <div
              class="flex cursor-pointer items-start gap-3 py-3"
              tabindex="0"
              :aria-label="stageTitle(st)"
              :aria-selected="expandedId === st.id"
              @click="onStageRowClick(st.id)"
              @keydown.enter.prevent="onStageRowClick(st.id)"
              @keydown.space.prevent="onStageRowClick(st.id)"
            >
              <div
                class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                :class="stepIconClass(st, idx)"
              >
                <i v-if="isStageDoneRow(st, idx)" class="pi pi-check" />
                <span v-else>{{ idx + 1 }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <span class="font-medium text-fg leading-snug">
                    {{ stageTitle(st) }}
                  </span>
                  <Tag :value="stageRowBadge(st)" rounded severity="secondary" class="!text-[10px]" />
                </div>
                <p v-if="progressMap[st.id]?.targetDueDate" class="m-0 mt-0.5 text-[11px] text-fg-muted">
                  {{ t('processTrack.sprint.targetDueDate') }}:
                  {{ formatDate(progressMap[st.id]!.targetDueDate!) }}
                </p>
                <p class="m-0 mt-0.5 text-[11px] text-fg-subtle">
                  {{ t('processTrack.sprint.progress') }}: {{ progressMap[st.id]?.done ?? 0 }} /
                  {{ progressMap[st.id]?.total ?? 0 }}
                </p>
                <div v-if="expandedId === st.id" class="mt-3" @click.stop>
                  <div v-if="!activityList(st).length" class="py-2 text-center text-xs text-fg-muted">
                    {{ t('processTrack.activity.empty') }}
                  </div>
                  <ul v-else class="m-0 list-none space-y-2 p-0">
                    <li
                      v-for="a in activityList(st)"
                      :key="a.id"
                      class="flex items-start justify-between gap-2 rounded border border-surface-200/70 bg-surface-50/80 p-2 dark:border-surface-600 dark:bg-surface-800/50"
                      :class="a.isReverted ? 'pointer-events-none opacity-50' : ''"
                    >
                      <div class="flex min-w-0 flex-1 items-start gap-2">
                        <Checkbox
                          v-if="!a.isReverted"
                          :model-value="(a.workflowStateCategory || '').toLowerCase() === 'done'"
                          :binary="true"
                          :disabled="completingId === a.id"
                          @update:model-value="(v) => onToggleDone(a, v === true, st.id)"
                        />
                        <div class="min-w-0">
                          <p class="m-0 text-sm text-fg">{{ a.title }}</p>
                          <p class="m-0 text-[10px] text-fg-muted">{{ activityStateLabel(a.workflowStateCategory) }}</p>
                        </div>
                      </div>
                      <div class="flex shrink-0 items-center gap-1">
                        <Button
                          v-if="!a.isReverted"
                          icon="pi pi-ellipsis-v"
                          rounded
                          text
                          size="small"
                          :aria-label="t('common.actions')"
                          @click="(e) => openActMenu(e, a, st.id)"
                        />
                      </div>
                    </li>
                  </ul>
                  <div class="mt-2 flex flex-wrap gap-1.5">
                    <Button
                      v-if="st.status === 'active' && !st.isReverted"
                      size="small"
                      :label="t('processTrack.sprint.advance')"
                      :loading="advancingId === st.id"
                      @click="onAdvanceClick(st)"
                    />
                    <Button
                      v-if="canReopen(st)"
                      size="small"
                      severity="secondary"
                      :label="t('processTrack.stage.reopen')"
                      :loading="reopening"
                      @click="openReopen(st)"
                    />
                    <Button
                      v-if="!st.isReverted && (st.status === 'active' || st.status === 'pending')"
                      size="small"
                      severity="secondary"
                      :label="t('processTrack.activity.addCustom')"
                      @click="activityCreateRef?.open(st.id)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </li>
        </ol>
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
import Checkbox from 'primevue/checkbox';
import Menu from 'primevue/menu';
import {
  completeActivity,
  deleteProcessTrackActivity,
  moveActivity,
  advanceStage,
  reopenStage,
  patchProcessTrackActivity,
} from '@/api/process-tracks';
import { useProcessTrackData, type StageRow } from '@/composables/useProcessTrackData';
import ReopenStageDialog from './ReopenStageDialog.vue';
import AdvanceStageDialog from './AdvanceStageDialog.vue';
import ActivityCreateDialog from './ActivityCreateDialog.vue';
import { WorkflowStateCategory } from '@tracker/shared';

const props = defineProps<{ processTrackId: string }>();

const emit = defineEmits<{
  selectStage: [stageId: string];
}>();

const { t } = useI18n();
const toast = useToast();
const confirm = useConfirm();
const {
  loading,
  loadError,
  progressMap,
  pt,
  resolved,
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

const flowLabel = computed(
  () => pt.value?.blueprint?.name?.trim() || t('processTrack.stepper.flowDefault'),
);

const expandedId = ref<string | null>(null);
const stepperListCollapsed = ref(false);
const completingId = ref<string | null>(null);
const advancingId = ref<string | null>(null);
const reopening = ref(false);
const reopenRef = ref<InstanceType<typeof ReopenStageDialog> | null>(null);
const advanceRef = ref<InstanceType<typeof AdvanceStageDialog> | null>(null);
const activityCreateRef = ref<InstanceType<typeof ActivityCreateDialog> | null>(null);
const reopenOptions = ref<{ id: string; label: string }[]>([]);
const actMenu = ref<InstanceType<typeof Menu> | null>(null);
const actMenuTarget = ref<{
  activityId: string;
  title: string;
  stageId: string;
} | null>(null);
const createStageOptions = computed(() =>
  orderedStages.value.map((s) => ({
    id: s.id,
    label: stageTitle(s),
  })),
);

function onStageRowClick(id: string) {
  emit('selectStage', id);
  expandedId.value = id;
}

watch(orderedStages, (list) => {
  const active = list.find((s) => (s.status || '').toLowerCase() === 'active');
  if (active && !expandedId.value) {
    expandedId.value = active.id;
  }
});

function stepIconClass(st: StageRow, idx: number) {
  const s = (st.status || '').toLowerCase();
  if (st.isReverted) return 'border border-surface-400 text-fg-muted line-through';
  if (s === 'completed' || s === 'skipped') return 'bg-primary-500 text-primary-contrast';
  if (s === 'active') {
    return 'border-2 border-primary-500 text-primary-600 dark:text-primary-300';
  }
  return 'border border-surface-300 text-fg-muted';
}

function isStageDoneRow(st: StageRow, _idx: number) {
  const s = (st.status || '').toLowerCase();
  return !st.isReverted && (s === 'completed' || s === 'skipped');
}

function stageRowBadge(st: StageRow) {
  if (st.isReverted) return t('processTrack.stepper.badge.reverted');
  const s = (st.status || '').toLowerCase();
  if (s === 'active') return t('processTrack.stepper.badge.inProgress');
  if (s === 'completed' || s === 'skipped') return t('processTrack.stepper.badge.done');
  return t('processTrack.stepper.badge.pending');
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
  return acts.filter((a) => (a.workflowStateCategory || '').toLowerCase() !== 'cancelled');
}

function canReopen(st: StageRow) {
  const status = (st.status || '').toLowerCase();
  if (status !== 'completed' && status !== 'skipped') return false;
  if (st.order >= currentStageOrder.value) return false;
  return !st.isReverted;
}

async function onToggleDone(
  a: { id: string; workflowStateCategory: string },
  done: boolean,
  _stageId: string,
) {
  completingId.value = a.id;
  try {
    if (done) {
      await completeActivity(props.processTrackId, a.id);
    } else {
      await patchProcessTrackActivity(props.processTrackId, a.id, {
        workflowStateCategory: WorkflowStateCategory.TODO,
      });
    }
    await load();
  } catch (e) {
    toast.add({ severity: 'error', summary: errMsg(e, t('processTrack.activity.markDone')), life: 4000 });
  } finally {
    completingId.value = null;
  }
}

function pendingOpenForAdvance(st: StageRow) {
  return activityList(st).filter((a) => {
    if (a.isReverted) return false;
    const c = (a.workflowStateCategory || '').toLowerCase();
    return c !== 'done' && c !== 'cancelled';
  });
}

function onAdvanceClick(st: StageRow) {
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
      await runStepperAdvanceWhenClean(st);
    },
  });
}

async function runStepperAdvanceWhenClean(st: StageRow) {
  advancingId.value = st.id;
  try {
    await advanceStage(props.processTrackId, st.id);
    toast.add({ severity: 'success', summary: t('processTrack.sprint.advance'), life: 2200 });
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

function openActMenu(
  e: Event,
  a: { id: string; title: string },
  stageId: string,
) {
  actMenuTarget.value = { activityId: a.id, title: a.title, stageId };
  actMenu.value?.toggle(e);
}

const actMenuModel = computed(() => {
  const from = actMenuTarget.value?.stageId;
  const sub = orderedStages.value
    .filter((s) => s.id !== from)
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
      ? [{ label: t('processTrack.activity.reassign'), items: sub } as { label: string; items: typeof sub }]
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
