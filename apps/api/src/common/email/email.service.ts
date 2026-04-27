import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EMAIL_MESSAGING,
  invitationTemplate,
  magicLinkTemplate,
  passwordResetTemplate,
  notificationDigestTemplate,
  signatureRequestTemplate,
  signatureOtpTemplate,
  signatureCompletedTemplate,
  resolveDefaultFrom,
  type IEmailProvider,
} from '@tracker/email';
import { buildEmailEnvFromConfig } from './email-env.util';

@Injectable()
export class EmailService {
  constructor(
    @Inject(EMAIL_MESSAGING) private readonly provider: IEmailProvider,
    private readonly config: ConfigService,
  ) {}

  async sendMail(options: { to: string; subject: string; html: string }): Promise<void> {
    const env = buildEmailEnvFromConfig(this.config);
    const from = resolveDefaultFrom(env);
    await this.provider.sendMail({
      to: { email: options.to },
      from: { email: from, name: env.EMAIL_FROM_NAME },
      subject: options.subject,
      html: options.html,
    });
  }

  async sendNotificationDigest(options: {
    to: string;
    title: string;
    message: string;
    appUrl?: string;
  }): Promise<void> {
    const base = this.config.get('FRONTEND_URL', 'http://localhost:5173').replace(/\/$/, '');
    const link = options.appUrl || base;
    const html = notificationDigestTemplate(options.title, options.message, link);
    await this.sendMail({ to: options.to, subject: options.title, html });
  }

  async sendMagicLinkEmail(to: string, magicLinkUrl: string): Promise<void> {
    const html = magicLinkTemplate(magicLinkUrl, 'Alega');
    await this.sendMail({
      to,
      subject: 'Your login link - Alega',
      html,
    });
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    const html = passwordResetTemplate(resetUrl, 'Alega');
    await this.sendMail({
      to,
      subject: 'Reset your password - Alega',
      html,
    });
  }

  async sendInvitationEmail(to: string, inviteUrl: string, organizationName: string): Promise<void> {
    const html = invitationTemplate(inviteUrl, organizationName);
    await this.sendMail({
      to,
      subject: `Invitation to join ${organizationName} — Alega`,
      html,
    });
  }

  async sendSignatureRequestEmail(
    to: string,
    signUrl: string,
    documentTitle: string,
    organizationName: string,
    isExternal: boolean,
  ): Promise<void> {
    const html = signatureRequestTemplate(signUrl, documentTitle, organizationName, isExternal);
    await this.sendMail({
      to,
      subject: isExternal
        ? `Firma requerida: ${documentTitle} — Alega`
        : `Solicitud de firma: ${documentTitle} — Alega`,
      html,
    });
  }

  async sendSignatureOtpEmail(to: string, code: string, documentTitle: string): Promise<void> {
    const html = signatureOtpTemplate(code, documentTitle);
    await this.sendMail({
      to,
      subject: `Código de verificación — ${documentTitle} — Alega`,
      html,
    });
  }

  async sendSignatureCompletedEmail(
    to: string,
    documentTitle: string,
    downloadUrl: string,
    organizationName: string,
  ): Promise<void> {
    const html = signatureCompletedTemplate(documentTitle, downloadUrl, organizationName);
    await this.sendMail({
      to,
      subject: `Documento firmado: ${documentTitle} — Alega`,
      html,
    });
  }
}
