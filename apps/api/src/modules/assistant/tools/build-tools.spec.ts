import { describe, it, expect, vi } from 'vitest';
import { buildAssistantTools } from './build-tools';
import type { BuildToolsDeps } from './build-tools';
import type { AssistantToolContext } from './tool-types';

const DOC_ID = 'b51b92b2-3b8d-4eca-9da2-6c7cffb6671c';

function stubDeps(overrides: {
  getShareMetadata?: ReturnType<typeof vi.fn>;
  sign?: ReturnType<typeof vi.fn>;
  sendMedia?: ReturnType<typeof vi.fn>;
  send?: ReturnType<typeof vi.fn>;
  findPhone?: ReturnType<typeof vi.fn>;
  findOneDoc?: ReturnType<typeof vi.fn>;
}): BuildToolsDeps {
  const findOneDoc =
    overrides.findOneDoc ??
    vi.fn().mockResolvedValue({
      id: DOC_ID,
      title: 'Escrito',
      contentText: '',
      organization: { id: 'a2bd5653-d714-475a-82d5-fb09b96a1ce3' },
      folder: { trackable: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' } },
    });
  const getShareMetadata =
    overrides.getShareMetadata ??
    vi.fn().mockResolvedValue({
      kind: 'minio' as const,
      minioKey: 'k',
      filename: 'doc.pdf',
      mimeType: 'application/pdf',
      bytes: 1024,
    });
  const sign = overrides.sign ?? vi.fn().mockReturnValue('signed-token');
  const sendMedia = overrides.sendMedia ?? vi.fn();
  const send = overrides.send ?? vi.fn();
  const findPhone = overrides.findPhone ?? vi.fn().mockResolvedValue('+51999111222');

  return {
    config: {
      get: (k: string) => {
        if (k === 'FRONTEND_URL') return 'http://localhost:5173';
        if (k === 'TWILIO_WEBHOOK_BASE_URL') return 'https://api.example.com';
        if (k === 'WHATSAPP_MEDIA_MAX_BYTES') return 16777216;
        if (k === 'WHATSAPP_MEDIA_TTL_SECONDS') return 600;
        return undefined;
      },
    } as BuildToolsDeps['config'],
    dashboard: {} as BuildToolsDeps['dashboard'],
    clients: {} as BuildToolsDeps['clients'],
    trackables: {} as BuildToolsDeps['trackables'],
    workflowItems: {} as BuildToolsDeps['workflowItems'],
    workflow: {} as BuildToolsDeps['workflow'],
    documents: {
      findOne: findOneDoc,
      getShareMetadataForWhatsApp: getShareMetadata,
    } as unknown as BuildToolsDeps['documents'],
    folders: {} as BuildToolsDeps['folders'],
    search: {} as BuildToolsDeps['search'],
    notifications: {} as BuildToolsDeps['notifications'],
    llm: {} as BuildToolsDeps['llm'],
    users: {} as BuildToolsDeps['users'],
    assistantAttachments: {} as BuildToolsDeps['assistantAttachments'],
    whatsappNotify: {
      findVerifiedPhoneForUser: findPhone,
      send,
      sendMedia,
    } as unknown as BuildToolsDeps['whatsappNotify'],
    whatsappMediaToken: { sign } as unknown as BuildToolsDeps['whatsappMediaToken'],
  };
}

describe('send_document_via_whatsapp', () => {
  const baseCtx: AssistantToolContext = {
    userId: 'decf0e58-edfc-4abd-bbb2-06338c9e9a21',
    organizationId: 'a2bd5653-d714-475a-82d5-fb09b96a1ce3',
    permissions: ['document:read', 'whatsapp:send_to_self'],
  };

  it('canal whatsapp y tamaño bajo llama sendMedia con token en la URL', async () => {
    const sendMedia = vi.fn();
    const send = vi.fn();
    const sign = vi.fn().mockReturnValue('tok123');
    const tools = buildAssistantTools(
      stubDeps({
        sendMedia,
        send,
        sign,
        getShareMetadata: vi.fn().mockResolvedValue({
          kind: 'minio' as const,
          minioKey: 'k',
          filename: 'doc.pdf',
          mimeType: 'application/pdf',
          bytes: 5000,
        }),
      }),
    );
    const tool = tools.find((t) => t.name === 'send_document_via_whatsapp')!;
    const out = await tool.run({ ...baseCtx, channel: 'whatsapp' }, { documentId: DOC_ID });
    expect(out).toMatchObject({ ok: true, channel: 'whatsapp', sent: 'media' });
    expect((out as { assistantHint?: string }).assistantHint).toContain('adjunto');
    expect(sendMedia).toHaveBeenCalledWith(
      baseCtx.organizationId,
      '+51999111222',
      expect.stringContaining(`/api/whatsapp/media/${DOC_ID}?token=${encodeURIComponent('tok123')}`),
      'doc.pdf',
    );
    expect(send).not.toHaveBeenCalled();
  });

  it('canal whatsapp y tamaño grande envía solo texto con enlace', async () => {
    const sendMedia = vi.fn();
    const send = vi.fn();
    const tools = buildAssistantTools(
      stubDeps({
        sendMedia,
        send,
        getShareMetadata: vi.fn().mockResolvedValue({
          kind: 'minio' as const,
          minioKey: 'k',
          filename: 'big.pdf',
          mimeType: 'application/pdf',
          bytes: 20 * 1024 * 1024,
        }),
      }),
    );
    const tool = tools.find((t) => t.name === 'send_document_via_whatsapp')!;
    const out = await tool.run({ ...baseCtx, channel: 'whatsapp' }, { documentId: DOC_ID });
    expect(out).toMatchObject({ ok: true, channel: 'whatsapp', sent: 'link' });
    expect((out as { assistantHint?: string }).assistantHint).toContain('enlace');
    expect(send).toHaveBeenCalledWith(
      baseCtx.organizationId,
      '+51999111222',
      expect.stringMatching(/Enlace seguro.*token=/),
    );
    expect(sendMedia).not.toHaveBeenCalled();
  });

  it('canal WhatsApp: metadata kind rendered (sin minio) llama sendMedia con URL firmada', async () => {
    const sendMedia = vi.fn();
    const sign = vi.fn().mockReturnValue('tok-rend');
    const tools = buildAssistantTools(
      stubDeps({
        sendMedia,
        sign,
        getShareMetadata: vi.fn().mockResolvedValue({
          kind: 'rendered' as const,
          filename: 'Escrito.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          bytes: 5000,
        }),
      }),
    );
    const tool = tools.find((t) => t.name === 'send_document_via_whatsapp')!;
    const out = await tool.run({ ...baseCtx, channel: 'whatsapp' }, { documentId: DOC_ID });
    expect(out).toMatchObject({ ok: true, channel: 'whatsapp', sent: 'media' });
    expect(sendMedia).toHaveBeenCalledWith(
      baseCtx.organizationId,
      '+51999111222',
      expect.stringContaining(
        `/api/whatsapp/media/${DOC_ID}?token=${encodeURIComponent('tok-rend')}`,
      ),
      'Escrito.docx',
    );
  });

  it('canal web manda mensaje con FRONTEND_URL', async () => {
    const sendMedia = vi.fn();
    const send = vi.fn();
    const tools = buildAssistantTools(stubDeps({ sendMedia, send }));
    const tool = tools.find((t) => t.name === 'send_document_via_whatsapp')!;
    const out = await tool.run({ ...baseCtx, channel: 'web' }, { documentId: DOC_ID });
    expect(out).toEqual({ ok: true });
    expect(send).toHaveBeenCalledWith(
      baseCtx.organizationId,
      '+51999111222',
      expect.stringContaining('http://localhost:5173/trackables/'),
    );
    expect(sendMedia).not.toHaveBeenCalled();
  });
});
