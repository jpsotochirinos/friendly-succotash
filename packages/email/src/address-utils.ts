import type { EmailAddress, EmailMessage } from './types';

export function recipientsList(to: EmailMessage['to']): EmailAddress[] {
  return Array.isArray(to) ? to : [to];
}

export function toEmailString(a: EmailAddress): string {
  if (a.name) return `${a.name} <${a.email}>`;
  return a.email;
}
