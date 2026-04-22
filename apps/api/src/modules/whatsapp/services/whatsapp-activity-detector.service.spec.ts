import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WhatsAppActivityDetectorService } from './whatsapp-activity-detector.service';
import type { WhatsAppMessage, WhatsAppUser, WorkflowItem } from '@tracker/db';

function makeFork() {
  return {
    setFilterParams: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    findOneOrFail: vi.fn(),
    create: vi.fn((_cls: unknown, data: Record<string, unknown>) => data),
    persistAndFlush: vi.fn(),
    getReference: vi.fn(),
  };
}

describe('WhatsAppActivityDetectorService', () => {
  const llm = { chatCompletionJson: vi.fn() };
  const notify = { send: vi.fn() };
  const workflowItems = { createItem: vi.fn() };

  let fork: ReturnType<typeof makeFork>;
  let rootEm: { fork: () => typeof fork };
  let service: WhatsAppActivityDetectorService;

  beforeEach(() => {
    vi.clearAllMocks();
    fork = makeFork();
    rootEm = { fork: () => fork };
    service = new WhatsAppActivityDetectorService(
      rootEm as any,
      llm as any,
      notify as any,
      workflowItems as any,
    );
  });

  it('mensaje sin actividad: no crea suggestion', async () => {
    llm.chatCompletionJson.mockResolvedValue({
      choices: [{ message: { content: '{"hasActivity":false}' } }],
    });
    fork.findOne.mockResolvedValueOnce({
      id: 'm1',
      processedAt: null,
    });
    const msg = {
      id: 'm1',
      body: 'hola',
      fromPhone: '+51999001100',
      organization: { id: 'org1' },
      sender: undefined,
    } as unknown as WhatsAppMessage;

    await service.analyze(msg);

    expect(notify.send).not.toHaveBeenCalled();
    expect(fork.persistAndFlush).toHaveBeenCalled();
  });

  it('mensaje con actividad existente en WorkflowItem: no crea suggestion', async () => {
    llm.chatCompletionJson.mockResolvedValue({
      choices: [
        {
          message: {
            content: '{"hasActivity":true,"title":"Presentar escrito García","relatedCase":null}',
          },
        },
      ],
    });
    fork.find.mockResolvedValueOnce([{ id: 'wi1' } as WorkflowItem]);
    fork.findOne.mockResolvedValueOnce({ id: 'm2', processedAt: null });
    const msg = {
      id: 'm2',
      body: 'hay que presentar el escrito',
      fromPhone: '+51999001100',
      organization: { id: 'org1' },
    } as unknown as WhatsAppMessage;

    await service.analyze(msg);

    expect(notify.send).not.toHaveBeenCalled();
  });

  it('actividad nueva: crea suggestion y envía DM', async () => {
    llm.chatCompletionJson.mockResolvedValue({
      choices: [
        {
          message: {
            content: '{"hasActivity":true,"title":"Nueva tarea única XYZ","relatedCase":null}',
          },
        },
      ],
    });
    fork.find
      .mockResolvedValueOnce([]) // similar workflow items
      .mockResolvedValueOnce([]); // related trackable
    const sender = {
      id: 'wu1',
      phoneNumber: '+51999001100',
    } as WhatsAppUser;
    fork.findOne
      .mockResolvedValueOnce(sender) // sender from phone
      .mockResolvedValueOnce({ id: 'm3', processedAt: null }); // markProcessed msg ref
    fork.getReference.mockImplementation((_e: unknown, id: string) => ({ id }));
    const msg = {
      id: 'm3',
      body: 'compromiso: hacer cosa XYZ mañana',
      fromPhone: '+51999001100',
      organization: { id: 'org1' },
      sender,
    } as unknown as WhatsAppMessage;

    await service.analyze(msg);

    expect(fork.create).toHaveBeenCalled();
    expect(notify.send).toHaveBeenCalledWith(
      'org1',
      '+51999001100',
      expect.stringContaining('1️⃣'),
    );
  });
});
