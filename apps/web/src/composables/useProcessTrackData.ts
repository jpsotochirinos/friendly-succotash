import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  getProcessTrack,
  getProcessTrackResolved,
  getStageProgress,
} from '@/api/process-tracks';

export type StageRow = {
  id: string;
  order: number;
  status: string;
  stageTemplateCode: string;
  isReverted: boolean;
  metadata?: Record<string, unknown> | null;
  activities?: Array<{
    id: string;
    title: string;
    isMandatory: boolean;
    isReverted: boolean;
    workflowStateCategory: string;
    itemNumber?: number | null;
    kind?: string | null;
    dueDate?: string | null;
    priority?: string | null;
    isLegalDeadline?: boolean;
    accentColor?: string | null;
    assignedTo?: { id: string; firstName?: string; lastName?: string; email?: string } | null;
    metadata?: Record<string, unknown> | null;
  }>;
};

export function useProcessTrackData(getId: () => string) {
  const { t, locale } = useI18n();

  const loading = ref(true);
  const loadError = ref<string | null>(null);
  const progressMap = ref<
    Record<
      string,
      {
        total: number;
        done: number;
        mandatoryTotal: number;
        mandatoryDone: number;
        canAdvance: boolean;
        targetDueDate: string | null;
      }
    >
  >({});
  const pt = ref<{
    stageInstances: StageRow[];
    currentStageInstance?: { id: string; order: number } | null;
    blueprint?: { name?: string };
    metadata?: Record<string, unknown> | null;
    prefix?: string | null;
  } | null>(null);
  const resolved = ref<{ stages?: { code: string; name: string; order: number }[] } | null>(null);
  const currentStageInstanceId = ref<string | null>(null);
  const currentStageOrder = ref(0);

  function errMsg(e: unknown, fb: string) {
    if (e && typeof e === 'object' && 'response' in e) {
      const d = (e as { response?: { data?: { message?: unknown; code?: string } } }).response?.data;
      if (d && typeof d === 'object' && 'code' in d && d.code === 'STAGE_HAS_PENDING_MANDATORY') {
        return t('processTrack.sprint.advanceBlocked');
      }
      const workClosedByCode
        = d && typeof d === 'object' && 'code' in d && d.code === 'STAGE_WORK_CLOSED';
      const msgObj = d && typeof d === 'object' && 'message' in d ? (d as { message?: unknown }).message : null;
      const workClosedNested
        = typeof msgObj === 'object'
          && msgObj !== null
          && 'code' in msgObj
          && (msgObj as { code?: string }).code === 'STAGE_WORK_CLOSED';
      if (workClosedByCode || workClosedNested) {
        return t('processTrack.stage.workClosedBanner');
      }
      const notEditByCode = d && typeof d === 'object' && 'code' in d && d.code === 'STAGE_NOT_EDITABLE';
      const notEditNested =
        typeof msgObj === 'object'
        && msgObj !== null
        && 'code' in msgObj
        && (msgObj as { code?: string }).code === 'STAGE_NOT_EDITABLE';
      if (notEditByCode || notEditNested) {
        return t('processTrack.stage.terminalReadOnly');
      }
      if (d && typeof d === 'object' && 'message' in d && d.message) {
        if (typeof d.message === 'string') return d.message;
        if (Array.isArray(d.message)) return d.message.map(String).join(' ');
      }
    }
    return fb;
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString(locale.value, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  }

  function stageTitle(st: StageRow) {
    const label = st.metadata && typeof (st.metadata as { label?: string }).label === 'string' ? (st.metadata as { label: string }).label.trim() : '';
    if (label) return label;
    const code = st.stageTemplateCode;
    const s = resolved.value?.stages?.find((x) => x.code === code);
    return s?.name ?? code;
  }

  async function loadTrackData(silent: boolean) {
    const id = getId();
    if (!id) return;
    if (!silent) {
      loadError.value = null;
      loading.value = true;
    }
    try {
      const [track, tree] = await Promise.all([getProcessTrack(id), getProcessTrackResolved(id)]);
      pt.value = track as any;
      resolved.value = tree as any;
      const cur = (track as { currentStageInstance?: { id: string; order: number } | null })
        ?.currentStageInstance;
      currentStageInstanceId.value = cur?.id ?? null;
      currentStageOrder.value = cur?.order ?? 0;
      const stages = (track as { stageInstances?: StageRow[] })?.stageInstances ?? [];
      const pro: typeof progressMap.value = {};
      await Promise.all(
        (stages as StageRow[]).map(async (s) => {
          try {
            const p = await getStageProgress(id, s.id);
            pro[s.id] = {
              total: p.total,
              done: p.done,
              mandatoryTotal: p.mandatoryTotal,
              mandatoryDone: p.mandatoryDone,
              canAdvance: p.canAdvance,
              targetDueDate: p.targetDueDate,
            };
          } catch {
            pro[s.id] = {
              total: 0,
              done: 0,
              mandatoryTotal: 0,
              mandatoryDone: 0,
              canAdvance: false,
              targetDueDate: null,
            };
          }
        }),
      );
      progressMap.value = pro;
    } catch (e) {
      loadError.value = errMsg(e, t('app.loading'));
    } finally {
      if (!silent) {
        loading.value = false;
      }
    }
  }

  async function load() {
    await loadTrackData(false);
  }

  async function loadSilent() {
    await loadTrackData(true);
  }

  return {
    loading,
    loadError,
    progressMap,
    pt,
    resolved,
    currentStageInstanceId,
    currentStageOrder,
    errMsg,
    formatDate,
    stageTitle,
    load,
    loadSilent,
  };
}
