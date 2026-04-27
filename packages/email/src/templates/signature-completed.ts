import { escapeHtml } from '../html';

export function signatureCompletedTemplate(
  documentTitle: string,
  downloadUrl: string,
  organizationName: string,
): string {
  return `
    <h2>Documento firmado</h2>
    <p>El documento <strong>${escapeHtml(documentTitle)}</strong> ha sido firmado por todos los firmantes en <strong>${escapeHtml(organizationName)}</strong>.</p>
    <p><a href="${escapeHtml(downloadUrl)}">Descargar PDF firmado</a></p>
  `;
}
