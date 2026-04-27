import { escapeHtml } from '../html';

export function invitationTemplate(inviteUrl: string, organizationName: string): string {
  return `
        <h2>You've been invited</h2>
        <p>You were invited to join <strong>${escapeHtml(organizationName)}</strong> on Alega.</p>
        <p><a href="${escapeHtml(inviteUrl)}">Accept invitation</a></p>
        <p>If you did not expect this, you can ignore this email.</p>
      `;
}
