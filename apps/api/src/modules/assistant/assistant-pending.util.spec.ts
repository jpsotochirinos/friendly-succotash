import { describe, it, expect } from 'vitest';
import type { PendingInteractiveChoice } from './assistant-pending.types';
import {
  buildChoiceDisplayRows,
  CHOICE_PAGE_CONTENT_SIZE,
  mapWidgetChoiceOptions,
  MORE_ROW_ID,
  resolveChoicePickId,
  resolveConfirmReply,
} from './assistant-pending.util';

function choiceFromTitles(count: number, start = 0): PendingInteractiveChoice {
  return {
    kind: 'choice',
    toolCallId: 'tc1',
    page: 0,
    pageSize: CHOICE_PAGE_CONTENT_SIZE,
    allOptions: Array.from({ length: count }, (_, i) => ({
      id: `id-${start + i}`,
      title: `Opt ${start + i}`,
    })),
  };
}

describe('assistant-pending.util', () => {
  it('mapWidgetChoiceOptions maps label to title', () => {
    expect(
      mapWidgetChoiceOptions([
        { id: 'a', label: 'One', description: 'd' },
        { id: 'b', label: 'Two' },
      ]),
    ).toEqual([
      { id: 'a', title: 'One', description: 'd' },
      { id: 'b', title: 'Two' },
    ]);
  });

  it('first page shows up to 9 items plus Ver más when more exist', () => {
    const pending = choiceFromTitles(12);
    const { rows } = buildChoiceDisplayRows(pending);
    expect(rows).toHaveLength(10);
    expect(rows[9]?.id).toBe(MORE_ROW_ID);
  });

  it('last page has no Ver más', () => {
    const pending = choiceFromTitles(12);
    pending.page = 1;
    const { rows } = buildChoiceDisplayRows(pending);
    expect(rows.every((r) => r.id !== MORE_ROW_ID)).toBe(true);
    expect(rows).toHaveLength(3);
  });

  it('resolveChoicePickId maps numeric reply to row id', () => {
    const pending = choiceFromTitles(12);
    const { rows } = buildChoiceDisplayRows(pending);
    expect(resolveChoicePickId(undefined, '1', pending)).toBe(rows[0]?.id);
    expect(resolveChoicePickId(undefined, '10', pending)).toBe(MORE_ROW_ID);
  });

  it('resolveChoicePickId uses interactive id when present', () => {
    const pending = choiceFromTitles(3);
    expect(resolveChoicePickId('id-1', '', pending)).toBe('id-1');
  });

  it('resolveConfirmReply', () => {
    expect(resolveConfirmReply('confirm_yes', '')).toBe('yes');
    expect(resolveConfirmReply('confirm_no', '')).toBe('no');
    expect(resolveConfirmReply(undefined, 'sí')).toBe('yes');
    expect(resolveConfirmReply(undefined, 'no')).toBe('no');
    expect(resolveConfirmReply(undefined, '2')).toBe('no');
    expect(resolveConfirmReply(undefined, '1.')).toBe('yes');
    expect(resolveConfirmReply(undefined, 'ok')).toBe('yes');
    expect(resolveConfirmReply(undefined, 'hola')).toBe(null);
  });

  it('resolveConfirmReply acepta placeholders de template Twilio (btn_1_title)', () => {
    expect(resolveConfirmReply(undefined, 'btn_1_title')).toBe('yes');
    expect(resolveConfirmReply(undefined, 'btn_2_title')).toBe('no');
    expect(resolveConfirmReply('btn_1_id', '')).toBe('yes');
    expect(resolveConfirmReply('btn_2_id', '')).toBe('no');
  });
});
