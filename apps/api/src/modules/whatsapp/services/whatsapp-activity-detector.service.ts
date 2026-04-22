import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  Organization,
  Trackable,
  WhatsAppActivitySuggestion,
  WhatsAppMessage,
  WhatsAppUser,
  WorkflowItem,
} from '@tracker/db';
import { ActionType, ActivitySuggestionStatus } from '@tracker/shared';
import { LlmService, stripMarkdownCodeBlock } from '../../llm/llm.service';
import { WhatsAppNotificationService } from './whatsapp-notification.service';
import { WorkflowItemsService } from '../../workflow-items/workflow-items.service';

interface LlmActivityJson {
  hasActivity?: boolean;
  title?: string;
  relatedCase?: string;
  assignedTo?: string;
  dueHint?: string;
}

@Injectable()
export class WhatsAppActivityDetectorService {
  private readonly logger = new Logger(WhatsAppActivityDetectorService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly llm: LlmService,
    private readonly notify: WhatsAppNotificationService,
    private readonly workflowItems: WorkflowItemsService,
  ) {}

  async analyze(message: WhatsAppMessage): Promise<void> {
    const orgId =
      typeof message.organization === 'string'
        ? message.organization
        : (message.organization as { id: string }).id;
    const em = this.em.fork();
    em.setFilterParams('tenant', { organizationId: orgId });

    const system =
      'Eres asistente legal. Dado este mensaje de un grupo de abogados, ¿hay una tarea o compromiso implícito? ' +
      'Responde solo JSON: {"hasActivity":boolean,"title":string,"relatedCase":string|null,"assignedTo":string|null,"dueHint":string|null}';

    let parsed: LlmActivityJson;
    try {
      const data = await this.llm.chatCompletionJson({
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: message.body.slice(0, 4000) },
        ],
        options: { temperature: 0.2, maxTokens: 500 },
      });
      const content = (data as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message
        ?.content;
      if (!content) return;
      const raw = stripMarkdownCodeBlock(content);
      parsed = JSON.parse(raw) as LlmActivityJson;
    } catch (e) {
      this.logger.warn(`LLM activity parse failed: ${e}`);
      return;
    }

    const markProcessed = async () => {
      const msgRef = await em.findOne(WhatsAppMessage, message.id);
      if (msgRef) {
        msgRef.processedAt = new Date();
        await em.persistAndFlush(msgRef);
      }
    };

    if (!parsed.hasActivity || !parsed.title?.trim()) {
      await markProcessed();
      return;
    }

    const similar = await em.find(
      WorkflowItem,
      {
        title: { $ilike: `%${parsed.title.slice(0, 80)}%` },
      },
      { limit: 3 },
    );
    if (similar.length > 0) {
      await markProcessed();
      return;
    }

    const sender =
      message.sender ??
      (await em.findOne(WhatsAppUser, {
        phoneNumber: message.fromPhone,
        verifiedAt: { $ne: null },
      }));
    if (!sender) {
      await markProcessed();
      return;
    }

    let related: Trackable | null = null;
    if (parsed.relatedCase?.trim()) {
      related = await em.findOne(Trackable, {
        title: { $ilike: `%${parsed.relatedCase.trim().slice(0, 60)}%` },
      });
    }

    const extracted = message.body.slice(0, 2000);
    const suggestion = em.create(WhatsAppActivitySuggestion, {
      sourceMessage: message,
      suggestedTo: sender,
      relatedTrackable: related ?? undefined,
      extractedText: extracted,
      suggestedTitle: parsed.title,
      status: ActivitySuggestionStatus.PENDING,
      organization: em.getReference(Organization, orgId),
    });
    await em.persistAndFlush(suggestion);

    const dm =
      `Hola 👋 Vi en el grupo que mencionaste:\n_"${extracted.slice(0, 200)}${extracted.length > 200 ? '…' : ''}"_\n\n` +
      `¿Quieres que lo registre como tarea en Alega?\n\n` +
      `1️⃣ Sí, crear tarea\n2️⃣ Asignar a otro miembro\n3️⃣ Ignorar`;
    await this.notify.send(orgId, sender.phoneNumber, dm);

    await markProcessed();
  }

  async handleSuggestionReply(
    suggestion: WhatsAppActivitySuggestion,
    reply: string,
  ): Promise<void> {
    const em = this.em.fork();
    const orgId =
      typeof suggestion.organization === 'string'
        ? suggestion.organization
        : (suggestion.organization as { id: string }).id;
    em.setFilterParams('tenant', { organizationId: orgId });

    const s = await em.findOneOrFail(
      WhatsAppActivitySuggestion,
      { id: suggestion.id },
      { populate: ['suggestedTo', 'suggestedTo.user', 'relatedTrackable', 'sourceMessage'] },
    );

    const choice = reply.trim().charAt(0);
    if (choice === '3') {
      s.status = ActivitySuggestionStatus.IGNORED;
      s.confirmedAt = new Date();
      await em.persistAndFlush(s);
      return;
    }

    if (choice === '2') {
      await this.notify.send(
        orgId,
        s.suggestedTo.phoneNumber,
        'Indica el correo del compañero en Alega o crea la tarea desde la app web.',
      );
      s.status = ActivitySuggestionStatus.REJECTED;
      s.confirmedAt = new Date();
      await em.persistAndFlush(s);
      return;
    }

    if (choice !== '1') return;

    const waUser = s.suggestedTo;
    const userId =
      typeof waUser.user === 'string' ? waUser.user : (waUser.user as { id: string }).id;
    let trackableId = s.relatedTrackable?.id;
    if (!trackableId) {
      const first = await em.findOne(Trackable, {}, { orderBy: { updatedAt: 'DESC' } });
      trackableId = first?.id;
    }
    if (!trackableId) {
      await this.notify.send(
        orgId,
        waUser.phoneNumber,
        'No encontré un expediente vinculado. Abre Alega y crea la tarea desde el expediente.',
      );
      return;
    }

    const title = s.suggestedTitle || s.extractedText.slice(0, 500);
    const item = await this.workflowItems.createItem(
      {
        trackableId,
        title,
        kind: 'WhatsApp',
        actionType: ActionType.GENERIC,
        assignedToId: userId,
      },
      orgId,
      userId,
      { creationSource: 'assistant' },
    );

    s.status = ActivitySuggestionStatus.ACCEPTED;
    s.workflowItem = item;
    s.confirmedAt = new Date();
    await em.persistAndFlush(s);

    await this.notify.send(
      orgId,
      waUser.phoneNumber,
      `Listo: creé la tarea «${title}» en el expediente.`,
    );
  }
}
