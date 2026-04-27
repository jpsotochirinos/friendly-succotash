import type nodemailer from 'nodemailer';
import type { EmailEnv } from '../env';
import { resolveDefaultFrom } from '../env';
import { parseFromHeader } from '../html';
import { recipientsList } from '../address-utils';
import type { EmailMessage, IEmailProvider, SendResult } from '../types';

export class SmtpProvider implements IEmailProvider {
  readonly id = 'smtp' as const;
  private readonly env: EmailEnv;
  private transporterPromise: Promise<nodemailer.Transporter> | null = null;

  constructor(env: EmailEnv) {
    this.env = env;
  }

  private async getTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporterPromise) return this.transporterPromise;
    this.transporterPromise = (async () => {
      const nodemailer = await import('nodemailer');
      const port = Number(this.env.SMTP_PORT ?? 1025);
      const host = this.env.SMTP_HOST ?? 'localhost';
      const user = this.env.SMTP_USER;
      const pass = this.env.SMTP_PASS;
      const hasAuth = Boolean(user && pass);
      return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        ...(hasAuth
          ? {
            auth: { user, pass },
          }
          : {}),
      });
    })();
    return this.transporterPromise;
  }

  async sendMail(msg: EmailMessage): Promise<SendResult> {
    const fromRaw = msg.from?.email ?? resolveDefaultFrom(this.env);
    const fromName = msg.from?.name ?? this.env.EMAIL_FROM_NAME;
    const fromParsed = parseFromHeader(fromRaw, fromName);
    const transporter = await this.getTransporter();
    const to = recipientsList(msg.to);
    const info = await transporter.sendMail({
      from: fromParsed.name
        ? `${fromParsed.name} <${fromParsed.email}>`
        : fromParsed.email,
      to: to.map((a) => (a.name ? `${a.name} <${a.email}>` : a.email)).join(', '),
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      replyTo: msg.replyTo ? (msg.replyTo.name ? `${msg.replyTo.name} <${msg.replyTo.email}>` : msg.replyTo.email) : this.env.EMAIL_REPLY_TO,
      headers: msg.headers,
    });
    return { providerId: 'smtp', messageId: info.messageId };
  }
}
