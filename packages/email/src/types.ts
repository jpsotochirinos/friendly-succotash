export type EmailProviderId = 'smtp' | 'brevo' | 'sendgrid';

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface EmailMessage {
  to: EmailAddress | EmailAddress[];
  from?: EmailAddress;
  replyTo?: EmailAddress;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  /** Provider-specific tags (e.g. SendGrid categories). */
  tags?: string[];
}

export interface SendResult {
  providerId: EmailProviderId;
  messageId?: string;
}

export interface IEmailProvider {
  readonly id: EmailProviderId;
  sendMail(msg: EmailMessage): Promise<SendResult>;
}
