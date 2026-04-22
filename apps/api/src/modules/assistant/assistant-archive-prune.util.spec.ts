import { describe, it, expect } from 'vitest';
import {
  attachmentIdsFromArchiveToolCall,
  pruneAttachmentIdsOnObjects,
  pruneWorkingAttachmentIds,
} from './assistant-archive-prune.util';

describe('attachmentIdsFromArchiveToolCall', () => {
  it('extracts single attachmentId', () => {
    const tc = {
      id: '1',
      function: {
        name: 'archive_attachment',
        arguments: JSON.stringify({ attachmentId: 'uuid-a' }),
      },
    };
    expect(attachmentIdsFromArchiveToolCall(tc)).toEqual(['uuid-a']);
  });

  it('extracts batch entries', () => {
    const tc = {
      id: '1',
      function: {
        name: 'archive_attachments_batch',
        arguments: JSON.stringify({
          entries: [{ attachmentId: 'a' }, { attachmentId: 'b' }],
        }),
      },
    };
    expect(attachmentIdsFromArchiveToolCall(tc)).toEqual(['a', 'b']);
  });

  it('returns empty for other tools', () => {
    const tc = {
      id: '1',
      function: { name: 'list_folder_tree', arguments: '{}' },
    };
    expect(attachmentIdsFromArchiveToolCall(tc)).toEqual([]);
  });
});

describe('pruneAttachmentIdsOnObjects', () => {
  it('removes id b from multiple rows', () => {
    const rows = [{ attachmentIds: ['a', 'b'] }, { attachmentIds: ['b', 'c'] }];
    pruneAttachmentIdsOnObjects(rows, ['b']);
    expect(rows[0]?.attachmentIds).toEqual(['a']);
    expect(rows[1]?.attachmentIds).toEqual(['c']);
  });

  it('sets attachmentIds undefined when all pruned', () => {
    const rows = [{ attachmentIds: ['x'] }];
    pruneAttachmentIdsOnObjects(rows, ['x']);
    expect(rows[0]?.attachmentIds).toBeUndefined();
  });
});

describe('pruneWorkingAttachmentIds', () => {
  it('only touches user messages', () => {
    const messages = [
      { role: 'user', attachmentIds: ['a', 'b'] },
      { role: 'assistant', content: 'x' },
    ];
    pruneWorkingAttachmentIds(messages, ['a']);
    expect(messages[0]?.attachmentIds).toEqual(['b']);
  });
});
