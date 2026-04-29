<template>
  <InformationalDialogBase
    v-model:visible="open"
    :variant="dialogVariant"
    :eyebrow="t('reviewProcessLog.eyebrow')"
    :title="t('reviewProcessLog.title')"
    :subject="documentSubject"
    :message="bodyMessage"
    :facts="logFacts"
    icon="pi pi-history"
    :loading="loading"
    :close-label="t('common.gotIt')"
    :close-aria-label="t('common.close')"
  >
    <div v-if="log && !loading && !noData" class="review-log-body flex flex-col gap-5">
      <div
        class="review-log-verdict flex flex-wrap items-start justify-between gap-4 rounded-xl border px-4 py-3"
        :class="log.passed ? 'review-log-verdict--ok' : 'review-log-verdict--fail'"
      >
        <div class="flex min-w-0 items-start gap-3">
          <i
            class="pi shrink-0 text-2xl"
            :class="
              log.passed
                ? 'pi-check-circle text-emerald-600 dark:text-emerald-400'
                : 'pi-times-circle text-red-600 dark:text-red-300'
            "
            aria-hidden="true"
          />
          <div class="min-w-0">
            <p
              class="m-0 text-base font-semibold leading-snug"
              :class="
                log.passed ? 'text-emerald-800 dark:text-emerald-200' : 'text-red-800 dark:text-red-200'
              "
            >
              {{ log.verdict }}
            </p>
            <p class="m-0 mt-1 text-sm leading-snug text-[var(--fg-muted)]">
              {{ formatDateIso(log.evaluatedAt) }}
            </p>
          </div>
        </div>
        <div class="shrink-0 text-right">
          <p
            class="m-0 max-w-[8rem] text-2xl font-semibold tabular-nums tracking-tight leading-none"
            :class="scoreStrengthClass(log.overallScore)"
            style="font-feature-settings: 'tnum' 1, 'lnum' 1"
          >
            {{ Math.round(log.overallScore * 100) }}%
          </p>
          <p class="m-0 mt-1 max-w-[10rem] text-xs tabular-nums text-[var(--fg-subtle)]">
            {{
              t('reviewProcessLog.thresholdLine', {
                pct: Math.round(log.threshold * 100),
              })
            }}
          </p>
        </div>
      </div>

      <section
        class="rounded-xl border px-4 py-3"
        style="border-color: var(--surface-border); background: var(--surface-sunken)"
      >
        <div class="mb-2 flex items-center gap-2">
          <i class="pi pi-book text-sm text-[var(--fg-muted)]" aria-hidden="true" />
          <span class="rpc-caption-label">{{ t('reviewProcessLog.summaryTitle') }}</span>
        </div>
        <p class="m-0 text-sm leading-relaxed text-[var(--fg-muted)]">
          {{ log.narrativeSummary }}
        </p>
      </section>

      <div class="review-log-timeline-section">
        <div class="mb-3 flex items-center gap-2">
          <i class="pi pi-list text-sm text-[var(--fg-muted)]" aria-hidden="true" />
          <span class="rpc-caption-label">{{ t('reviewProcessLog.timelineTitle') }}</span>
        </div>

        <Timeline :value="log.steps" class="rpc-timeline-wrapper pl-0">
          <template #marker="{ item }">
            <span class="rpc-step-marker flex h-8 w-8 items-center justify-center rounded-full" :class="markerTone(item.status)">
              <i :class="[stepIcon(item.status), 'text-sm']" aria-hidden="true" />
            </span>
          </template>
          <template #content="{ item }">
            <div class="rpc-step-content pb-8 last:!pb-0">
              <div class="mb-1 flex flex-wrap items-center gap-2 gap-y-1">
                <span class="text-sm font-semibold leading-snug text-[var(--fg-default)]">{{ item.label }}</span>
                <Tag
                  v-if="item.score != null"
                  class="text-[10px] font-semibold uppercase"
                  :value="`${Math.round(item.score * 100)} %`"
                  :severity="
                    item.status === 'passed' ? 'success' : item.status === 'failed' ? 'danger' : 'secondary'
                  "
                />
                <Tag
                  class="text-[10px] font-semibold uppercase"
                  :value="stepStatusLabelUi(item.status)"
                  :severity="
                    item.status === 'passed' ? 'success' : item.status === 'failed' ? 'danger' : 'secondary'
                  "
                />
              </div>
              <p class="mb-2 text-sm leading-snug text-[var(--fg-muted)]">{{ item.summary }}</p>

              <div v-if="hasExpandableDetails(item)" class="mt-1">
                <button
                  type="button"
                  class="rpc-expand-btn inline-flex items-center gap-1 rounded-md px-0 py-1 text-[0.8125rem] font-medium text-[var(--accent)] transition-colors hover:underline"
                  @click="toggleExpand(item.name)"
                >
                  <i :class="expanded[item.name] ? 'pi pi-chevron-up' : 'pi pi-chevron-down'" class="text-[10px]" aria-hidden="true" />
                  {{ expanded[item.name] ? t('reviewProcessLog.expandHide') : t('reviewProcessLog.expandShow') }}
                </button>
                <div
                  v-if="expanded[item.name]"
                  class="mt-2 rounded-lg border px-3 py-2 text-sm leading-snug"
                  style="
                    border-color: var(--surface-border);
                    background: color-mix(in srgb, var(--surface-app-soft) 88%, var(--surface-sunken));
                  "
                >
                  <template v-if="item.name === 'spelling' && item.details.misspelledWords?.length">
                    <p class="mb-1 text-xs text-[var(--fg-muted)]">{{ t('reviewProcessLog.misspelledWords') }}</p>
                    <div class="flex flex-wrap gap-1">
                      <Tag
                        v-for="word in item.details.misspelledWords.slice(0, 20)"
                        :key="word"
                        :value="word"
                        severity="warn"
                      />
                      <span v-if="item.details.misspelledWords.length > 20" class="self-center text-xs text-[var(--fg-subtle)]">
                        {{
                          t('reviewProcessLog.moreTail', {
                            n: item.details.misspelledWords.length - 20,
                          })
                        }}
                      </span>
                    </div>
                  </template>

                  <template v-if="item.name === 'citations'">
                    <div v-if="item.details.invalidCitations?.length">
                      <p class="mb-1 text-xs font-semibold text-red-600 dark:text-red-300">
                        {{ t('reviewProcessLog.invalidCitations') }}
                      </p>
                      <ul class="m-0 list-inside list-disc text-[var(--fg-muted)]">
                        <li v-for="c in item.details.invalidCitations" :key="c">{{ c }}</li>
                      </ul>
                    </div>
                    <div v-if="item.details.citationsFound?.length" class="mt-3">
                      <p class="mb-1 text-xs text-[var(--fg-muted)]">{{ t('reviewProcessLog.citationsFound') }}</p>
                      <div class="flex flex-wrap gap-1">
                        <Tag
                          v-for="c in item.details.citationsFound.slice(0, 15)"
                          :key="c"
                          :value="c"
                          severity="info"
                        />
                      </div>
                    </div>
                  </template>

                  <template v-if="item.name === 'coherence'">
                    <div v-if="item.details.issues?.length" class="mb-2">
                      <p class="mb-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                        {{ t('reviewProcessLog.issuesDetected') }}
                      </p>
                      <ul class="m-0 list-inside list-disc text-[var(--fg-muted)]">
                        <li v-for="issue in item.details.issues" :key="issue">{{ issue }}</li>
                      </ul>
                    </div>
                    <div v-if="item.details.suggestions?.length">
                      <p class="mb-1 text-xs font-semibold text-[var(--accent)]">{{ t('reviewProcessLog.suggestions') }}</p>
                      <ul class="m-0 list-inside list-disc text-[var(--fg-muted)]">
                        <li v-for="sug in item.details.suggestions" :key="sug">{{ sug }}</li>
                      </ul>
                    </div>
                  </template>

                  <template v-if="item.name === 'references' && item.details.outdatedReferences?.length">
                    <p class="mb-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                      {{ t('reviewProcessLog.outdatedRefs') }}
                    </p>
                    <ul class="m-0 list-inside list-disc text-[var(--fg-muted)]">
                      <li v-for="r in item.details.outdatedReferences" :key="r">{{ r }}</li>
                    </ul>
                  </template>

                  <template v-if="item.name === 'structure' && item.details.missingSections?.length">
                    <p class="mb-1 text-xs font-semibold text-red-600 dark:text-red-300">
                      {{ t('reviewProcessLog.missingSections') }}
                    </p>
                    <ul class="m-0 list-inside list-disc text-[var(--fg-muted)]">
                      <li v-for="s in item.details.missingSections" :key="s">{{ s }}</li>
                    </ul>
                  </template>
                </div>
              </div>
            </div>
          </template>
        </Timeline>
      </div>
    </div>
  </InformationalDialogBase>
