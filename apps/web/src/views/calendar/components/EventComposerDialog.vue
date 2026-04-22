<template>
  <Dialog
    v-model:visible="open"
    modal
    dismissable-mask
    class="item-detail-dialog"
    :style="{ width: 'min(72rem, 96vw)' }"
    :content-style="itemDetailDialogContentStyle"
    :breakpoints="{ '960px': '95vw' }"
    @hide="$emit('close')"
  >
    <template #header>
      <div class="flex w-full min-w-0 items-center justify-between gap-3 pr-1">
        <span class="truncate text-sm font-medium text-[var(--fg-muted)]">{{
          t('globalCalendar.newActivityDialogTitle')
        }}</span>
        <Button
          :label="t('globalCalendar.createActivity')"
          icon="pi pi-check"
          size="small"
          type="button"
          :disabled="!form.title?.trim() || !form.trackableId || saving"
          :loading="saving"
          @click="submit"
        />
      </div>
    </template>

    <div
      class="item-detail-scroll flex flex-1 min-h-0 flex-col gap-6 overflow-hidden lg:flex-row lg:items-stretch -mx-1 px-1"
    >
      <section
        class="item-detail-main flex flex-1 flex-col gap-5 min-w-0 min-h-0 overflow-y-auto pr-1"
        aria-labelledby="ec-item-title"
      >
        <div class="space-y-1.5">
          <label class="text-xs font-medium uppercase tracking-wide text-[var(--fg-muted)]" for="ec-trackable">{{
            t('globalCalendar.trackableLabel')
          }}</label>
          <Dropdown
            id="ec-trackable"
            v-model="form.trackableId"
            :options="trackableOptions"
            option-label="label"
            option-value="value"
            :placeholder="t('globalCalendar.trackablePlaceholder')"
            class="w-full"
            filter
            show-clear
          />
        </div>

        <InputText
          id="ec-item-title"
          v-model="form.title"
          :placeholder="t('globalCalendar.titlePlaceholder')"
          aria-label="Título"
          class="item-detail-title-input w-full border-none bg-transparent p-0 py-2 text-2xl font-semibold leading-tight text-[var(--fg-default)] shadow-none transition-shadow duration-200 focus:ring-2 focus:ring-[var(--p-primary-300)] focus:ring-offset-0"
        />

        <section class="space-y-3">
          <header class="border-b border-[var(--surface-border)] pb-2">
            <h3 class="flex items-center gap-2 text-sm font-semibold text-[var(--fg-default)]">
              <i class="pi pi-align-left text-xs text-[var(--fg-muted)]" aria-hidden="true" />
              {{ t('globalCalendar.composerDescription') }}
            </h3>
          </header>
          <Editor
            id="ec-description"
            v-model="form.description"
            editor-style="min-height: 10rem; max-height: min(36vh, 20rem);"
            class="item-detail-editor w-full"
            :placeholder="t('globalCalendar.titlePlaceholder')"
          />
        </section>

        <p v-if="error" class="m-0 text-sm text-red-600 dark:text-red-400">{{ error }}</p>
      </section>

      <aside
        class="item-detail-sidebar w-full lg:w-[min(22rem,32%)] lg:max-w-sm shrink-0 flex flex-col gap-3 min-h-0 overflow-y-auto border-t border-[var(--surface-border)] pt-4 pr-4 sm:pr-5 lg:pt-0 lg:pl-6 lg:pr-5 lg:border-t-0 lg:border-l lg:mt-0"
        :aria-label="t('globalCalendar.composerDetailsTitle')"
      >
        <h3 class="text-sm font-semibold text-[var(--fg-default)]">{{ t('globalCalendar.composerDetailsTitle') }}</h3>
        <dl class="item-detail-properties grid grid-cols-[minmax(6rem,35%)_1fr] gap-x-4 gap-y-3 text-sm">
          <dt>{{ t('globalCalendar.composerState') }}</dt>
          <dd>
            <Tag :value="t('globalCalendar.composerPendingStatus')" severity="warn" class="text-xs" />
          </dd>

          <dt>{{ t('globalCalendar.kindLabel') }}</dt>
          <dd class="min-w-0">
            <Dropdown
              v-model="form.kind"
              :options="kindOptions"
              option-label="label"
              option-value="value"
              :placeholder="t('globalCalendar.kindPlaceholder')"
              class="w-full"
              show-clear
            />
          </dd>

          <dt>{{ t('globalCalendar.assignPrimaryLabel') }}</dt>
          <dd class="min-w-0">
            <Dropdown
              id="ec-assign-primary"
              v-model="form.assignedToId"
              :options="userOptions"
              option-label="label"
              option-value="value"
              class="w-full"
              filter
              show-clear
              :placeholder="t('globalCalendar.assignPlaceholder')"
            />
          </dd>

          <dt>{{ t('globalCalendar.priorityLabel') }}</dt>
          <dd class="min-w-0">
            <Dropdown
              v-model="form.priority"
              :options="priorityOptions"
              option-label="label"
              option-value="value"
              class="w-full"
              show-clear
              :placeholder="t('globalCalendar.priorityNormal')"
            />
          </dd>

          <dt>{{ t('globalCalendar.start') }}</dt>
          <dd class="min-w-0">
            <Calendar
              v-model="form.startDate"
              date-format="dd/mm/yy"
              show-icon
              class="w-full"
              :show-time="!form.allDay"
              hour-format="24"
            />
          </dd>

          <dt>{{ t('globalCalendar.due') }}</dt>
          <dd class="min-w-0">
            <Calendar
              v-model="form.dueDate"
              date-format="dd/mm/yy"
              show-icon
              class="w-full"
              :show-time="!form.allDay"
              hour-format="24"
            />
          </dd>

          <dt>{{ t('globalCalendar.allDay') }}</dt>
          <dd>
            <Checkbox v-model="form.allDay" binary input-id="ec-allday" />
          </dd>

          <dt>{{ t('globalCalendar.locationLabel') }}</dt>
          <dd class="min-w-0">
            <InputText
              id="ec-loc"
              v-model="form.location"
              :placeholder="t('globalCalendar.locationPlaceholder')"
              class="w-full"
            />
          </dd>

          <dt>{{ t('globalCalendar.remindersLabel') }}</dt>
          <dd class="min-w-0">
            <MultiSelect
              v-model="form.reminderMinutesBefore"
              :options="reminderOptions"
              option-label="label"
              option-value="value"
              display="chip"
              class="w-full"
              :placeholder="t('globalCalendar.remindersPlaceholder')"
              :show-clear="true"
            />
          </dd>

          <dt>{{ t('globalCalendar.rruleLabel') }}</dt>
          <dd class="min-w-0">
            <Dropdown
              v-model="form.rrulePreset"
              :options="rruleOptions"
              option-label="label"
              option-value="value"
              class="w-full"
              :show-clear="true"
            />
          </dd>

          <dt>{{ t('globalCalendar.assignSecondaryLabel') }}</dt>
          <dd class="min-w-0">
            <MultiSelect
              id="ec-assign-secondary"
              v-model="form.secondaryAssigneeIds"
              :options="composerSecondaryAssigneeOptions"
              option-label="label"
              option-value="value"
              display="chip"
              class="w-full"
              :placeholder="t('globalCalendar.assignSecondaryPlaceholder')"
              :filter="true"
              :show-clear="true"
            />
          </dd>

          <dt>{{ t('globalCalendar.composerColor') }}</dt>
          <dd class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <button
                type="button"
                class="h-6 w-6 shrink-0 rounded-full border border-[var(--surface-border)]"
                :style="{ backgroundColor: form.accentColor || 'transparent' }"
                v-tooltip.bottom="'Calendario y vista expediente'"
                aria-label="Color"
                @click="(e) => accentPopoverRef?.toggle(e)"
              />
              <Popover
                ref="accentPopoverRef"
                class="max-w-[16rem] border border-[var(--surface-border)] bg-[var(--surface-raised)] p-2 shadow-lg"
              >
                <div class="flex flex-wrap items-center gap-1.5">
                  <button
                    v-for="p in accentPresets"
                    :key="'ec-' + p.value"
                    type="button"
                    class="h-7 w-7 shrink-0 rounded-full border-2 border-transparent transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--p-primary-400)]"
                    :class="
                      form.accentColor === p.value
                        ? 'ring-2 ring-[var(--fg-default)] ring-offset-2 ring-offset-[var(--surface-raised)]'
                        : 'hover:ring-1 hover:ring-[var(--surface-border)]'
                    "
                    :style="{ backgroundColor: p.value }"
                    :title="p.label"
                    :aria-label="p.label"
                    @click="form.accentColor = p.value"
                  />
                  <button
                    type="button"
                    class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[var(--surface-border)] bg-[var(--surface-sunken)] text-[var(--fg-muted)] hover:bg-[var(--surface-app)]"
                    title="Quitar"
                    aria-label="Quitar color"
                    @click="form.accentColor = DEFAULT_ACCENT"
                  >
                    <i class="pi pi-times text-xs" aria-hidden="true" />
                  </button>
                  <label class="sr-only" for="ec-accent-custom">Color personalizado</label>
                  <input
                    id="ec-accent-custom"
                    :value="accentPickerValue"
                    type="color"
                    class="h-7 w-9 cursor-pointer rounded border border-[var(--surface-border)] bg-transparent p-0"
                    @input="onAccentPick"
                  />
                </div>
              </Popover>
            </div>
          </dd>
        </dl>
      </aside>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Dropdown from 'primevue/dropdown';
