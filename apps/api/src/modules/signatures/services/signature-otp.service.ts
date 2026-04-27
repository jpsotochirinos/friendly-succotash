import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from '@mikro-orm/postgresql';
import { createHash, randomInt } from 'node:crypto';
import type { Request } from 'express';
import {
  SignatureOtp,
  SignatureOtpChannel,
  SignatureRequestSigner,
  User,
  WhatsAppUser,
} from '@tracker/db';
import { SignatureEventType } from '@tracker/shared';
import { EmailService } from '../../../common/email/email.service';
import { WhatsAppNotificationService } from '../../whatsapp/services/whatsapp-notification.service';
import { normalizeWhatsAppPhone } from '../../whatsapp/utils/phone.util';
import { SignatureAuditService } from './signature-audit.service';

@Injectable()
export class SignatureOtpService {
  private readonly logger = new Logger(SignatureOtpService.name);
  private readonly expiryMin: number;
  private readonly maxAttempts: number;
  private readonly otpWhatsappEnabled: boolean;
  private resendAfterMs = 60_000;

  constructor(
    private readonly em: EntityManager,
    private readonly config: ConfigService,
    private readonly email: EmailService,
    private readonly wa: WhatsAppNotificationService,
    private readonly audit: SignatureAuditService,
  ) {
    this.expiryMin = Number(this.config.get('SIGNATURE_OTP_EXPIRY_MINUTES', 10));
    this.maxAttempts = Number(this.config.get('SIGNATURE_OTP_MAX_ATTEMPTS', 3));
    const rawWa = this.config.get<string | boolean | number | undefined>(
      'SIGNATURE_OTP_WHATSAPP_ENABLED',
    );
    this.otpWhatsappEnabled = !(
      rawWa === false ||
      rawWa === 0 ||
      String(rawWa).toLowerCase() === 'false' ||
      String(rawWa) === '0'
    );
  }

  private hashOtp(code: string): string {
    return createHash('sha256').update(code, 'utf8').digest('hex');
  }

  private async getEmailForSigner(
    orgId: string,
    s: SignatureRequestSigner,
  ): Promise<string> {
    if (s.user) {
      const u = await this.em.findOne(
        'User' as any,
        { id: s.user },
        { fields: ['email'] } as any,
      );
      return (u as { email: string } | null)?.email ?? '';
    }
    return s.externalEmail ?? '';
  }

  private getSignerUserId(s: SignatureRequestSigner): string | undefined {
    if (!s.user) return undefined;
    return typeof s.user === 'object' && 'id' in s.user
      ? (s.user as User).id
      : (s.user as string);
  }

  /** Número E.164 para avisar el OTP, o null si no aplica. */
  private async resolveOtpWhatsappTo(
    organizationId: string,
    signer: SignatureRequestSigner,
  ): Promise<string | null> {
    const userId = this.getSignerUserId(signer);
    if (userId) {
      const wa = await this.em.findOne(WhatsAppUser, {
        user: userId,
        organization: organizationId,
        isActive: true,
        verifiedAt: { $ne: null },
      } as any);
      return wa?.phoneNumber ?? null;
    }
    const raw = signer.externalPhone?.trim();
    if (!raw) return null;
    return normalizeWhatsAppPhone(raw);
  }

  private async getDocumentTitle(signer: SignatureRequestSigner): Promise<string> {
    const s = await this.em.findOne(
      SignatureRequestSigner,
      { id: signer.id },
      { populate: ['request', 'request.document'] },
    );
    return s?.request?.document?.title ?? s?.request?.title ?? 'Documento';
  }

