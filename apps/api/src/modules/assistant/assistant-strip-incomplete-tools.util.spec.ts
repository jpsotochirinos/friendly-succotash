import { describe, it, expect } from 'vitest';
import { stripIncompleteToolSuffix } from './assistant-strip-incomplete-tools.util';

const tc = (id: string, name: string, args = '{}') => ({
  id,
  type: 'function' as const,
  function: { name, arguments: args },
});

describe('stripIncompleteToolSuffix', () => {
  it('drops orphan assistant with tool_calls but keeps following user message', () => {
    const messages = [
      { role: 'user', content: 'PDF old' },
      { role: 'assistant', content: 'pick folder', tool_calls: [tc('X', 'ui_ask_file_placement')] },
      { role: 'user', content: 'Hola' },
    ];
    expect(stripIncompleteToolSuffix(messages)).toEqual([
      { role: 'user', content: 'PDF old' },
      { role: 'user', content: 'Hola' },
    ]);
  });

  it('keeps assistant when all tool_call_ids have matching tool messages before next user', () => {
    const messages = [
      { role: 'user', content: 'A' },
      { role: 'assistant', content: '', tool_calls: [tc('X', 'list_folder_tree')] },
      { role: 'tool', tool_call_id: 'X', name: 'list_folder_tree', content: '{"ok":true}' },
      { role: 'user', content: 'B' },
    ];
    expect(stripIncompleteToolSuffix(messages)).toEqual(messages);
  });

  it('drops two consecutive orphan assistants and keeps trailing user', () => {
    const messages = [
      { role: 'assistant', content: '', tool_calls: [tc('X', 'ui_ask_file_placement')] },
      { role: 'assistant', content: '', tool_calls: [tc('Y', 'ui_ask_search')] },
      { role: 'user', content: 'Hola' },
    ];
    expect(stripIncompleteToolSuffix(messages)).toEqual([{ role: 'user', content: 'Hola' }]);
  });

  it('keeps trailing assistant with tool_calls when no tool rows yet (mutation confirm pending)', () => {
    const messages = [
      { role: 'user', content: 'Envíame el doc' },
      {
        role: 'assistant',
        content: '¿Confirmas?',
        tool_calls: [tc('call-1', 'send_document_via_whatsapp')],
      },
    ];
    expect(stripIncompleteToolSuffix(messages)).toEqual(messages);
  });

  it('drops orphan assistant and partial tool rows before user', () => {
    const messages = [
      { role: 'user', content: 'u1' },
      {
        role: 'assistant',
        content: '',
        tool_calls: [tc('A', 't1'), tc('B', 't2')],
      },
      { role: 'tool', tool_call_id: 'A', name: 't1', content: '{}' },
      { role: 'user', content: 'Hola' },
    ];
    expect(stripIncompleteToolSuffix(messages)).toEqual([
      { role: 'user', content: 'u1' },
      { role: 'user', content: 'Hola' },
    ]);
  });
});