import InputText from 'primevue/inputtext';
import Calendar from 'primevue/calendar';
import Checkbox from 'primevue/checkbox';
import MultiSelect from 'primevue/multiselect';
import Tag from 'primevue/tag';
import Editor from 'primevue/editor';
import Popover from 'primevue/popover';
import 'quill/dist/quill.snow.css';
import '@/assets/styles/item-detail-dialog.css';
import { apiClient } from '@/api/client';

const props = defineProps<{
  visible: boolean;
  defaultDay?: Date | null;
  trackableOptions: Array<{ label: string; value: string }>;
  userOptions: Array<{ label: string; value: string }>;
}>();

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void;
  (e: 'close'): void;
  (e: 'created'): void;
}>();

const { t } = useI18n();
const toast = useToast();

const open = computed({
  get: () => props.visible,
  set: (v: boolean) => emit('update:visible', v),
});

const itemDetailDialogContentStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  maxHeight: 'min(80vh, 48rem)',
  overflow: 'hidden',
};

const saving = ref(false);
const error = ref('');
const accentPopoverRef = ref<InstanceType<typeof Popover>>();

const DEFAULT_ACCENT = '#64748b';

const accentPresets = [
  { label: 'Slate', value: '#64748b' },
  { label: 'Azul', value: '#3b82f6' },
  { label: 'Violeta', value: '#8b5cf6' },
  { label: 'Esmeralda', value: '#10b981' },
  { label: 'Ámbar', value: '#f59e0b' },
  { label: 'Rojo', value: '#ef4444' },
  { label: 'Rosa', value: '#ec4899' },
  { label: 'Cian', value: '#06b6d4' },
];

