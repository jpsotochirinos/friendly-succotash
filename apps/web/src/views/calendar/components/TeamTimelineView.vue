<template>
  <div
    class="rounded-xl border border-[var(--surface-border)] overflow-hidden bg-[var(--surface-raised)] shadow-sm"
    :style="{ minHeight: `${HEADER_H + gridPx + 24}px` }"
  >
    <div class="px-4 py-3 border-b border-[var(--surface-border)] flex flex-wrap items-center justify-between gap-2">
      <h3 class="text-sm font-semibold text-[var(--fg-default)] m-0">{{ title }}</h3>
      <span class="text-xs text-[var(--fg-muted)]">{{ dayLabel }}</span>
    </div>
    <div class="overflow-x-auto">
      <div class="inline-flex min-w-full">
        <!-- Time gutter -->
        <div
          class="w-14 shrink-0 sticky left-0 z-[2] border-r border-[var(--surface-border)] bg-[var(--surface-raised)] pt-[40px]"
        >
          <div v-for="h in hourRange" :key="h" class="border-b border-[var(--surface-border)]/60 px-1 text-[10px] text-[var(--fg-muted)]" :style="{ height: `${PX}px` }">
            {{ String(h).padStart(2, '0') }}:00
          </div>
        </div>
        <!-- Columns -->
        <div
          v-for="u in users"
          :key="u.id"
          class="shrink-0 border-r border-[var(--surface-border)] last:border-r-0 bg-[var(--surface-sunken)]/20"
          :style="{ width: `${COL_W}px` }"
        >
          <div
            class="sticky top-0 z-[1] flex flex-col items-center justify-center gap-0.5 border-b border-[var(--surface-border)] bg-[var(--surface-raised)] px-2 py-2 text-center min-h-[40px]"
            :class="u.id === '__unassigned' && unassignedCount > 0 ? 'ring-1 ring-orange-400/50' : ''"
          >
            <span class="text-xs font-semibold text-[var(--fg-default)] truncate max-w-full" :title="u.label">{{ u.label }}</span>
            <span class="text-[10px] font-medium text-[var(--fg-muted)] tabular-nums">{{ countForUser(u.id) }}</span>
          </div>
          <div class="relative" :style="{ height: `${gridPx}px` }">
            <div
              v-for="h in hourRange"
              :key="`g-${u.id}-${h}`"
              class="absolute left-0 right-0 box-border border-b border-dashed border-[var(--surface-border)]/70 pointer-events-none"
              :style="{ top: `${(h - START_H) * PX}px`, height: `${PX}px` }"
            />
            <button
              v-for="ev in layoutForUser(u.id)"
              :key="ev.id"
              type="button"
              class="absolute left-1 right-1 z-[1] overflow-hidden rounded-md border text-left shadow-sm transition hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)]"
              :class="ev.cardClass"
              :style="{ top: `${ev.top}px`, height: `${ev.height}px` }"
              @click="$emit('select', ev.raw)"
            >
              <span class="block px-1.5 py-0.5 text-[11px] font-semibold leading-tight line-clamp-2">{{ ev.title }}</span>
              <span class="block px-1.5 pb-0.5 text-[10px] opacity-90">{{ ev.sub }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ApiCalendarEvent } from '@/composables/useCalendarAdapter';

export type TeamTimelineEmit = ApiCalendarEvent;

const props = defineProps<{
  title: string;
  day: Date;
  users: Array<{ id: string; label: string }>;
  events: ApiCalendarEvent[];
}>();

defineEmits<{ (e: 'select', ev: TeamTimelineEmit): void }>();

const { t, locale } = useI18n();

const START_H = 7;
const END_H = 21;
const PX = 44;
const COL_W = 200;
const HEADER_H = 52;

const hourRange = computed(() => {
  const out: number[] = [];
  for (let h = START_H; h <= END_H; h++) out.push(h);
  return out;
});

const gridPx = (END_H - START_H + 1) * PX;

const dayLabel = computed(() =>
  props.day.toLocaleDateString(locale.value, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
);

function countForUser(uid: string) {
  return props.events.filter((e) => assigneeKey(e) === uid).length;
}

const unassignedCount = computed(() => countForUser('__unassigned'));

function assigneeKey(e: ApiCalendarEvent): string {
  if (e.source !== 'workflow') return '__unassigned';
  const aid = (e.extendedProps?.assignedToId as string) || '';
  return aid || '__unassigned';
}

type LayoutEv = {
  id: string;
  title: string;
  sub: string;
  top: number;
  height: number;
  cardClass: string;
  raw: ApiCalendarEvent;
};

function priorityClass(e: ApiCalendarEvent): string {
  const p = (e.extendedProps?.priority as string) || 'normal';
  if (p === 'urgent') return 'border-red-500/50 bg-red-500/10 text-red-950 dark:text-red-100';
  if (p === 'high') return 'border-orange-500/50 bg-orange-500/10 text-orange-950 dark:text-orange-100';
  return 'border-[var(--surface-border)] bg-[var(--surface-raised)] text-[var(--fg-default)]';
}

function layoutForUser(uid: string): LayoutEv[] {
  const list = props.events.filter((e) => assigneeKey(e) === uid);
  const out: LayoutEv[] = [];
  for (const e of list) {
    const title = e.title;
    let sub = '';
    if (e.allDay) {
      sub = t('globalCalendar.allDay');
      out.push({
        id: e.id,
        title,
        sub,
        top: 4,
        height: 36,
        cardClass: priorityClass(e),
        raw: e,
      });
      continue;
    }
    const start = new Date(e.start);
    const end = new Date(e.end);
    const s = start.getHours() + start.getMinutes() / 60;
    let eH = end.getHours() + end.getMinutes() / 60;
    if (eH <= s) eH = s + 0.5;
    const top = Math.max(0, (s - START_H) * PX);
    let bot = (eH - START_H) * PX;
    bot = Math.min(gridPx, bot);
    const height = Math.max(28, bot - top);
    sub = `${start.toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit' })}`;
    out.push({
      id: e.id,
      title,
      sub,
      top,
      height,
      cardClass: priorityClass(e),
      raw: e,
    });
  }
  return out.sort((a, b) => a.top - b.top);
}
</script>
