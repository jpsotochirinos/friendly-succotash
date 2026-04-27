<template>
  <Dialog
    v-model:visible="visible"
    modal
    :maximizable="false"
    :closable="false"
    :dismissable-mask="true"
    class="stage-modal w-[min(100%,900px)]"
    :pt="{
      root: { class: 'rounded-2xl overflow-hidden shadow-2xl border-0' },
      header: { class: 'hidden' },
    }"
  >
    <div class="flex max-h-[min(90vh,800px)] flex-col rounded-2xl bg-white">
      <!-- Header -->
      <div
        class="flex shrink-0 items-center justify-between gap-3 border-b border-[#C8CCF5]/60 px-4 py-3.5"
      >
        <div class="flex min-w-0 flex-1 items-center gap-3">
          <div
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
            :style="{ background: draft.color || ALEGA_STAGE_WIZARD_PALETTE[0] }"
          >
            <i class="pi pi-list-check text-sm" />
          </div>
          <div class="min-w-0">
            <p
              class="m-0 text-[10px] font-bold uppercase tracking-wide text-[#8A92C7]"
            >
              {{ mode === 'create' ? t('processTrack.stageModal.badgeNew') : t('processTrack.stageModal.badgeEdit') }}
            </p>
            <p class="m-0 truncate text-sm font-semibold text-[#141852]">
              {{ draft.name.trim() || t('processTrack.stageModal.namePlaceholder') }}
            </p>
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <Button
            :label="mode === 'create' ? t('processTrack.stageModal.createCta') : t('processTrack.stageModal.saveCta')"
            icon="pi pi-check"
            :disabled="!draft.name?.trim() || (!!editsLocked && mode === 'edit')"
            class="!border-0"
            :style="{
              background: '#2D3FBF',
              borderColor: '#2D3FBF',
            }"
            :pt="{
              root: { class: 'text-white hover:!bg-[#1B2080] focus:ring-2 focus:ring-[#C8CCF5]' },
            }"
            @click="onHeaderSave"
          />
          <Button
            type="button"
            icon="pi pi-times"
            rounded
            text
            class="!text-[#141852]"
            :aria-label="t('processTrack.stageModal.closeDialog')"
            @click="close"
          />
        </div>
      </div>

      <div
        v-if="editsLocked"
        class="shrink-0 space-y-2 border-b border-amber-200/80 bg-amber-50 px-4 py-2 text-xs text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-100/95"
      >
        <p class="m-0">
          {{ t('processTrack.stage.workClosedBanner') }}
        </p>
        <Button
          :label="t('processTrack.stage.reopenWork')"
          size="small"
          @click="emit('reopen-work')"
        />
      </div>

      <!-- Stepper chips -->
      <div
        class="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-[#C8CCF5]/50 bg-white px-4 py-2.5"
      >
        <template v-for="(s, idx) in stepItems" :key="s.key">
          <button
            type="button"
            class="inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 py-1 text-left text-xs font-medium transition"
            :class="stepChipClass(idx)"
            :disabled="editsLocked && idx > 0"
            @click="!editsLocked || idx === 0 ? (step = idx) : null"
          >
            <i :class="[s.icon, 'text-xs']" />
            <span class="max-w-[8rem] truncate sm:max-w-none">{{ s.label }}</span>
            <i
              v-if="stepComplete[idx] && step > idx"
              class="pi pi-check text-xs"
            />
          </button>
          <i
            v-if="idx < stepItems.length - 1"
            class="pi pi-chevron-right text-[10px] text-[#8A92C7]"
            aria-hidden="true"
          />
        </template>
      </div>

      <!-- Body -->
      <div class="min-h-0 flex-1 overflow-y-auto scroll-smooth bg-[#F2F3FB] p-5" style="padding: 20px">
        <div v-show="step === 0" class="max-w-[640px]">
          <div class="mb-3 flex flex-col gap-1">
            <label class="text-[10px] font-semibold uppercase tracking-wide text-[#5c6394]" for="sm-stage-name">
              {{ t('processTrack.stageModal.fieldName') }}
            </label>
            <InputText
              id="sm-stage-name"
              v-model="draft.name"
              class="w-full"
              :placeholder="t('processTrack.stageModal.nameFieldPlaceholder')"
              :disabled="editsLocked"
            />
          </div>
          <div class="mb-3 flex flex-col gap-1">
            <label class="text-[10px] font-semibold uppercase tracking-wide text-[#5c6394]">
              {{ t('processTrack.stageModal.fieldDescription') }}
            </label>
            <Textarea
              v-model="draft.description"
              rows="3"
              class="w-full"
              :placeholder="t('processTrack.stageModal.descriptionPlaceholder')"
              :disabled="editsLocked"
            />
          </div>
          <div class="mb-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-semibold uppercase tracking-wide text-[#5c6394]">
                {{ t('processTrack.stageModal.startDate') }}
              </label>
              <DatePicker
                v-model="startDateModel"
                date-format="yy-mm-dd"
                show-icon
                icon-display="input"
                :disabled="editsLocked"
                class="w-full"
                input-id="sm-start"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-semibold uppercase tracking-wide text-[#5c6394]">
                {{ t('processTrack.stageModal.endDate') }}
              </label>
              <DatePicker
                v-model="endDateModel"
                date-format="yy-mm-dd"
                show-icon
                icon-display="input"
                :disabled="editsLocked"
                class="w-full"
                input-id="sm-end"
              />
            </div>
          </div>
          <p v-if="durationLabel > 0" class="mb-3 text-sm text-[#8A92C7]">
            {{ t('processTrack.stageModal.duration', { n: durationLabel }) }}
          </p>

          <div class="mb-3 flex flex-col gap-2">
            <span class="text-[10px] font-semibold uppercase tracking-wide text-[#5c6394]">
              {{ t('processTrack.stageModal.responsible') }}
            </span>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="u in users"
                :key="u.id"
                type="button"
                :disabled="editsLocked"
                class="flex min-h-9 items-center gap-2 rounded-full border px-2.5 py-1.5 text-left text-xs transition"
                :class="
                  draft.responsibleId === u.id
                    ? 'border-[#2D3FBF] bg-[#F2F3FB] ring-1 ring-[#2D3FBF]/30'
                    : 'border-[#C8CCF5] bg-white'
                "
                :aria-pressed="draft.responsibleId === u.id"
                @click="draft.responsibleId = draft.responsibleId === u.id ? undefined : u.id"
              >
                <span
                  class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  :style="{ background: u.color }"
                >{{ u.initials }}</span>
                <span class="max-w-[10rem] truncate text-[#141852]">{{ u.name }}</span>
              </button>
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <span class="text-[10px] font-semibold uppercase tracking-wide text-[#5c6394]">
              {{ t('processTrack.stageModal.stageColor') }}
            </span>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="c in ALEGA_STAGE_WIZARD_PALETTE"
                :key="c"
                type="button"
                :disabled="editsLocked"
                class="h-6 w-6 rounded-full border-2 border-transparent transition focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#2D3FBF] focus-visible:ring-offset-1"
                :class="draft.color === c ? 'ring-2 ring-[#2D3FBF] ring-offset-1' : ''"
                :style="{ background: c }"
                :aria-label="c"
                :aria-pressed="draft.color === c"
                @click="draft.color = c"
              />
            </div>
          </div>
        </div>

        <div v-show="step === 1">
          <div class="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 class="m-0 text-base font-semibold text-[#141852]">
                {{ t('processTrack.stageModal.activitiesTitle') }}
              </h3>
              <p class="m-0 mt-0.5 text-sm text-[#8A92C7]">
                {{ t('processTrack.stageModal.activitiesSubtitle') }}
              </p>
            </div>
            <Button
              :label="t('processTrack.stageModal.addActivity')"
              icon="pi pi-plus"
              size="small"
              outlined
              :disabled="editsLocked"
              class="!border-[#2D3FBF] !text-[#2D3FBF] shrink-0"
              @click="addActivity"
            />
          </div>
          <div
            v-if="!draft.activities.length"
            class="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[#C8CCF5] bg-white/50 px-4 py-10"
          >
            <i class="pi pi-list-check text-4xl text-[#8A92C7]" />
            <p class="m-0 text-sm text-[#8A92C7]">
              {{ t('processTrack.stageModal.noActivities') }}
            </p>
            <Button
              :label="t('processTrack.stageModal.addFirstActivity')"
              icon="pi pi-plus"
              :disabled="editsLocked"
              @click="addActivity"
            />
          </div>
          <div v-else class="overflow-x-auto rounded-xl border border-[#C8CCF5]/80 bg-white shadow-sm">
            <div
              class="grid min-w-[640px] gap-0 border-b border-[#C8CCF5]/60 bg-[#F2F3FB] px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-[#5c6394] sm:px-3"
              style="grid-template-columns: 1fr 110px 110px 140px 90px 36px"
            >
              <span>{{ t('processTrack.stageModal.colName') }}</span>
              <span>{{ t('processTrack.stageModal.colType') }}</span>
              <span>{{ t('processTrack.stageModal.colPriority') }}</span>
              <span>{{ t('processTrack.stageModal.colAssignee') }}</span>
              <span>{{ t('processTrack.stageModal.colDueDays') }}</span>
              <span class="text-center" />
            </div>
            <div
              v-for="(row, ridx) in draft.activities"
              :key="row.tempId"
              class="grid items-center gap-0 border-b border-[#C8CCF5]/40 px-2 py-2 sm:px-3"
              style="grid-template-columns: 1fr 110px 110px 140px 90px 36px"
            >
              <InputText
                v-model="row.name"
                class="!text-xs"
                :placeholder="t('processTrack.activity.titlePlaceholder')"
                :disabled="editsLocked"
              />
              <Select
                v-model="row.type"
                :options="activityTypeOptions"
                placeholder="—"
                class="!text-xs w-full"
                :disabled="editsLocked"
                show-clear
              />
              <Select
                v-model="row.priority"
                :options="priorityOptions"
                class="!text-xs w-full"
                :disabled="editsLocked"
              />
              <Select
                v-model="row.assigneeId"
                :options="userSelectOptions"
                option-label="label"
                option-value="value"
                :placeholder="t('processTrack.stageModal.assigneePh')"
                class="!text-xs w-full"
                :disabled="editsLocked"
                show-clear
              />
              <InputNumber
                v-model="row.dueInDays"
                :min="0"
                :placeholder="t('processTrack.stageModal.daysPh')"
                class="w-full"
                input-class="!text-xs"
                :show-buttons="false"
                :disabled="editsLocked"
              />
              <div class="flex justify-center">
                <Button
                  type="button"
                  icon="pi pi-trash"
                  text
                  rounded
                  :disabled="editsLocked"
                  :aria-label="t('processTrack.activity.delete')"
                  class="!text-[#5c6394] hover:!text-[#D9486E]"
                  @click="removeActivity(ridx)"
                />
              </div>
            </div>
          </div>
          <p
            v-if="draft.activities.length"
            class="mt-2 text-sm text-[#8A92C7]"
          >
            {{ t('processTrack.stageModal.activitiesSummary', { n: activityCount, high: highPriorityCount }) }}
          </p>
        </div>

        <div v-show="step === 2">
          <label
            v-if="!editsLocked"
            class="mb-0 flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-[#C8CCF5] bg-white/80 px-4 py-6 transition hover:border-[#2D3FBF] hover:bg-white"
            :for="fileInputId"
          >
            <i class="pi pi-upload text-3xl text-[#2D3FBF]" />
            <span class="text-sm font-medium text-[#141852]">{{ t('processTrack.stageModal.dropzone') }}</span>
            <span class="text-center text-xs text-[#8A92C7]">{{ t('processTrack.stageModal.dropzoneHint') }}</span>
          </label>
          <input
            :id="fileInputId"
            ref="fileInputRef"
            type="file"
            multiple
            class="sr-only"
            :disabled="editsLocked"
            @change="onFilesInput"
          />
          <div
            v-if="draft.documents.length"
            class="mt-4 overflow-hidden rounded-xl border border-[#C8CCF5]/50 bg-white shadow-sm"
          >
            <div
              v-for="(doc, dIdx) in draft.documents"
              :key="doc.id"
              class="flex items-center gap-2 border-b border-[#C8CCF5]/30 px-3 py-2.5 last:border-0"
            >
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F2F3FB] text-[#1B2080]"
              >
                <i class="pi pi-file text-sm" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="m-0 truncate text-sm text-[#141852]">
                  {{ doc.name }}
                </p>
                <p class="m-0 text-xs text-[#8A92C7]">
                  {{ doc.sizeKB }} KB · {{ doc.uploadedBy }} · {{ doc.uploadedAt }}
                </p>
              </div>
              <Button
                type="button"
                icon="pi pi-trash"
                text
                rounded
                :disabled="editsLocked"
                class="!text-[#5c6394] hover:!text-[#D9486E] shrink-0"
                :aria-label="t('common.delete')"
                @click="removeDocument(dIdx)"
              />
            </div>
          </div>
        </div>

        <div v-show="step === 3" class="flex max-w-2xl flex-col gap-4">
          <div
            v-if="!editsLocked"
            class="rounded-xl border border-[#C8CCF5]/60 bg-white p-3 shadow-sm"
          >
            <div class="mb-2 flex items-start gap-2">
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                :style="{ background: '#2D3FBF' }"
              >
                {{ meInitials }}
              </div>
              <Textarea
                v-model="newCommentText"
                class="w-full"
                :rows="2"
                :placeholder="t('processTrack.stageModal.commentPlaceholder')"
              />
            </div>
            <div class="flex justify-end">
              <Button
                :label="t('processTrack.stageModal.publish')"
                icon="pi pi-send"
                :disabled="!newCommentText.trim()"
                :style="{ background: '#2D3FBF', color: 'white' }"
                :pt="{ root: { class: 'hover:!bg-[#1B2080] border-0' } }"
                @click="publishComment"
              />
            </div>
          </div>
          <p
            v-if="!draft.comments.length"
            class="py-4 text-center text-sm text-[#8A92C7]"
          >
            {{ t('processTrack.stageModal.noComments') }}
          </p>
          <div
            v-for="c in sortedComments"
            v-else
            :key="c.id"
            class="flex gap-2 rounded-xl border border-[#C8CCF5]/40 bg-white p-3 shadow-sm"
          >
            <div
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
              :style="{ background: '#7C4DB8' }"
            >
              {{ displayInitials(c.author) }}
            </div>
            <div class="min-w-0 flex-1">
              <div class="mb-0.5 flex flex-wrap items-baseline gap-2 text-xs text-[#8A92C7]">
                <span class="font-semibold text-[#141852]">{{ c.author }}</span>
                <span>{{ formatAt(c.at) }}</span>
              </div>
              <p class="m-0 whitespace-pre-wrap text-sm text-[#141852]">
                {{ c.text }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div
        class="flex shrink-0 items-center justify-between gap-2 border-t border-[#C8CCF5]/50 bg-white px-4 py-3"
      >
        <Button
          type="button"
          :label="t('processTrack.stageModal.back')"
          icon="pi pi-chevron-left"
          icon-pos="left"
          text
          :disabled="step === 0"
          @click="step--"
        />
        <div class="hidden items-center justify-center gap-1.5 sm:flex">
          <span
            v-for="d in 4"
            :key="d - 1"
            class="h-2 w-2 rounded-full"
            :class="(d - 1) === step ? 'bg-[#2D3FBF]' : 'bg-[#C8CCF5]'"
          />
        </div>
        <div v-if="step < 3" class="shrink-0">
          <Button
            :label="t('processTrack.stageModal.next')"
            icon="pi pi-chevron-right"
            icon-pos="right"
            :style="{ background: '#2D3FBF' }"
            :pt="{ root: { class: 'text-white border-0 hover:!bg-[#1B2080]' } }"
            @click="step++"
          />
        </div>
        <div v-else class="shrink-0">
          <Button
            :label="mode === 'create' ? t('processTrack.stageModal.createCta') : t('processTrack.stageModal.saveCta')"
            icon="pi pi-check"
            :disabled="!draft.name?.trim() || (!!editsLocked && mode === 'edit')"
            :style="{ background: '#2D3FBF' }"
            :pt="{ root: { class: 'text-white border-0 hover:!bg-[#1B2080]' } }"
            @click="emitSave"
          />
        </div>
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import DatePicker from 'primevue/datepicker';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import { useAuthStore } from '@/stores/auth.store';
import {
  ALEGA_STAGE_WIZARD_PALETTE,
  emptyStageDraft,
  type ActivityType,
  type ActivityPriorityUi,
  type ActivityStatusUi,
  type StageActivityDraft,
  type StageDocument,
  type StageDraft,
  type StageUserOption,
} from './stage-modal.types';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    mode: 'create' | 'edit';
    initial: StageDraft;
    users: StageUserOption[];
    currentUserName?: string;
    editsLocked?: boolean;
  }>(),
  { editsLocked: false, currentUserName: undefined },
);

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
  (e: 'save', d: StageDraft): void;
  (e: 'reopen-work'): void;
}>();

