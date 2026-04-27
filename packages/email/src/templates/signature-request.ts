import { escapeHtml } from '../html';

export function signatureRequestTemplate(
  signUrl: string,
  documentTitle: string,
  organizationName: string,
  isExternal: boolean,
): string {
  const who = isExternal ? 'Se le solicita firmar un documento' : 'Tiene una solicitud de firma pendiente';
  return `
    <h2>Firma de documento — Alega</h2>
    <p>${escapeHtml(who)} en <strong>${escapeHtml(organizationName)}</strong>.</p>
    <p><strong>Documento:</strong> ${escapeHtml(documentTitle)}</p>
    <p><a href="${escapeHtml(signUrl)}">${isExternal ? 'Firmar documento' : 'Abrir en Alega'}</a></p>
    <p>Si no esperaba este mensaje, puede ignorarlo.</p>
  `;
}
