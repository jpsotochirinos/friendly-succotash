// CommonJS `export =` from @sendgrid/mail
// eslint-disable-next-line @typescript-eslint/no-require-imports
import sgMail = require('@sendgrid/mail');
import type { MailDataRequired } from '@sendgrid/mail';
import { resolveDefaultFrom } from '../env';
import { recipientsList } from '../address-utils';
import type { EmailMessage, IEmailProvider, SendResult } from '../types';
import type { EmailEnv } from '../env';

export class SendGridProvider implements IEmailProvider {
  readonly id = 'sendgrid' as const;
  private readonly env: EmailEnv;
  private readonly key: string;

  constructor(env: EmailEnv) {
    this.env = env;
    const k = env.SENDGRID_API_KEY;
    if (!k?.trim()) {
      throw new Error('SENDGRID_API_KEY is required when EMAIL_PROVIDER=sendgrid');
    }
    this.key = k;
  }

  async sendMail(msg: EmailMessage): Promise<SendResult> {
    sgMail.setApiKey(this.key);
    const fromEmail = msg.from?.email ?? resolveDefaultFrom(this.env);
    const fromName = msg.from?.name ?? this.env.EMAIL_FROM_NAME;
    const tos = recipientsList(msg.to);
    const fromField = (fromName ? { email: fromEmail, name: fromName } : fromEmail) as MailDataRequired['from'];
    const common: Pick<MailDataRequired, 'from' | 'subject' | 'html'> & Partial<MailDataRequired> = {
      from: fromField,
      subject: msg.subject,
      html: msg.html,
    };
    if (msg.text) common.text = msg.text;
    if (this.env.EMAIL_REPLY_TO) {
      common.replyTo = this.env.EMAIL_REPLY_TO;
    }
    if (msg.replyTo) {
      common.replyTo = msg.replyTo.name
        ? { email: msg.replyTo.email, name: msg.replyTo.name }
        : msg.replyTo.email;
    }
    if (msg.headers) {
      common.headers = msg.headers;
    }
    if (msg.tags?.length) {
      common.categories = msg.tags;
    }

    if (tos.length > 1) {
      const m: MailDataRequired = {
        ...common,
        to: tos.map((a) => (a.name ? { email: a.email, name: a.name } : a.email)),
        subject: common.subject!,
        html: common.html ?? '',
        from: common.from!,
      };
      const [res] = await sgMail.send(m);
      return { providerId: 'sendgrid', messageId: res.headers['x-message-id'] };
    }
    const t = tos[0]!;
    const s: MailDataRequired = {
      ...common,
      to: t.name ? { email: t.email, name: t.name } : t.email,
      subject: common.subject!,
      html: common.html ?? '',
      from: common.from!,
    };
    const [res] = await sgMail.send(s);
    return { providerId: 'sendgrid', messageId: res.headers['x-message-id'] };
  }
}
