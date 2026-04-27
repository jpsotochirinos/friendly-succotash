import { TransactionalEmailsApi, SendSmtpEmail, TransactionalEmailsApiApiKeys } from '@getbrevo/brevo';
import type { EmailEnv } from '../env';
import { resolveDefaultFrom } from '../env';
import { recipientsList } from '../address-utils';
import type { EmailMessage, IEmailProvider, SendResult } from '../types';

export class BrevoProvider implements IEmailProvider {
  readonly id = 'brevo' as const;
  private readonly api: TransactionalEmailsApi;
  private readonly env: EmailEnv;

  constructor(env: EmailEnv) {
    this.env = env;
    const key = env.BREVO_API_KEY;
    if (!key?.trim()) {
      throw new Error('BREVO_API_KEY is required when EMAIL_PROVIDER=brevo');
    }
    this.api = new TransactionalEmailsApi();
    this.api.setApiKey(TransactionalEmailsApiApiKeys.apiKey, key);
  }

  async sendMail(msg: EmailMessage): Promise<SendResult> {
    const fromEmail = msg.from?.email ?? resolveDefaultFrom(this.env);
    const fromName = msg.from?.name ?? this.env.EMAIL_FROM_NAME;
    const to = recipientsList(msg.to).map(
      (a) => ({ email: a.email, name: a.name }) as { email: string; name?: string },
    );
    const email = new SendSmtpEmail();
    email.to = to;
    email.sender = { email: fromEmail, name: fromName };
    email.subject = msg.subject;
    email.htmlContent = msg.html;
    if (msg.text) email.textContent = msg.text;
    if (this.env.EMAIL_REPLY_TO) {
      email.replyTo = { email: this.env.EMAIL_REPLY_TO };
    }
    if (msg.replyTo) {
      email.replyTo = { email: msg.replyTo.email, name: msg.replyTo.name };
    }
    if (msg.tags?.length) {
      email.tags = msg.tags;
    }
    const res = await this.api.sendTransacEmail(email);
    const body = res?.body as { messageId?: string } | undefined;
    return { providerId: 'brevo', messageId: body?.messageId };
  }
}