const form = ref({
  trackableId: '',
  title: '',
  description: '',
  kind: '' as string,
  allDay: true,
  startDate: null as Date | null,
  dueDate: null as Date | null,
  priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
  location: '',
  reminderMinutesBefore: [] as number[],
  assignedToId: '' as string,
  secondaryAssigneeIds: [] as string[],
  rrulePreset: '' as string,
  accentColor: DEFAULT_ACCENT,
});

const accentPickerValue = computed(() => {
  const v = form.value.accentColor;
  return v && /^#[0-9A-Fa-f]{6}$/.test(v) ? v : DEFAULT_ACCENT;
});

function onAccentPick(e: Event) {
  const v = (e.target as HTMLInputElement).value;
  if (v) form.value.accentColor = v;
}

const kindOptions = computed(() => [
  { label: t('globalCalendar.kindHearing'), value: 'Audiencia' },
  { label: t('globalCalendar.kindFiling'), value: 'Presentación' },
  { label: t('globalCalendar.kindMeeting'), value: 'Reunión' },
  { label: t('globalCalendar.kindCall'), value: 'Llamada' },
  { label: t('globalCalendar.kindTask'), value: 'Tarea' },
  { label: t('globalCalendar.kindOther'), value: 'Otro' },
]);

const priorityOptions = computed(() => [
  { label: t('globalCalendar.priorityLow'), value: 'low' },
  { label: t('globalCalendar.priorityNormal'), value: 'normal' },
  { label: t('globalCalendar.priorityHigh'), value: 'high' },
  { label: t('globalCalendar.priorityUrgent'), value: 'urgent' },
]);

