import { describe, it, expect } from 'vitest';
import { applySlidingWindow } from './assistant-window.util';

const tc = (id: string, name: string) => ({
  id,
  type: 'function' as const,
  function: { name, arguments: '{}' },
});

describe('applySlidingWindow', () => {
  it('preserves system and returns unchanged when rest length <= N', () => {
    const messages = [
      { role: 'system', content: 'sys' },
      { role: 'user', content: 'a' },
      { role: 'assistant', content: 'b' },
    ];
    expect(applySlidingWindow(messages, 40)).toEqual(messages);
  });

  it('trims to last N non-system messages', () => {
    const messages = [
      { role: 'system', content: 'sys' },
      ...Array.from({ length: 50 }, (_, i) => ({ role: 'user', content: String(i) })),
    ];
    const out = applySlidingWindow(messages, 40);
    expect(out[0]).toEqual({ role: 'system', content: 'sys' });
    expect(out).toHaveLength(41);
    expect(out[out.length - 1]).toEqual({ role: 'user', content: '49' });
  });

  it('skips orphan tool at slice start', () => {
    const before = Array.from({ length: 10 }, (_, i) => ({ role: 'user', content: `u${i}` }));
    const after = Array.from({ length: 40 }, (_, i) => ({ role: 'user', content: `v${i}` }));
    const messages = [
      { role: 'system', content: 's' },
      ...before,
      { role: 'tool', tool_call_id: 'x', name: 't', content: '{}' },
      ...after,
    ];
    const out = applySlidingWindow(messages, 40);
    expect(out[0]?.role).toBe('system');
    expect(out.some((m) => m.role === 'tool')).toBe(false);
    expect(out[out.length - 1]?.role).toBe('user');
  });

  it('keeps assistant+tool_calls at slice start when window aligns there', () => {
    const prefix = Array.from({ length: 5 }, (_, i) => ({ role: 'user', content: `h${i}` }));
    const tail = [
      { role: 'assistant', content: '', tool_calls: [tc('A', 'list_folder_tree')] },
      { role: 'tool', tool_call_id: 'A', name: 'list_folder_tree', content: '{}' },
      ...Array.from({ length: 38 }, (_, i) => ({ role: 'user', content: `t${i}` })),
    ];
    const messages = [{ role: 'system', content: 's' }, ...prefix, ...tail];
    const out = applySlidingWindow(messages, 40);
    expect(out[0]).toEqual({ role: 'system', content: 's' });
    expect(out[1]?.role).toBe('assistant');
    expect(out.some((m) => m.role === 'tool' && (m as { tool_call_id?: string }).tool_call_id === 'A')).toBe(
      true,
    );
  });

  it('maxNonSystem <= 0 disables window', () => {
    const messages = [
      { role: 'system', content: 's' },
      { role: 'user', content: 'a' },
      { role: 'user', content: 'b' },
    ];
    expect(applySlidingWindow(messages, 0)).toEqual(messages);
    expect(applySlidingWindow(messages, -1)).toEqual(messages);
  });

  it('works without leading system', () => {
    const messages = Array.from({ length: 45 }, (_, i) => ({ role: 'user', content: String(i) }));
    const out = applySlidingWindow(messages, 40);
    expect(out).toHaveLength(40);
  });
});
