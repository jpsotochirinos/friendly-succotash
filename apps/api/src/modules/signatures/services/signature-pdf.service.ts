import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PDFDocument, StandardFonts, rgb, type PDFImage } from 'pdf-lib';
import * as QRCode from 'qrcode';
import { SignatureRequest, SignatureRequestSigner, type Organization } from '@tracker/db';
import { SignerStatus } from '@tracker/shared';
import type { SignatureZone } from '@tracker/db';
import type { User } from '@tracker/db';

@Injectable()
export class SignaturePdfService {
  private readonly appPublicUrl: string;

  constructor(private readonly config: ConfigService) {
    this.appPublicUrl = (
      this.config.get<string>('APP_PUBLIC_URL') ||
      this.config.get<string>('FRONTEND_URL') ||
      'http://localhost:5173'
    ).replace(/\/$/, '');
  }

  calculateHash(pdfBytes: Buffer): string {
    return createHash('sha256').update(pdfBytes).digest('hex');
  }

  dataUrlToPngBuffer(dataUrl: string): Buffer {
    const m = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/i);
    if (!m) {
      throw new Error('Data URL de imagen no válida');
    }
    return Buffer.from(m[2]!, 'base64');
  }

  private async embedImage(
    doc: PDFDocument,
    bytes: Buffer,
    mime: string,
  ): Promise<PDFImage> {
    if (mime.includes('jpeg') || mime.includes('jpg')) {
      return doc.embedJpg(bytes);
    }
    return doc.embedPng(bytes);
  }

  private static TOLERANCE_PT = 1;

  /**
   * Zona en espacio de usuario PDF (origen abajo-izq, como pdf-lib drawImage).
   * Lanza Error si queda fuera de página o es inválida.
   */
  async assertSignatureZoneFits(pdfBytes: Buffer, zone: SignatureZone): Promise<void> {
    const doc = await PDFDocument.load(pdfBytes);
    const n = doc.getPageCount();
    if (zone.page < 1 || zone.page > n) {
      throw new Error(`Página de firma fuera de rango (1–${n}).`);
    }
    const page = doc.getPage(zone.page - 1);
    const { width: pw, height: ph } = page.getSize();
    const t = SignaturePdfService.TOLERANCE_PT;
    if (zone.x < -t || zone.y < -t || zone.width <= 0 || zone.height <= 0) {
      throw new Error('Zona de firma inválida (posición o tamaño).');
    }
    if (zone.x + zone.width > pw + t || zone.y + zone.height > ph + t) {
      throw new Error('La zona de firma excede los márgenes de la página.');
    }
  }

  async stampSignature(
    pdfBytes: Buffer,
    zone: SignatureZone,
    signatureImageBytes: Buffer,
    imageMime: string,
  ): Promise<Buffer> {
    const doc = await PDFDocument.load(pdfBytes);
    const pages = doc.getPages();
    const page = pages[zone.page - 1];
    if (!page) {
      throw new Error('Página de firma fuera de rango');
    }
    const img = await this.embedImage(doc, signatureImageBytes, imageMime);
    page.drawImage(img, { x: zone.x, y: zone.y, width: zone.width, height: zone.height });
    const out = await doc.save();
    return Buffer.from(out);
  }

  /**
   * Última versión: agrega QR + tabla de registro. `documentHashAfter` debe ser el hash del `pdfBytes` de entrada
   * (PDF ya firmado por todos) antes de añadir esta página.
   */
  async appendSignatureRegistryPage(
    pdfBytes: Buffer,
    request: SignatureRequest,
    signers: SignatureRequestSigner[],
    org: Organization,
    documentHashAfter: string,
    tsaNote?: string | null,
  ): Promise<Buffer> {
    const doc = await PDFDocument.load(pdfBytes);
    const first = doc.getPage(0);
    const { width, height } = first.getSize();
    const page = doc.addPage([width, height]);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const margin = 40;
    let y = height - margin;
    const line = (text: string, size = 10, bold = false) => {
      page.drawText(text, {
        x: margin,
        y,
        size,
        font: bold ? fontBold : font,
        color: rgb(0, 0, 0),
        maxWidth: width - 2 * margin,
      });
      y -= size + 4;
    };

    line('REGISTRO ELECTRÓNICO DE FIRMAS — ALEGA', 12, true);
    y -= 4;
    line(`Documento: ${request.title}`);
    line(`Estudio: ${(org as any).name ?? '—'}`);
    line(`Hash SHA-256: ${documentHashAfter}`);
    if (tsaNote) {
      line(`Sellado TSA: ${tsaNote}`);
    } else {
      line('Sellado TSA: (no disponible en este sellado)', 9, false);
    }
    y -= 6;
    line('Firmantes', 11, true);
    y -= 2;

    const done = signers
      .filter((s) => s.status === SignerStatus.SIGNED)
      .sort((a, b) => a.signerOrder - b.signerOrder);

    const nameOf = (s: SignatureRequestSigner) => {
      if (s.externalName || s.externalEmail) {
        return s.externalName || s.externalEmail || '—';
      }
      if (s.user && typeof s.user === 'object') {
        const u = s.user as User;
        return [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email || '—';
      }
      return '—';
    };
    for (const s of done) {
      const when = s.signedAt ? s.signedAt.toISOString() : '—';
      line(`• ${nameOf(s)} — ${when} — OTP: sí`, 9, false);
    }

    y -= 10;
    const verifyUrl = `${this.appPublicUrl}/verify/${documentHashAfter}`;
    line(`Verificar: ${verifyUrl}`, 8);
    const qrPng = await QRCode.toBuffer(verifyUrl, { type: 'png', width: 120, margin: 1 });
    const img = await doc.embedPng(qrPng);
    const qw = 100;
    const qh = 100;
    page.drawImage(img, { x: width - margin - qw, y: margin, width: qw, height: qh });

    return Buffer.from(await doc.save());
  }
}