const { t, locale } = useI18n();
const auth = useAuthStore();
const fileInputId = useId();

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
});

const draft = ref<StageDraft>(emptyStageDraft());
const step = ref(0);
const newCommentText = ref('');
const fileInputRef = ref<HTMLInputElement | null>(null);

const meInitials = computed(() => {
  const c = props.currentUserName;
  if (c) {
    return displayInitials(c);
  }
  const u = auth.user;
  if (!u) return '??';
  const a = (u.firstName || '').charAt(0) || u.email?.charAt(0) || '?';
  const b = (u.lastName || '').charAt(0) || '';
  return (a + b).toUpperCase().slice(0, 2) || '??';
});

function displayInitials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return '?';
  if (p.length === 1) return p[0]!.charAt(0)!.toUpperCase();
  return (p[0]!.charAt(0) + p[p.length - 1]!.charAt(0)).toUpperCase();
}

const activityTypeOptions: ActivityType[] = [
  'Fase',
  'Diligencia',
  'Obligatoria',
  'Audiencia',
  'Crítica',
  'Trámite',
  'Informe',
];
const priorityOptions: ActivityPriorityUi[] = ['Alta', 'Media', 'Baja'];

const userSelectOptions = computed(() =>
  props.users.map((u) => ({ label: u.name, value: u.id })),
);

