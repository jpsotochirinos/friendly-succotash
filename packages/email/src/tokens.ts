/**
 * Nest DI token for the resolved email Strategy ({@link IEmailProvider}).
 * Distinct from the env var `EMAIL_PROVIDER` (smtp | brevo | sendgrid).
 */
export const EMAIL_MESSAGING = Symbol('EMAIL_MESSAGING');