</template>

<script setup lang="ts">
import { ref, watch, computed, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import Timeline from 'primevue/timeline';
import Tag from 'primevue/tag';
import { useToast } from 'primevue/usetoast';
import InformationalDialogBase from '@/components/common/InformationalDialogBase.vue';
import type { InformationalDialogFact } from '@/components/common/InformationalDialogBase.vue';
import { apiClient } from '@/api/client';

interface LogStep {
  name: string;
  label: string;
  status: 'passed' | 'failed' | 'skipped';
  score: number | null;
  summary: string;
  details: Record<string, unknown>;
}

interface EvaluationLog {
  documentId: string;
  evaluationId: string;
  evaluatedAt: string;
  overallScore: number;
  threshold: number;
  passed: boolean;
  verdict: string;
  narrativeSummary: string;
  steps: LogStep[];
}

const props = defineProps<{
  documentId: string | null;
  documentTitle?: string;
}>();

const open = defineModel<boolean>('visible', { required: true });
const toast = useToast();
const { t, locale } = useI18n();

const log = ref<EvaluationLog | null>(null);
const loading = ref(false);
const noData = ref(false);
const expanded = reactive<Record<string, boolean>>({});

const documentSubject = computed(() =>
  props.documentTitle?.trim() ? props.documentTitle.trim() : undefined,
);

const dialogVariant = computed(() => {
  if (!log.value) return 'neutral';
  return log.value.passed ? 'success' : 'warning';
});

const bodyMessage = computed(() => {
  if (loading.value) return undefined;
  if (noData.value) return t('reviewProcessLog.noData');
  return undefined;
});

const logFacts = computed<InformationalDialogFact[]>(() => {
  const l = log.value;
  if (!l || loading.value || noData.value) return [];
  return [
    {
      label: t('reviewProcessLog.factScore'),
      value: `${Math.round(l.overallScore * 100)} %`,
    },
    {
      label: t('reviewProcessLog.factThreshold'),
      value: `${Math.round(l.threshold * 100)} %`,
    },
    {
      label: t('reviewProcessLog.factEvaluatedAt'),
      value: formatDateIso(l.evaluatedAt),
    },
  ];
});

function scoreStrengthClass(score: number) {
  if (score >= 0.8) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 0.5) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-300';
}

