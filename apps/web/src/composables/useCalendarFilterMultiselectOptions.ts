import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { CalendarFilterKind, CalendarPriorityFilter } from '@/composables/calendarEventKind';

export function useCalendarFilterMultiselectOptions() {
  const { t } = useI18n();

  const kindOptions = computed(() =>
    (
      [
        ['hearing', 'filterKindHearing'],
        ['deadline', 'filterKindDeadline'],
        ['meeting', 'filterKindMeeting'],
        ['call', 'filterKindCall'],
        ['task', 'filterKindTask'],
        ['filing', 'filterKindFiling'],
        ['other', 'filterKindOther'],
        ['birthday', 'filterKindBirthday'],
        ['external', 'filterKindExternal'],
        ['peruHoliday', 'filterKindPeruHoliday'],
      ] as const
    ).map(([value, key]) => ({
      value: value as CalendarFilterKind,
      label: t(`globalCalendar.${key}`),
    })),
  );

  const priorityOptions = computed(() => [
    { label: t('globalCalendar.priorityLow'), value: 'low' as CalendarPriorityFilter },
    { label: t('globalCalendar.priorityNormal'), value: 'normal' as CalendarPriorityFilter },
    { label: t('globalCalendar.priorityHigh'), value: 'high' as CalendarPriorityFilter },
    { label: t('globalCalendar.priorityUrgent'), value: 'urgent' as CalendarPriorityFilter },
  ]);

  return { kindOptions, priorityOptions };
}