  async sendOtp(
    organizationId: string,
    signer: SignatureRequestSigner,
    req: Request,
    isExternal = false,
    opts?: { channel?: 'email' | 'whatsapp' },
  ): Promise<void> {
    const wantWhatsappOnly = opts?.channel === 'whatsapp';
    const now = new Date();
    const existing = await this.em.find(
      SignatureOtp,
      { signer: signer.id, used: false },
      { orderBy: { createdAt: 'DESC' } },
    );
    if (existing[0]?.lastSentAt && now.getTime() - existing[0].lastSentAt.getTime() < this.resendAfterMs) {
      throw new BadRequestException('Espere 60 s antes de reenviar el código.');
    }
    for (const o of existing) {
      if (!o.used) this.em.remove(o);
    }
    const code = String(randomInt(100_000, 1_000_000));
    const codeHash = this.hashOtp(code);
    const expiresAt = new Date(Date.now() + this.expiryMin * 60_000);
    const title = await this.getDocumentTitle(signer);

    if (wantWhatsappOnly) {
      if (!this.otpWhatsappEnabled) {
        throw new BadRequestException('El envío de OTP por WhatsApp no está habilitado en el servidor.');
      }
      const phone = await this.resolveOtpWhatsappTo(organizationId, signer);
      if (!phone) {
        throw new BadRequestException('No hay teléfono de WhatsApp para enviar el código. Indicá un número válido.');
      }
      const row = this.em.create(SignatureOtp, {
        organization: organizationId,
        signer,
        codeHash,
        expiresAt,
        used: false,
        channel: SignatureOtpChannel.WHATSAPP,
        attempts: 0,
        lastSentAt: now,
      } as any);
      await this.em.flush();
      const body = `Tu código de verificación Alega: ${code} (válido ${this.expiryMin} min). Documento: ${title}`;
      try {
        await this.wa.send(organizationId, phone, body);
      } catch (e) {
        this.em.remove(row);
        await this.em.flush();
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.warn(`OTP WhatsApp send failed for signer ${signer.id}: ${msg}`);
        throw new BadRequestException('No se pudo enviar el código por WhatsApp. Intente de nuevo o use el correo.');
      }
      await this.audit.record(organizationId, signer, SignatureEventType.OTP_SENT, req, {
        metadata: { external: isExternal, channel: 'whatsapp' as const, whatsapp: true },
      });
      return;
    }

    this.em.create(SignatureOtp, {
      organization: organizationId,
      signer,
      codeHash,
      expiresAt,
      used: false,
      channel: SignatureOtpChannel.EMAIL,
      attempts: 0,
      lastSentAt: now,
    } as any);
    await this.em.flush();

    const to = await this.getEmailForSigner(organizationId, signer);
    if (!to) {
      throw new BadRequestException('No hay email destino para el OTP.');
    }
    await this.email.sendSignatureOtpEmail(to, code, title);

    let whatsappSent = false;
    if (this.otpWhatsappEnabled) {
      const phone = await this.resolveOtpWhatsappTo(organizationId, signer);
      if (phone) {
        const body = `Tu código de verificación Alega: ${code} (válido ${this.expiryMin} min). Documento: ${title}`;
        try {
          await this.wa.send(organizationId, phone, body);
          whatsappSent = true;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          this.logger.warn(`OTP WhatsApp send failed for signer ${signer.id}: ${msg}`);
        }
      }
    }

    await this.audit.record(organizationId, signer, SignatureEventType.OTP_SENT, req, {
      metadata: { external: isExternal, channel: 'email' as const, whatsapp: whatsappSent },
    });
  }

  async verifyOtp(
    organizationId: string,
    signer: SignatureRequestSigner,
    code: string,
    req: Request,
  ): Promise<void> {
    const now = new Date();
    const row = await this.em.findOne(SignatureOtp, {
      signer: signer.id,
      used: false,
      organization: organizationId,
    } as any);
    if (!row) {
      throw new BadRequestException('Solicite un nuevo código.');
    }
    if (row.expiresAt < now) {
      throw new BadRequestException('Código vencido. Solicite uno nuevo.');
    }
    if (row.attempts >= this.maxAttempts) {
      this.em.remove(row);
      await this.em.flush();
      throw new BadRequestException('Demasiados intentos. Solicite un nuevo código.');
    }
    if (row.codeHash !== this.hashOtp(code.trim())) {
      row.attempts += 1;
      await this.em.flush();
      if (row.attempts >= this.maxAttempts) {
        this.em.remove(row);
        await this.em.flush();
        throw new BadRequestException('Demasiados intentos. Solicite un nuevo código.');
      }
      throw new BadRequestException('Código inválido.');
    }
    row.used = true;
    await this.em.flush();
    await this.audit.record(organizationId, signer, SignatureEventType.OTP_VERIFIED, req, {
      otpVerifiedAt: new Date(),
    });
  }
}