function markerTone(status: string) {
  if (status === 'passed') return 'rpc-step-marker--ok';
  if (status === 'failed') return 'rpc-step-marker--fail';
  return 'rpc-step-marker--skip';
}

function stepIcon(status: string) {
  if (status === 'passed') return 'pi pi-check';
  if (status === 'failed') return 'pi pi-times';
  return 'pi pi-minus';
}

function stepStatusLabelUi(status: string): string {
  if (status === 'passed') return t('reviewProcessLog.stepPassed');
  if (status === 'failed') return t('reviewProcessLog.stepFailed');
  return t('reviewProcessLog.stepSkipped');
}

function hasExpandableDetails(item: LogStep): boolean {
  const d = item.details;
  if (item.name === 'spelling') return ((d.misspelledWords as string[])?.length ?? 0) > 0;
  if (item.name === 'citations')
    return (
      ((d.citationsFound as string[])?.length ?? 0) > 0 || ((d.invalidCitations as string[])?.length ?? 0) > 0
    );
  if (item.name === 'coherence')
    return ((d.issues as string[])?.length ?? 0) > 0 || ((d.suggestions as string[])?.length ?? 0) > 0;
  if (item.name === 'references') return ((d.outdatedReferences as string[])?.length ?? 0) > 0;
  if (item.name === 'structure') return ((d.missingSections as string[])?.length ?? 0) > 0;
  return false;
}

function toggleExpand(name: string) {
  expanded[name] = !expanded[name];
}

function formatDateIso(dateStr: string) {
  const loc = locale.value === 'en' ? 'en-GB' : 'es-PE';
  return new Date(dateStr).toLocaleString(loc, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function fetchLog() {
  if (!props.documentId) return;
  loading.value = true;
  noData.value = false;
  log.value = null;
  Object.keys(expanded).forEach((k) => delete expanded[k]);

  try {
    const { data } = await apiClient.get(`/documents/${props.documentId}/evaluation-log`);
    if (data.message && !data.steps) {
      noData.value = true;
    } else {
      log.value = data as EvaluationLog;
    }
  } catch {
    toast.add({
      severity: 'error',
      summary: t('reviewQueue.toastErrorSummary'),
      detail: t('reviewProcessLog.toastLoadFail'),
      life: 4000,
    });
    noData.value = true;
  } finally {
    loading.value = false;
  }
}

watch(open, (val) => {
  if (val && props.documentId) void fetchLog();
});
</script>

<style scoped>
.review-log-verdict {
  transition: border-color 0.15s ease;
}

.review-log-verdict--ok {
  border-color: color-mix(in srgb, #10b981 35%, var(--surface-border));
  background: color-mix(in srgb, #10b981 10%, var(--surface-sunken));
}

.review-log-verdict--fail {
  border-color: color-mix(in srgb, #dc2626 35%, var(--surface-border));
  background: color-mix(in srgb, #dc2626 8%, var(--surface-sunken));
}

.rpc-step-marker--ok {
  border: 1px solid color-mix(in srgb, #10b981 40%, var(--surface-border));
  background: color-mix(in srgb, #10b981 12%, var(--surface-sunken));
  color: #047857;
}

html.dark .rpc-step-marker--ok {
  border-color: color-mix(in srgb, #34d399 42%, transparent);
  color: #6ee7b7;
}

.rpc-step-marker--fail {
  border: 1px solid color-mix(in srgb, #dc2626 40%, var(--surface-border));
  background: color-mix(in srgb, #dc2626 10%, var(--surface-sunken));
  color: #b91c1c;
}

html.dark .rpc-step-marker--fail {
  border-color: color-mix(in srgb, #f87171 35%, transparent);
  color: #fca5a5;
}

.rpc-step-marker--skip {
  border: 1px solid var(--surface-border);
  background: var(--surface-sunken);
  color: var(--fg-subtle);
}

.rpc-caption-label {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--fg-subtle);
}

:deep(.rpc-timeline-wrapper .p-timeline-event-connector) {
  background: var(--surface-border-strong);
}

.rpc-step-content :deep(.p-timeline-event-marker) {
  margin-top: 0.125rem;
}
</style>