const reminderOptions = [
  { label: '5 min', value: 5 },
  { label: '15 min', value: 15 },
  { label: '1 h', value: 60 },
  { label: '1 día', value: 1440 },
  { label: '1 semana', value: 10080 },
];

const rruleOptions = computed(() => [
  { label: t('globalCalendar.rruleNone'), value: '' },
  { label: t('globalCalendar.rruleDaily'), value: 'FREQ=DAILY' },
  { label: t('globalCalendar.rruleWeekly'), value: 'FREQ=WEEKLY' },
  { label: t('globalCalendar.rruleMonthly'), value: 'FREQ=MONTHLY' },
  { label: t('globalCalendar.rruleYearly'), value: 'FREQ=YEARLY' },
]);

const composerSecondaryAssigneeOptions = computed(() => {
  const primary = form.value.assignedToId;
  return props.userOptions.filter((o) => o.value !== primary);
});

function descriptionHasDisplayContent(raw?: string | null): boolean {
  if (raw == null) return false;
  const s = String(raw).trim();
  if (!s) return false;
  const plain = s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
  return plain.length > 0;
}

watch(
  () => props.visible,
  (v) => {
    if (v) {
      error.value = '';
      const day = props.defaultDay ? new Date(props.defaultDay) : new Date();
      day.setHours(12, 0, 0, 0);
      form.value = {
        trackableId: '',
        title: '',
        description: '',
        kind: '',
        allDay: true,
        startDate: new Date(day),
        dueDate: new Date(day),
        priority: 'normal',
        location: '',
        reminderMinutesBefore: [],
        assignedToId: '',
        secondaryAssigneeIds: [],
        rrulePreset: '',
        accentColor: DEFAULT_ACCENT,
      };
    }
  },
);

async function submit() {
  const f = form.value;
  if (!f.title?.trim() || !f.trackableId) return;
  saving.value = true;
  error.value = '';
  toast.add({ severity: 'secondary', summary: t('common.saving'), life: 900 });
  try {
    const descRaw = f.description?.trim() ?? '';
    const payload: Record<string, unknown> = {
      title: f.title.trim(),
      trackableId: f.trackableId,
      kind: f.kind || undefined,
      allDay: f.allDay,
      priority: f.priority,
      location: f.location?.trim() || undefined,
      reminderMinutesBefore: f.reminderMinutesBefore?.length ? f.reminderMinutesBefore : undefined,
      assignedToId: f.assignedToId || undefined,
      secondaryAssigneeIds: f.secondaryAssigneeIds?.length ? f.secondaryAssigneeIds : undefined,
      rrule: f.rrulePreset || undefined,
    };
    if (descriptionHasDisplayContent(descRaw)) payload.description = descRaw;
    if (f.accentColor && f.accentColor !== DEFAULT_ACCENT) payload.accentColor = f.accentColor;
    if (f.startDate) payload.startDate = f.startDate.toISOString();
    if (f.dueDate) payload.dueDate = f.dueDate.toISOString();
    await apiClient.post('/workflow-items', payload);
    toast.add({ severity: 'success', summary: t('globalCalendar.activityCreated'), life: 4000 });
    open.value = false;
    emit('created');
  } catch (e: unknown) {
    error.value = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || String(e);
  } finally {
    saving.value = false;
  }
}
</script>
