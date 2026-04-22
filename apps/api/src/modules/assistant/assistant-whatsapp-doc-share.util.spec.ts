import { describe, it, expect } from 'vitest';
import { singleDocumentIdFromSearchToolResult } from './assistant-whatsapp-doc-share.util';

describe('singleDocumentIdFromSearchToolResult', () => {
  it('returns id when there is exactly one hit', () => {
    expect(
      singleDocumentIdFromSearchToolResult({
        type: 'tool_result',
        name: 'search_documents',
        ok: true,
        result: { data: [{ id: 'doc-1' }], total: 1 },
      }),
    ).toBe('doc-1');
  });

  it('returns null when total > 1', () => {
    expect(
      singleDocumentIdFromSearchToolResult({
        type: 'tool_result',
        name: 'search_documents',
        ok: true,
        result: { data: [{ id: 'doc-1' }], total: 5 },
      }),
    ).toBeNull();
  });

  it('returns null when data has more than one row', () => {
    expect(
      singleDocumentIdFromSearchToolResult({
        type: 'tool_result',
        name: 'search_documents',
        ok: true,
        result: { data: [{ id: 'a' }, { id: 'b' }], total: 2 },
      }),
    ).toBeNull();
  });

  it('returns null when total is missing', () => {
    expect(
      singleDocumentIdFromSearchToolResult({
        type: 'tool_result',
        name: 'search_documents',
        ok: true,
        result: { data: [{ id: 'doc-1' }] },
      }),
    ).toBeNull();
  });

  it('returns null for other tools', () => {
    expect(
      singleDocumentIdFromSearchToolResult({
        type: 'tool_result',
        name: 'list_folder_tree',
        ok: true,
        result: {},
      }),
    ).toBeNull();
  });
});
