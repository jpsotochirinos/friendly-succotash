/**
 * Best-effort text extraction for assistant read_attachment.
 * Optional deps: pdf-parse, mammoth (see apps/api/package.json).
 */
export async function extractAttachmentText(
  buffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<{ text: string; note?: string }> {
  const mime = (mimeType || '').toLowerCase();
  if (mime.startsWith('text/') || mime === 'application/json') {
    return { text: buffer.toString('utf8') };
  }

  if (mime === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse') as (b: Buffer) => Promise<{ text?: string }>;
      const res = await pdfParse(buffer);
      return { text: (res.text || '').trim(), note: res.text ? undefined : 'PDF sin texto extraíble' };
    } catch {
      return { text: '', note: 'No se pudo extraer PDF (¿instalado pdf-parse?)' };
    }
  }

  if (
    mime.includes('wordprocessingml') ||
    mime === 'application/msword' ||
    filename.toLowerCase().endsWith('.docx')
  ) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammoth = require('mammoth') as { extractRawText: (o: { buffer: Buffer }) => Promise<{ value: string }> };
      const res = await mammoth.extractRawText({ buffer });
      return { text: (res.value || '').trim() };
    } catch {
      return { text: '', note: 'No se pudo extraer DOCX (¿instalado mammoth?)' };
    }
  }

  if (mime.startsWith('image/')) {
    return {
      text: '',
      note: 'Imagen: usa modo multimodal en el cliente o describe el archivo.',
    };
  }

  return { text: '', note: `Tipo no soportado para extracción: ${mime}` };
}
