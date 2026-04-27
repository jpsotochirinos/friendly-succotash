import { describe, it, expect } from 'vitest';
import { createEmailProvider } from './factory';
import { BrevoProvider } from './providers/brevo.provider';
import { SendGridProvider } from './providers/sendgrid.provider';
import { SmtpProvider } from './providers/smtp.provider';

describe('createEmailProvider', () => {
  it('returns SmtpProvider by default', () => {
    const p = createEmailProvider({});
    expect(p).toBeInstanceOf(SmtpProvider);
    expect(p.id).toBe('smtp');
  });

  it('treats sendinblue as Brevo', () => {
    const p = createEmailProvider({ EMAIL_PROVIDER: 'sendinblue', BREVO_API_KEY: 'k' });
    expect(p).toBeInstanceOf(BrevoProvider);
    expect(p.id).toBe('brevo');
  });

  it('returns SendGrid when configured', () => {
    const p = createEmailProvider({ EMAIL_PROVIDER: 'sendgrid', SENDGRID_API_KEY: 'sg' });
    expect(p).toBeInstanceOf(SendGridProvider);
    expect(p.id).toBe('sendgrid');
  });

  it('returns Brevo with brevo', () => {
    const p = createEmailProvider({ EMAIL_PROVIDER: 'brevo', BREVO_API_KEY: 'k' });
    expect(p).toBeInstanceOf(BrevoProvider);
  });
});
