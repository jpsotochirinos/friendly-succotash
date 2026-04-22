import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  Organization,
  WhatsAppMessage,
  WhatsAppUser,
  WhatsAppAccount,
} from '@tracker/db';
import { WhatsAppMessageDirection } from '@tracker/shared';
import type { ParsedIncomingMessage } from '../providers/whatsapp-provider.interface';
import { normalizeWhatsAppPhone } from '../utils/phone.util';

@Injectable()
export class WhatsAppMessageService {
  private readonly logger = new Logger(WhatsAppMessageService.name);

  constructor(private readonly em: EntityManager) {}

  /** Resuelve organización por línea destino o por remitente en whitelist. */
  async resolveOrganizationIdForWebhook(
    parsed: ParsedIncomingMessage,
  ): Promise<{ organizationId: string; account: WhatsAppAccount | null } | null> {
    const fork = this.em.fork();
    const to = normalizeWhatsAppPhone(parsed.toPhone);
    const account = await fork.findOne(
      WhatsAppAccount,
      {
        $or: [{ phoneNumberId: parsed.toPhone }, { phoneNumberId: to }, { displayPhone: to }],
      } as any,
      { filters: false, populate: ['organization'] },
    );
    if (account) {
      return { organizationId: (account.organization as { id: string }).id, account };
    }
    const phone = normalizeWhatsAppPhone(parsed.fromPhone);
    const waUser = await fork.findOne(
      WhatsAppUser,
      { phoneNumber: phone, verifiedAt: { $ne: null } } as any,
      { populate: ['organization'], filters: false },
    );
    if (waUser) {
      return { organizationId: waUser.organization.id, account: null };
    }
    this.logger.warn(`No organization resolved for webhook from=${phone} to=${to}`);
    return null;
  }

  async saveIncoming(
    organizationId: string,
    parsed: ParsedIncomingMessage,
    userId?: string,
  ): Promise<WhatsAppMessage> {
    const em = this.em.fork();
    em.setFilterParams('tenant', { organizationId });
    let sender: WhatsAppUser | undefined;
    if (userId) {
      sender = (await em.findOne(WhatsAppUser, { user: userId })) || undefined;
    }
    if (!sender) {
      const phone = normalizeWhatsAppPhone(parsed.fromPhone);
      sender =
        (await em.findOne(WhatsAppUser, {
          phoneNumber: phone,
          verifiedAt: { $ne: null },
        })) || undefined;
    }
    const existing = await em.findOne(WhatsAppMessage, { externalId: parsed.externalId });
    if (existing) return existing;
    const msg = em.create(WhatsAppMessage, {
      externalId: parsed.externalId,
      groupId: parsed.groupId ?? undefined,
      fromPhone: normalizeWhatsAppPhone(parsed.fromPhone),
      sender,
      body: parsed.body,
      direction: WhatsAppMessageDirection.INBOUND,
      timestamp: parsed.timestamp,
      organization: em.getReference(Organization, organizationId),
    });
    await em.persistAndFlush(msg);
    return msg;
  }

  async getHistory(
    organizationId: string,
    groupId?: string,
    limit = 50,
  ): Promise<WhatsAppMessage[]> {
    const em = this.em.fork();
    em.setFilterParams('tenant', { organizationId });
    const where: Record<string, unknown> = {};
    if (groupId !== undefined) {
      where.groupId = groupId;
    }
    return em.find(WhatsAppMessage, where, {
      orderBy: { timestamp: 'DESC' },
      limit,
      populate: ['sender'],
    });
  }

  async resolveUser(
    organizationId: string,
    phone: string,
  ): Promise<WhatsAppUser | null> {
    const em = this.em.fork();
    em.setFilterParams('tenant', { organizationId });
    const norm = normalizeWhatsAppPhone(phone);
    return em.findOne(WhatsAppUser, {
      phoneNumber: norm,
      isActive: true,
      verifiedAt: { $ne: null },
    });
  }
}
