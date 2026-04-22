import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException, GoneException, NotFoundException } from '@nestjs/common';
import { PassThrough } from 'stream';
import { Readable } from 'stream';
vi.mock('../documents/docx-renderer.util', () => ({
  plainTextOrMarkdownToHtml: (text: string) => `<p>${String(text).replace(/\n/g, ' ')}</p>`,
  renderHtmlAsDocx: async () => Buffer.from('rendered-docx'),
}));
import { WhatsAppMediaController } from './whatsapp-media.controller';

describe('WhatsAppMediaController', () => {
  it('410 when token expired', async () => {
    const token = {
      verify: () => ({ ok: false as const, reason: 'expired' as const }),
    };
    const c = new WhatsAppMediaController({} as never, {} as never, token as never);
    await expect(c.streamDocument('id', 't', {} as never)).rejects.toBeInstanceOf(GoneException);
  });

  it('403 when token invalid', async () => {
    const token = {
      verify: () => ({ ok: false as const, reason: 'invalid' as const }),
    };
    const c = new WhatsAppMediaController({} as never, {} as never, token as never);
    await expect(c.streamDocument('id', 't', {} as never)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('403 when document id does not match token', async () => {
    const token = {
      verify: () => ({ ok: true as const, documentId: 'd1', organizationId: 'o1' }),
    };
    const c = new WhatsAppMediaController({} as never, {} as never, token as never);
    await expect(c.streamDocument('other', 't', {} as never)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('404 when document not found', async () => {
    const token = {
      verify: () => ({ ok: true as const, documentId: 'd1', organizationId: 'o1' }),
    };
    const fork = {
      setFilterParams: vi.fn(),
      findOne: vi.fn().mockResolvedValue(null),
    };
    const em = { fork: () => fork };
    const c = new WhatsAppMediaController(em as never, {} as never, token as never);
    await expect(c.streamDocument('d1', 't', {} as never)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('pipes object stream to response', async () => {
    const token = {
      verify: () => ({ ok: true as const, documentId: 'd1', organizationId: 'o1' }),
    };
    const doc = {
      minioKey: 'key1',
      filename: 'f.pdf',
      title: 'T',
      mimeType: 'application/pdf',
    };
    const fork = {
      setFilterParams: vi.fn(),
      findOne: vi.fn().mockResolvedValue(doc),
    };
    const em = { fork: () => fork };
    const body = Buffer.from('pdf-bytes');
    const storage = {
      getStream: vi.fn().mockResolvedValue(Readable.from([body])),
    };
    const res = new PassThrough() as PassThrough & { setHeader: (n: string, v: string) => void };
    res.setHeader = vi.fn() as unknown as typeof res.setHeader;
    const chunks: Buffer[] = [];
    res.on('data', (c: Buffer) => chunks.push(c));
    const finished = new Promise<void>((resolve, reject) => {
      res.on('end', resolve);
      res.on('error', reject);
    });
    const c = new WhatsAppMediaController(em as never, storage as never, token as never);
    await c.streamDocument('d1', 'tok', res as never);
    await finished;
    expect(Buffer.concat(chunks).equals(body)).toBe(true);
    expect(storage.getStream).toHaveBeenCalledWith('key1');
  });

  it('sirve DOCX renderizado cuando minioKey es null y contentText existe', async () => {
    const token = {
      verify: () => ({ ok: true as const, documentId: 'd1', organizationId: 'o1' }),
    };
    const doc = {
      minioKey: null,
      filename: null,
      title: 'Mi escrito',
      mimeType: null,
      contentText: 'Hola\n\nMundo',
    };
    const fork = {
      setFilterParams: vi.fn(),
      findOne: vi.fn().mockResolvedValue(doc),
    };
    const em = { fork: () => fork };
    const storage = { getStream: vi.fn() };
    const res = { setHeader: vi.fn(), end: vi.fn() };
    const c = new WhatsAppMediaController(em as never, storage as never, token as never);
    await c.streamDocument('d1', 'tok', res as never);
    expect(res.end).toHaveBeenCalledWith(Buffer.from('rendered-docx'));
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    expect(storage.getStream).not.toHaveBeenCalled();
  });
});
