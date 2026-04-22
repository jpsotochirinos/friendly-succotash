import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import { TwilioProvider } from './twilio.provider';

function twilioCfg(overrides: Record<string, string | undefined>): ConfigService {
  return {
    get: (k: string) =>
      overrides[k] ?? (k === 'TWILIO_ACCOUNT_SID' ? 'ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' : undefined),
  } as unknown as ConfigService;
}

describe('TwilioProvider.parseIncomingMessage interactive', () => {
  const cfg = { get: () => undefined } as unknown as import('@nestjs/config').ConfigService;

  it('reads ButtonPayload as interactiveReply', () => {
    const p = new TwilioProvider(cfg);
    const m = p.parseIncomingMessage({
      MessageSid: 'SMx',
      From: 'whatsapp:+51999888777',
      To: 'whatsapp:+14155238886',
      Body: '',
      ButtonPayload: 'confirm_yes',
      ButtonText: 'Sí',
    } as Record<string, unknown>);
    expect(m?.interactiveReply).toEqual({ id: 'confirm_yes', title: 'Sí' });
    expect(m?.body).toBe('Sí');
  });

  it('reads ListId as interactiveReply', () => {
    const p = new TwilioProvider(cfg);
    const m = p.parseIncomingMessage({
      MessageSid: 'SMy',
      From: 'whatsapp:+51999888777',
      To: 'whatsapp:+14155238886',
      Body: '',
      ListId: 'row-uuid-1',
      ListTitle: 'Mi expediente',
    } as Record<string, unknown>);
    expect(m?.interactiveReply).toEqual({ id: 'row-uuid-1', title: 'Mi expediente' });
  });
});

describe('TwilioProvider sendInteractiveList / sendInteractiveButtons', () => {
  beforeEach(() => {
    vi.spyOn(TwilioProvider.prototype as unknown as { getClient: () => unknown }, 'getClient').mockReturnValue({
      messages: {
        create: vi.fn().mockResolvedValue({ sid: 'SMmock' }),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sendInteractiveList sin TWILIO_LIST_CONTENT_SID usa sendMessage numerado', async () => {
    const cfg = twilioCfg({
      TWILIO_AUTH_TOKEN: 'tok',
    });
    const p = new TwilioProvider(cfg);
    const spy = vi.spyOn(p, 'sendMessage').mockResolvedValue('SMfb');
    await p.sendInteractiveList('+51999111222', {
      body: 'Elige',
      rows: [{ id: 'x', title: 'Uno' }],
    });
    expect(spy).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringMatching(/Elige[\s\S]*1\) Uno[\s\S]*Responde con el número/),
    );
  });

  it('sendInteractiveList con TWILIO_LIST_CONTENT_SID envía contentSid y variables JSON', async () => {
    const create = vi.fn().mockResolvedValue({ sid: 'SMc' });
    vi.spyOn(TwilioProvider.prototype as unknown as { getClient: () => unknown }, 'getClient').mockReturnValue({
      messages: { create },
    });
    const cfg = twilioCfg({
      TWILIO_AUTH_TOKEN: 'tok',
      TWILIO_LIST_CONTENT_SID: 'HXlisttest',
    });
    const p = new TwilioProvider(cfg);
    await p.sendInteractiveList('+51999111222', {
      body: 'Lista',
      buttonLabel: 'Ver',
      rows: [{ id: 'id1', title: 'A', description: 'd' }],
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        contentSid: 'HXlisttest',
        contentVariables: expect.any(String),
      }),
    );
    const vars = JSON.parse(create.mock.calls[0][0].contentVariables as string) as Record<
      string,
      string
    >;
    expect(vars.body).toContain('Lista');
    expect(vars.button).toBe('Ver');
    expect(vars.item_1_id).toBe('id1');
    expect(vars.item_1_title).toBe('A');
    expect(vars.item_1_desc).toBe('d');
  });

  it('sendInteractiveButtons sin SID usa sendMessage con 1) 2)', async () => {
    const cfg = twilioCfg({ TWILIO_AUTH_TOKEN: 'tok' });
    const p = new TwilioProvider(cfg);
    const spy = vi.spyOn(p, 'sendMessage').mockResolvedValue('SMfb');
    await p.sendInteractiveButtons('+51999111222', {
      body: '¿Ok?',
      buttons: [
        { id: 'confirm_yes', title: 'Sí' },
        { id: 'confirm_no', title: 'No' },
      ],
    });
    expect(spy).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringMatching(/¿Ok\?[\s\S]*1\) Sí[\s\S]*2\) No/),
    );
  });

  it('sendMedia usa mediaUrl y statusCallback', async () => {
    const create = vi.fn().mockResolvedValue({ sid: 'SMmedia' });
    vi.spyOn(TwilioProvider.prototype as unknown as { getClient: () => unknown }, 'getClient').mockReturnValue({
      messages: { create },
    });
    const cfg = twilioCfg({ TWILIO_AUTH_TOKEN: 'tok' });
    const p = new TwilioProvider(cfg);
    await p.sendMedia('+51999111222', 'https://api.example.com/api/whatsapp/media/x?token=y', 'Mi doc');
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaUrl: ['https://api.example.com/api/whatsapp/media/x?token=y'],
        body: 'Mi doc',
        statusCallback: expect.stringMatching(/\/api\/whatsapp\/webhook\/status$/),
      }),
    );
  });
});
