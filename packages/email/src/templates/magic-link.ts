import { escapeHtml } from '../html';

export function magicLinkTemplate(magicLinkUrl: string, productName: string = 'Alega'): string {
  return `
        <h2>Login to ${escapeHtml(productName)}</h2>
        <p>Click the link below to log in. This link expires in 15 minutes.</p>
        <a href="${escapeHtml(magicLinkUrl)}">Log in to ${escapeHtml(productName)}</a>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `;
}
