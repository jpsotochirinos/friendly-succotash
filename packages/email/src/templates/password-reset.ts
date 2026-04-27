import { escapeHtml } from '../html';

export function passwordResetTemplate(resetUrl: string, productName: string = 'Alega'): string {
  return `
        <h2>Reset your password for ${escapeHtml(productName)}</h2>
        <p>Click the link below to choose a new password. This link expires soon.</p>
        <a href="${escapeHtml(resetUrl)}">Reset password</a>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `;
}