const hasName = computed(() => (draft.value.name || '').trim().length > 0);
const hasColor = computed(() => !!draft.value.color);
const stepComplete = computed<Record<number, boolean>>(() => ({
  0: hasName.value && hasColor.value,
  1: draft.value.activities.length > 0,
  2: draft.value.documents.length > 0,
  3: draft.value.comments.length > 0,
}));

const stepItems = computed(() => [
  { key: 'i', label: t('processTrack.stageModal.stepInfo'), icon: 'pi pi-user' },
  { key: 'a', label: t('processTrack.stageModal.stepActivities'), icon: 'pi pi-list-check' },
  { key: 'd', label: t('processTrack.stageModal.stepDocuments'), icon: 'pi pi-paperclip' },
  { key: 'c', label: t('processTrack.stageModal.stepComments'), icon: 'pi pi-comment' },
]);

function stepChipClass(idx: number) {
  if (idx === step.value) {
    return 'bg-[#2D3FBF] text-white border-[#2D3FBF]';
  }
  if (stepComplete.value[idx] && step.value > idx) {
    return 'border-[#C8CCF5] bg-[#F2F3FB] text-[#141852]';
  }
  return 'border-[#C8CCF5] bg-white text-[#8A92C7]';
}

const startDateModel = computed({
  get: () => {
    const s = draft.value.startDate;
    if (!s) return null as Date | null;
    return new Date(`${s}T12:00:00`);
  },
  set: (d: Date | null) => {
    if (!d) draft.value.startDate = undefined;
    else {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      draft.value.startDate = `${y}-${m}-${day}`;
    }
  },
});
const endDateModel = computed({
  get: () => {
    const s = draft.value.endDate;
    if (!s) return null as Date | null;
    return new Date(`${s}T12:00:00`);
  },
  set: (d: Date | null) => {
    if (!d) draft.value.endDate = undefined;
    else {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      draft.value.endDate = `${y}-${m}-${day}`;
    }
  },
});

