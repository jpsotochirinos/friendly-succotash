export type {
  EmailAddress,
  EmailAttachment,
  EmailMessage,
  EmailProviderId,
  IEmailProvider,
  SendResult,
} from './types';
export { EMAIL_MESSAGING } from './tokens';
export type { EmailEnv } from './env';
export { getEmailProviderKind, resolveDefaultFrom } from './env';
export { createEmailProvider, createEmailProviderFromProcessEnv } from './factory';
export { escapeHtml, parseFromHeader } from './html';
export { recipientsList, toEmailString } from './address-utils';
export { invitationTemplate } from './templates/invitation';
export { magicLinkTemplate } from './templates/magic-link';
export { passwordResetTemplate } from './templates/password-reset';
export { notificationDigestTemplate } from './templates/notification-digest';
export { signatureRequestTemplate } from './templates/signature-request';
export { signatureOtpTemplate } from './templates/signature-otp';
export { signatureCompletedTemplate } from './templates/signature-completed';
export { SmtpProvider } from './providers/smtp.provider';
export { BrevoProvider } from './providers/brevo.provider';
export { SendGridProvider } from './providers/sendgrid.provider';
