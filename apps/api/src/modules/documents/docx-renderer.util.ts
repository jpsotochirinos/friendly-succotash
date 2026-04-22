import HTMLtoDOCX from 'html-to-docx';

/** Escape text for safe inclusion in HTML. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Strip tags for search index / plain preview. */
export function stripHtmlToPlain(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Convert plain or lightly-marked text (paragraphs separated by blank lines) to simple HTML.
 * Supports **bold** and *italic* on a single line.
 */
export function plainTextOrMarkdownToHtml(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '<p></p>';
  return trimmed
    .split(/\n{2,}/)
    .map((block) => {
      const line = block.replace(/\n/g, ' ').trim();
      if (!line) return '';
      let h = escapeHtml(line);
      h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      h = h.replace(/(^|\s)\*(\S[^*]*\S|\S)\*(?=\s|$)/g, '$1<em>$2</em>');
      return `<p>${h}</p>`;
    })
    .filter(Boolean)
    .join('');
}

/** ~2.5 cm margins (html-to-docx accepts cm strings). */
const DOCX_MARGINS = {
  top: '2.5cm',
  right: '2.5cm',
  bottom: '2.5cm',
  left: '2.5cm',
} as const;

/**
 * Wrap fragment HTML in a minimal document and produce a DOCX buffer for SuperDoc.
 */
export async function renderHtmlAsDocx(htmlFragment: string, title: string): Promise<Buffer> {
  const safeTitle = escapeHtml(title);
  const fullHtml = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8" /></head>
<body>
<h1>${safeTitle}</h1>
${htmlFragment}
</body>
</html>`;

  const out = await HTMLtoDOCX(fullHtml, null, {
    orientation: 'portrait',
    margins: DOCX_MARGINS,
  });

  if (Buffer.isBuffer(out)) return out;
  if (out instanceof ArrayBuffer) return Buffer.from(out);
  return Buffer.from(out as Uint8Array);
}
