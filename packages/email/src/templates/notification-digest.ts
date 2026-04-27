import { escapeHtml } from '../html';

export function notificationDigestTemplate(
  title: string,
  message: string,
  appUrl: string,
): string {
  return `
        <h2 style="font-family:system-ui,sans-serif">${escapeHtml(title)}</h2>
        <p style="font-family:system-ui,sans-serif">${escapeHtml(message)}</p>
        <p><a href="${escapeHtml(appUrl)}">Abrir en Alega</a></p>
      `;
}
