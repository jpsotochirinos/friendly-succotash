import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';

export async function extractText(
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  switch (mimeType) {
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    case 'application/msword': {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    case 'application/pdf': {
      const result = await pdfParse(buffer);
      return result.text;
    }
    case 'text/plain':
      return buffer.toString('utf-8');
    default:
      return buffer.toString('utf-8');
  }
}

export async function extractStructure(
  buffer: Buffer,
  mimeType: string,
): Promise<string[]> {
  if (
    mimeType ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const result = await mammoth.convertToHtml({ buffer });
    const headingRegex = /<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi;
    const headings: string[] = [];
    let match;
    while ((match = headingRegex.exec(result.value)) !== null) {
      headings.push(match[1].replace(/<[^>]*>/g, '').trim());
    }
    return headings;
  }
  return [];
}
