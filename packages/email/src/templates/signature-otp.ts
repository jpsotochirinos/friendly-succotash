import { escapeHtml } from '../html';

export function signatureOtpTemplate(code: string, documentTitle: string): string {
  return `
    <h2>Código de verificación</h2>
    <p>Su código para firmar el documento <strong>${escapeHtml(documentTitle)}</strong> es:</p>
    <p style="font-size: 24px; letter-spacing: 4px;"><strong>${escapeHtml(code)}</strong></p>
    <p>Vence en 10 minutos. No comparta este código.</p>
  `;
}