const durationLabel = computed(() => {
  const a = draft.value.startDate;
  const b = draft.value.endDate;
  if (!a || !b) return 0;
  const s = new Date(`${a}T00:00:00`);
  const e = new Date(`${b}T00:00:00`);
  if (e < s) return 0;
  const days = Math.round((e.getTime() - s.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  return days;
});

const activityCount = computed(() => draft.value.activities.length);
const highPriorityCount = computed(
  () => draft.value.activities.filter((a) => a.priority === 'Alta').length,
);

const sortedComments = computed(() => [...draft.value.comments].sort((a, b) => (a.at < b.at ? 1 : -1)));

function formatAt(iso: string) {
  try {
    return new Date(iso).toLocaleString(locale.value, { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function addActivity() {
  const row: StageActivityDraft = {
    tempId: typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `t-${Date.now()}-${Math.random()}`,
    name: '',
    priority: 'Media',
    status: 'Pendiente',
  };
  draft.value.activities = [...draft.value.activities, row];
}

function removeActivity(idx: number) {
  const next = [...draft.value.activities];
  next.splice(idx, 1);
  draft.value.activities = next;
}

function pushDocumentsFromFileList(files: FileList | null) {
  if (!files?.length) return;
  const by = props.currentUserName
    || [auth.user?.firstName, auth.user?.lastName].filter(Boolean).join(' ').trim()
    || auth.user?.email
    || '—';
  const day = new Date().toISOString().slice(0, 10);
  const newDocs: StageDocument[] = [];
  for (const f of Array.from(files)) {
    newDocs.push({
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `d-${Date.now()}-${f.name}`,
      name: f.name,
      sizeKB: Math.max(0, Math.round(f.size / 1024)),
      uploadedBy: by,
      uploadedAt: day,
      file: f,
    });
  }
  draft.value.documents = [...draft.value.documents, ...newDocs];
}

function onFilesInput(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files) pushDocumentsFromFileList(input.files);
  input.value = '';
}

function removeDocument(dIdx: number) {
  const n = [...draft.value.documents];
  n.splice(dIdx, 1);
  draft.value.documents = n;
}

function publishComment() {
  const text = newCommentText.value.trim();
  if (!text) return;
  const author = props.currentUserName
    || [auth.user?.firstName, auth.user?.lastName].filter(Boolean).join(' ').trim()
    || auth.user?.email
    || '—';
  draft.value.comments = [
    {
      id: typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `c-${Date.now()}`,
      author,
      text,
      at: new Date().toISOString(),
    },
    ...draft.value.comments,
  ];
  newCommentText.value = '';
}

function deepCloneInit(src: StageDraft): StageDraft {
  return {
    id: src.id,
    name: src.name,
    color: src.color,
    responsibleId: src.responsibleId,
    startDate: src.startDate,
    endDate: src.endDate,
    description: src.description,
    activities: src.activities.map((a) => ({
      ...a,
    })),
    documents: src.documents.map((d) => ({ ...d })),
    comments: src.comments.map((c) => ({ ...c })),
  };
}

function close() {
  emit('update:modelValue', false);
}

function emitSave() {
  if (!draft.value.name?.trim() || (props.editsLocked && props.mode === 'edit')) return;
  emit('save', deepCloneInit(draft.value));
}

function onHeaderSave() {
  emitSave();
}

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      draft.value = deepCloneInit(props.initial);
      step.value = 0;
      newCommentText.value = '';
    }
  },
);

defineExpose({ step });
</script>
