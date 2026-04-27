import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from '@mikro-orm/postgresql';
import { Queue } from 'bullmq';
import type { Request } from 'express';
import {
  Client,
  Document,
  Organization,
  SignatureRequest,
  SignatureRequestSigner,
  type SignatureZone,
  User,
} from '@tracker/db';
import {
  NOTIFICATION_RECIPIENT_ROLES,
  NOTIFICATION_TYPES,
  SignatureEventType,
  SignatureMode,
  SignatureRequestStatus,
  SignerStatus,
} from '@tracker/shared';
import { EmailService } from '../../../common/email/email.service';
import { StorageService } from '../../storage/storage.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { normalizeWhatsAppPhone } from '../../whatsapp/utils/phone.util';
import type { CreateSignatureRequestDto } from '../dto/create-signature-request.dto';
import { SignatureAuditService } from './signature-audit.service';
import { SignatureOtpService } from './signature-otp.service';
import { SignaturePdfService } from './signature-pdf.service';
import { SignatureProfileService } from './signature-profile.service';
import { SignatureTokenService } from './signature-token.service';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const PDF_MIME = 'application/pdf';

const DEFAULT_SIGNATURE_ZONE: SignatureZone = {
  page: 1,
  x: 72,
  y: 120,
  width: 200,
  height: 64,
};

@Injectable()
export class SignatureRequestService {
  private readonly docxQueue: Queue;
  private readonly finalizeQueue: Queue;

  constructor(
    private readonly em: EntityManager,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
    private readonly tokenService: SignatureTokenService,
    private readonly audit: SignatureAuditService,
    private readonly profileService: SignatureProfileService,
    private readonly otpService: SignatureOtpService,
    private readonly pdfService: SignaturePdfService,
    private readonly email: EmailService,
    private readonly notifications: NotificationsService,
  ) {
    const connection = {
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
    };
    this.docxQueue = new Queue('docx-to-pdf', { connection });
    this.finalizeQueue = new Queue('signatures-finalize', { connection });
  }

  private appUrl(): string {
    return (
      this.config.get<string>('APP_PUBLIC_URL') ||
      this.config.get<string>('FRONTEND_URL') ||
      'http://localhost:5173'
    ).replace(/\/$/, '');
  }

  assertCanCreateDoc(userId: string, document: Document, permissions: string[]): void {
    const hasCreate = permissions.includes('signature:create');
    const isUploader = document.uploadedBy?.id === userId;
    if (hasCreate) return;
    if (permissions.includes('signature:sign') && isUploader) return;
    throw new ForbiddenException('No puede crear solicitudes de firma.');
  }

  needsDocxConversion(doc: Document): boolean {
    if (doc.pdfMinioKey) return false;
    const m = doc.mimeType || '';
    if (m === PDF_MIME || m === 'application/pdf') return false;
    return m === DOCX_MIME || m.includes('wordprocessingml') || !!doc.filename?.toLowerCase().endsWith('.docx');
  }

  private validateSigners(rows: CreateSignatureRequestDto['signers']): void {
    if (!rows?.length) throw new BadRequestException('Al menos un firmante.');
    rows.forEach((s, i) => {
      const hasUser = !!s.userId;
      const hasClient = !!s.clientId;
      const hasExt = !!(s.externalEmail?.trim() && s.externalName?.trim());
      const n = [hasUser, hasClient, hasExt].filter(Boolean).length;
      if (n !== 1) {
        throw new BadRequestException(
          `Firmante ${i + 1}: indique un usuario interno, un cliente de la agenda o nombre y email de firmante externo (solo una opción).`,
        );
      }
    });
  }

  async create(
    dto: CreateSignatureRequestDto,
    userId: string,
    organizationId: string,
    permissions: string[],
    req: Request,
  ): Promise<SignatureRequest> {
    this.validateSigners(dto.signers);
    const document = await this.em.findOne(
      Document,
      { id: dto.documentId, organization: organizationId },
      { populate: ['uploadedBy'] },
    );
    if (!document) throw new NotFoundException('Documento no encontrado.');
    if (document.lockedForSigning) {
      throw new BadRequestException('El documento ya está en un flujo de firma.');
    }
    this.assertCanCreateDoc(userId, document, permissions);

    const expiresAt = dto.expiresAt
      ? new Date(dto.expiresAt)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const request = this.em.create(SignatureRequest, {
      organization: organizationId,
      document,
      createdBy: this.em.getReference(User, userId),
      title: dto.title,
      message: dto.message,
      mode: dto.mode,
      status: SignatureRequestStatus.DRAFT,
      expiresAt,
      documentHashBefore: undefined,
      docxConversionPending: false,
    } as any);

    const externalPlains: { signer: SignatureRequestSigner; plain: string }[] = [];
    const willConvert = this.needsDocxConversion(document);

    let order = 0;
    for (const s of dto.signers) {
      let userId: string | undefined = s.userId;
      let externalName = s.externalName?.trim();
      let externalEmail = s.externalEmail?.trim();
      let externalPhone = s.externalPhone?.trim();
      if (s.clientId) {
        const c = await this.em.findOne(Client, { id: s.clientId, organization: organizationId });
        if (!c) {
          throw new NotFoundException(`Cliente no encontrado (${s.clientId}).`);
        }
        if (!c.email?.trim()) {
          throw new BadRequestException('El cliente debe tener email registrado para enviarle la solicitud de firma.');
        }
        userId = undefined;
        externalName = c.name;
        externalEmail = c.email;
        if (c.phone?.trim()) {
          try {
            externalPhone = normalizeWhatsAppPhone(c.phone);
          } catch {
            externalPhone = c.phone?.trim() || undefined;
          }
        }
      }
      const row = this.em.create(SignatureRequestSigner, {
        organization: organizationId,
        request,
        user: userId ? this.em.getReference(User, userId) : undefined,
        externalName: externalName || undefined,
        externalEmail: externalEmail || undefined,
        externalPhone: externalPhone || undefined,
        signerOrder: order++,
        status: SignerStatus.PENDING,
        signatureZone: (s.signatureZone as SignatureZone | undefined) ?? DEFAULT_SIGNATURE_ZONE,
      } as any);
      if (!userId && externalEmail) {
        if (!willConvert) {
          const { plain, hash, expiresAt: te } = this.tokenService.generateTokenPair();
          row.tokenHash = hash;
          row.tokenExpiresAt = te;
          externalPlains.push({ signer: row, plain });
        }
      }
    }

    document.lockedForSigning = true;

    const converting = willConvert;
    if (converting) {
      request.docxConversionPending = true;
      request.status = SignatureRequestStatus.DRAFT;
    } else {
      const pdfKey = document.pdfMinioKey || (document.mimeType?.includes('pdf') ? document.minioKey : null);
      if (!pdfKey) {
        throw new BadRequestException('No hay PDF para firmar. Convierta el documento a PDF primero.');
      }
      const buf = await this.storage.download(pdfKey);
      if (!document.pdfMinioKey && pdfKey) {
        document.pdfMinioKey = pdfKey;
      }
      request.documentHashBefore = this.pdfService.calculateHash(buf);
      request.status = SignatureRequestStatus.PENDING;
    }

    await this.em.flush();

    const org = await this.em.findOne(Organization, { id: organizationId });
    const orgName = org?.name ?? 'Alega';

    if (converting) {
      await this.docxQueue.add('convert-docx-to-pdf', {
        requestId: request.id,
        documentId: document.id,
        organizationId,
      });
      const first = request.signers.getItems().sort((a, b) => a.signerOrder - b.signerOrder)[0];
      if (first) {
        await this.audit.record(organizationId, first, SignatureEventType.REQUEST_CREATED, req, {
          metadata: { requestId: request.id, docxPending: true },
        });
      }
    } else {
      const first = request.signers.getItems().sort((a, b) => a.signerOrder - b.signerOrder)[0];
      if (first) {
        await this.audit.record(organizationId, first, SignatureEventType.REQUEST_CREATED, req, {
          metadata: { requestId: request.id },
        });
      }
      for (const { signer, plain } of externalPlains) {
        if (signer.externalEmail) {
          const url = `${this.appUrl()}/sign?token=${encodeURIComponent(plain)}`;
          await this.email.sendSignatureRequestEmail(
            signer.externalEmail,
            url,
            request.title,
            orgName,
            true,
          );
        }
        await this.audit.record(organizationId, signer, SignatureEventType.NOTIFICATION_SENT, req, {
          metadata: { external: true },
        });
        signer.status = SignerStatus.NOTIFIED;
      }
      await this.notifyAndMarkInternal(request, organizationId, orgName, req);
    }

    await this.em.flush();

    return this.em.findOneOrFail(
      SignatureRequest,
      { id: request.id },
      { populate: ['document', 'createdBy', 'signers', 'signers.user'] },
    );
  }

  private async notifyAndMarkInternal(
    request: SignatureRequest,
    organizationId: string,
    orgName: string,
    req: Request,
  ) {
    const signers = request.signers.getItems().sort((a, b) => a.signerOrder - b.signerOrder);
    if (request.mode === SignatureMode.SEQUENTIAL) {
      const first = signers[0];
      if (!first) return;
      if (first.user) {
        await this.sendInternalSignNotification(first, request, orgName, organizationId);
        first.status = SignerStatus.NOTIFIED;
        await this.audit.record(organizationId, first, SignatureEventType.NOTIFICATION_SENT, req, {});
      }
    } else {
      for (const s of signers) {
        if (s.user) {
          await this.sendInternalSignNotification(s, request, orgName, organizationId);
          s.status = SignerStatus.NOTIFIED;
          await this.audit.record(organizationId, s, SignatureEventType.NOTIFICATION_SENT, req, {});
        }
      }
    }
  }

  private async sendInternalSignNotification(
    signer: SignatureRequestSigner,
    request: SignatureRequest,
    orgName: string,
    organizationId: string,
  ) {
    if (!signer.user) return;
    const uid = typeof signer.user === 'object' ? (signer.user as User).id : (signer.user as any);
    const u = await this.em.findOne(User, { id: uid });
    if (!u) return;
    const url = `${this.appUrl()}/signatures/${request.id}/sign`;
    await this.email.sendSignatureRequestEmail(u.email, url, request.title, orgName, false);
    await this.notifications.createFromParams(
      {
        organizationId,
        type: NOTIFICATION_TYPES.SIGNATURE_REQUEST,
        title: `Firma requerida: ${request.title}`,
        message: `Debe firmar el documento en ${orgName}.`,
        data: { signatureRequestId: request.id, signerId: signer.id },
        dedupeKey: `signature:${request.id}:signer:${signer.id}:notify`,
        recipients: [{ userId: u.id, role: NOTIFICATION_RECIPIENT_ROLES.ASSIGNEE }],
        sourceEntityType: 'signature_request',
        sourceEntityId: request.id,
      },
      { sendEmailToDirect: false },
    );
  }

  async listForUser(
    organizationId: string,
    userId: string,
    tab: 'pending' | 'sent' | 'completed' | 'all',
  ): Promise<SignatureRequest[]> {
    const org = { id: organizationId };

    if (tab === 'pending') {
      const sub = await this.em.find(
        SignatureRequestSigner,
        {
          organization: org,
          user: { id: userId },
          status: { $in: [SignerStatus.PENDING, SignerStatus.NOTIFIED] },
        },
        { populate: ['request'] },
      );
      const ids = [...new Set(sub.map((s) => s.request.id).filter(Boolean))] as string[];
      if (!ids.length) return [];
      return this.em.find(
        SignatureRequest,
        { id: { $in: ids }, organization: org },
        { populate: ['document', 'createdBy', 'signers', 'signers.user'], orderBy: { createdAt: 'DESC' } },
      );
    }
    if (tab === 'sent') {
      return this.em.find(
        SignatureRequest,
        { organization: org, createdBy: { id: userId } },
        { populate: ['document', 'createdBy', 'signers', 'signers.user'], orderBy: { createdAt: 'DESC' } },
      );
    }
    if (tab === 'completed') {
      return this.em.find(
        SignatureRequest,
        { organization: org, status: SignatureRequestStatus.COMPLETED },
        { populate: ['document', 'createdBy', 'signers', 'signers.user'], orderBy: { createdAt: 'DESC' } },
      );
    }
    return this.em.find(
      SignatureRequest,
      { organization: org },
      { populate: ['document', 'createdBy', 'signers', 'signers.user'], orderBy: { createdAt: 'DESC' } },
    );
  }

  async getOne(
    id: string,
    organizationId: string,
    userId: string,
    permissions: string[],
  ): Promise<SignatureRequest> {
    const r = await this.em.findOne(
      SignatureRequest,
      { id, organization: organizationId },
      { populate: ['document', 'createdBy', 'signers', 'signers.user'] },
    );
    if (!r) throw new NotFoundException();
    const canViewAll = permissions.includes('signature:view_all');
    const isCreator = r.createdBy?.id === userId;
    const isSigner = r.signers.getItems().some(
      (s) => s.user && (s.user as User).id === userId,
    );
    if (!canViewAll && !isCreator && !isSigner) {
      throw new ForbiddenException();
    }
    return r;
  }

  async sendOtpForSigner(
    signerId: string,
    organizationId: string,
    req: Request,
    opts?: { channel?: 'email' | 'whatsapp' },
  ): Promise<{ ok: boolean }> {
    const s = await this.em.findOne(
      SignatureRequestSigner,
      { id: signerId, organization: organizationId },
      { populate: ['request', 'user'] },
    );
    if (!s) throw new NotFoundException();
    await this.otpService.sendOtp(organizationId, s, req, false, opts);
    return { ok: true };
  }

  async sendOtpExternal(
    plainToken: string,
    req: Request,
    opts?: { channel?: 'email' | 'whatsapp'; phone?: string },
  ): Promise<{ ok: boolean }> {
    const hash = this.tokenService.hashPlainToken(plainToken);
    const s = await this.em.findOne(
      SignatureRequestSigner,
      { tokenHash: hash },
      { filters: false, populate: ['request', 'request.organization', 'user'] } as any,
    );
    if (!s) throw new NotFoundException();
    const orgId = (s.request as any).organization.id as string;
    if (!s.user) {
      const phoneRaw = opts?.phone?.trim();
      if (opts?.channel === 'whatsapp' && !phoneRaw) {
        throw new BadRequestException('Indicá un número de WhatsApp para recibir el código.');
      }
      if (phoneRaw) {
        (s as { externalPhone?: string }).externalPhone = normalizeWhatsAppPhone(phoneRaw);
        await this.em.flush();
      }
    }
    await this.otpService.sendOtp(orgId, s, req, true, { channel: opts?.channel });
    return { ok: true };
  }

  presignedPdfUrl(document: Document, expiry = 3600): Promise<string> {
    const key = document.pdfMinioKey || (document.mimeType?.includes('pdf') ? document.minioKey : null);
    if (!key) throw new BadRequestException('No hay PDF para visualizar.');
    return this.storage.getPresignedUrl(key, expiry);
  }

  /**
   * Re-enqueue DOCX→PDF (e.g. after Gotenberg was down or LibreOffice missing).
   * Caller must be able to see the request (`getOne` rules).
   */
  async retryConversion(
    id: string,
    organizationId: string,
    userId: string,
    permissions: string[],
  ): Promise<{ ok: boolean }> {
    const r = await this.getOne(id, organizationId, userId, permissions);
    const document = r.document;
    if (!document) throw new NotFoundException();

    if (r.status === SignatureRequestStatus.COMPLETED) {
      throw new BadRequestException('La solicitud ya está completada.');
    }
    if (document.pdfMinioKey) {
      throw new BadRequestException('Ya existe un PDF de trabajo para este documento.');
    }
    if (!this.needsDocxConversion(document)) {
      throw new BadRequestException('El documento no requiere conversión DOCX o ya es PDF.');
    }

    r.docxConversionPending = true;
    r.conversionError = undefined;
    if (r.status === SignatureRequestStatus.CANCELLED) {
      r.status = SignatureRequestStatus.DRAFT;
      document.lockedForSigning = true;
    }
    await this.em.flush();
    await this.docxQueue.add('convert-docx-to-pdf', {
      requestId: r.id,
      documentId: document.id,
      organizationId,
    });
    return { ok: true };
  }

  /**
   * Preview URL for internal sign flow. Never throws for "PDF not ready yet" — returns url null + flags
   * so the SPA can poll while DOCX→PDF runs.
   */
  async getPdfPreviewPayload(
    id: string,
    organizationId: string,
    userId: string,
    permissions: string[],
  ): Promise<{ url: string | null; pendingConversion: boolean; conversionError: string | null }> {
    const r = await this.getOne(id, organizationId, userId, permissions);
    const doc = r.document;
    if (!doc) throw new NotFoundException();

    if (r.docxConversionPending) {
      return { url: null, pendingConversion: true, conversionError: r.conversionError ?? null };
    }

    const key = doc.pdfMinioKey || (doc.mimeType?.includes('pdf') ? doc.minioKey : null);
    if (!key) {
      const m = doc.mimeType || '';
      const looksDocx =
        m.includes('wordprocessingml') || doc.filename?.toLowerCase().endsWith('.docx') || false;
      if (looksDocx && r.conversionError) {
        return {
          url: null,
          pendingConversion: false,
          conversionError: r.conversionError,
        };
      }
      return {
        url: null,
        pendingConversion: looksDocx,
        conversionError: looksDocx ? null : 'No hay PDF para visualizar.',
      };
    }

    const url = await this.storage.getPresignedUrl(key, 3600);
    return { url, pendingConversion: false, conversionError: null };
  }

  async getSignedDocumentPresignedUrl(
    id: string,
    organizationId: string,
    userId: string,
    permissions: string[],
  ): Promise<string | null> {
    const r = await this.getOne(id, organizationId, userId, permissions);
    if (!r.documentSignedKey) return null;
    return this.storage.getPresignedUrl(r.documentSignedKey, 3600);
  }

  async cancel(
    id: string,
    organizationId: string,
    userId: string,
    permissions: string[],
  ): Promise<void> {
    const r = await this.em.findOne(
      SignatureRequest,
      { id, organization: organizationId },
      { populate: ['document', 'signers', 'createdBy'] },
    );
    if (!r) throw new NotFoundException();
    const isCreator = (r.createdBy as any)?.id === userId;
    if (!isCreator && !permissions.includes('signature:cancel')) {
      throw new ForbiddenException();
    }
    r.status = SignatureRequestStatus.CANCELLED;
    if (r.document) {
      r.document.lockedForSigning = false;
    }
    await this.em.flush();
  }

  async processSign(
    requestId: string,
    organizationId: string,
    userId: string,
    signerId: string,
    otpCode: string,
    req: Request,
    signatureDataUrl?: string,
    clientSignatureZone?: Pick<SignatureZone, 'page' | 'x' | 'y' | 'width' | 'height'>,
  ): Promise<void> {
    const request = await this.em.findOne(
      SignatureRequest,
      { id: requestId, organization: organizationId },
      { populate: ['document', 'signers', 'signers.user', 'document.uploadedBy'] },
    );
    if (!request) throw new NotFoundException();
    if (request.status !== SignatureRequestStatus.PENDING) {
      throw new BadRequestException('La solicitud no está activa para firmar.');
    }
    const signer = request.signers.getItems().find((s) => s.id === signerId);
    if (!signer) throw new NotFoundException('Firmante no encontrado.');
    if (signer.user && (signer.user as User).id !== userId) {
      throw new ForbiddenException();
    }
    if (!signer.user) {
      throw new BadRequestException('Use el flujo de firma externa.');
    }
    if (request.mode === SignatureMode.SEQUENTIAL) {
      const pending = request.signers
        .getItems()
        .filter((s) => s.status !== SignerStatus.SIGNED)
        .sort((a, b) => a.signerOrder - b.signerOrder)[0];
      if (pending?.id !== signer.id) {
        throw new BadRequestException('Aún no es su turno de firma.');
      }
    }
    if (signer.status === SignerStatus.SIGNED) {
      throw new BadRequestException('Ya firmó.');
    }

    await this.otpService.verifyOtp(organizationId, signer, otpCode, req);

    const doc = request.document;
    if (!doc?.pdfMinioKey) throw new BadRequestException('Falta PDF de trabajo.');

    let imgBuf: Buffer;
    let mime: string;
    if (signatureDataUrl) {
      imgBuf = this.pdfService.dataUrlToPngBuffer(signatureDataUrl);
      mime = 'image/png';
    } else {
      const o = await this.profileService.getSignatureImageForUser(organizationId, userId);
      imgBuf = o.buffer;
      mime = o.mime;
    }

    const pdfBuf = await this.storage.download(doc.pdfMinioKey);
    let zoneToUse: SignatureZone = (signer.signatureZone as SignatureZone) ?? DEFAULT_SIGNATURE_ZONE;
    if (clientSignatureZone) {
      zoneToUse = { ...clientSignatureZone } as SignatureZone;
      (signer as { signatureZone?: SignatureZone }).signatureZone = zoneToUse;
    }
    try {
      await this.pdfService.assertSignatureZoneFits(pdfBuf, zoneToUse);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
    const out = await this.pdfService.stampSignature(pdfBuf, zoneToUse, imgBuf, mime);
    await this.storage.upload(doc.pdfMinioKey, out, 'application/pdf');

    signer.status = SignerStatus.SIGNED;
    signer.signedAt = new Date();
    await this.audit.record(organizationId, signer, SignatureEventType.SIGNATURE_PLACED, req, {
      documentHash: this.pdfService.calculateHash(out),
    });
    await this.em.flush();

    const allDone = request.signers.getItems().every((s) => s.status === SignerStatus.SIGNED);
    if (allDone) {
      await this.finalizeQueue.add('finalize-signature-request', {
        requestId: request.id,
        tenantId: organizationId,
      });
    } else if (request.mode === SignatureMode.SEQUENTIAL) {
      const next = request.signers
        .getItems()
        .filter((s) => s.status === SignerStatus.PENDING)
        .sort((a, b) => a.signerOrder - b.signerOrder)[0];
      const org = await this.em.findOne(Organization, { id: organizationId });
      if (next) {
        const orgName = org?.name ?? 'Alega';
        if (next.user) await this.sendInternalSignNotification(next, request, orgName, organizationId);
        if (next.externalEmail && next.tokenHash) {
          // re-send: cannot recover plain; external already had link — optional resend with new token rotation skipped
        }
        next.status = SignerStatus.NOTIFIED;
        await this.em.flush();
      }
    }
  }

  async getExternalPreview(plainToken: string) {
    const hash = this.tokenService.hashPlainToken(plainToken);
    const signer = await this.em.findOne(
      SignatureRequestSigner,
      { tokenHash: hash },
      {
        populate: ['request', 'request.document', 'request.organization', 'user'],
        filters: false,
      } as any,
    );
    if (!signer) throw new NotFoundException();
    if (signer.tokenExpiresAt && signer.tokenExpiresAt < new Date()) {
      return { valid: false as const, reason: 'expired' as const };
    }
    const req = signer.request;
    const org = (req as any).organization;
    return {
      valid: true as const,
      documentTitle: req.document?.title ?? req.title,
      signerName: signer.externalName || signer.externalEmail || '—',
      organizationName: org?.name ?? 'Alega',
    };
  }

  /** Presigned URL to download the work PDF for external sign (token in query). */
  async getExternalSignPdfUrl(plainToken: string): Promise<{ url: string }> {
    const hash = this.tokenService.hashPlainToken(plainToken);
    const signer = await this.em.findOne(
      SignatureRequestSigner,
      { tokenHash: hash },
      {
        populate: ['request', 'request.document', 'user'],
        filters: false,
      } as any,
    );
    if (!signer) throw new NotFoundException();
    if (signer.user) {
      throw new BadRequestException('Flujo no válido.');
    }
    if (signer.tokenExpiresAt && signer.tokenExpiresAt < new Date()) {
      throw new BadRequestException('Enlace vencido.');
    }
    const r = await this.em.findOne(
      SignatureRequest,
      { id: signer.request.id },
      { populate: ['document'] },
    );
    if (!r || r.status !== SignatureRequestStatus.PENDING) {
      throw new BadRequestException('Solicitud no disponible.');
    }
    if (r.docxConversionPending) {
      throw new BadRequestException('El documento aún se está convirtiendo a PDF.');
    }
    const doc = r.document;
    if (!doc?.pdfMinioKey) {
      throw new BadRequestException('Falta PDF de trabajo.');
    }
    const url = await this.storage.getPresignedUrl(doc.pdfMinioKey, 3600);
    return { url };
  }

  async processExternalSign(
    plainToken: string,
    otpCode: string,
    req: Request,
    signatureDataUrl?: string,
    clientSignatureZone?: Pick<SignatureZone, 'page' | 'x' | 'y' | 'width' | 'height'>,
  ): Promise<void> {
    const hash = this.tokenService.hashPlainToken(plainToken);
    const signer = await this.em.findOne(
      SignatureRequestSigner,
      { tokenHash: hash },
      {
        populate: ['request', 'request.document', 'user'],
        filters: false,
      } as any,
    );
    if (!signer) throw new NotFoundException();
    if (signer.tokenExpiresAt && signer.tokenExpiresAt < new Date()) {
      throw new BadRequestException('Enlace vencido.');
    }
    const request = await this.em.findOne(
      SignatureRequest,
      { id: signer.request.id },
      { populate: ['document', 'signers', 'signers.user'] },
    );
    if (!request || request.status !== SignatureRequestStatus.PENDING) {
      throw new BadRequestException('Solicitud no disponible.');
    }
    const orgId = (request as any).organization.id as string;
    if (signer.user) {
      throw new BadRequestException('Use el flujo interno.');
    }
    if (request.mode === SignatureMode.SEQUENTIAL) {
      const pending = request.signers
        .getItems()
        .filter((s) => s.status !== SignerStatus.SIGNED)
        .sort((a, b) => a.signerOrder - b.signerOrder)[0];
      if (pending?.id !== signer.id) {
        throw new BadRequestException('Aún no es su turno de firma.');
      }
    }

    await this.otpService.verifyOtp(orgId, signer, otpCode, req);

    const doc = request.document;
    if (!doc?.pdfMinioKey) throw new BadRequestException('Falta PDF de trabajo.');

    if (!signatureDataUrl) {
      throw new BadRequestException('Debe trazar o pegar su firma.');
    }
    const imgBuf = this.pdfService.dataUrlToPngBuffer(signatureDataUrl);
    const pdfBuf = await this.storage.download(doc.pdfMinioKey);
    let zoneToUse: SignatureZone = (signer.signatureZone as SignatureZone) ?? DEFAULT_SIGNATURE_ZONE;
    if (clientSignatureZone) {
      zoneToUse = { ...clientSignatureZone } as SignatureZone;
      (signer as { signatureZone?: SignatureZone }).signatureZone = zoneToUse;
    }
    try {
      await this.pdfService.assertSignatureZoneFits(pdfBuf, zoneToUse);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
    const out = await this.pdfService.stampSignature(pdfBuf, zoneToUse, imgBuf, 'image/png');
    await this.storage.upload(doc.pdfMinioKey, out, 'application/pdf');
    signer.status = SignerStatus.SIGNED;
    signer.signedAt = new Date();
    await this.audit.record(orgId, signer, SignatureEventType.SIGNATURE_PLACED, req, {
      documentHash: this.pdfService.calculateHash(out),
    });
    await this.em.flush();

    const allDone = request.signers.getItems().every((s) => s.status === SignerStatus.SIGNED);
    if (allDone) {
      await this.finalizeQueue.add('finalize-signature-request', {
        requestId: request.id,
        tenantId: orgId,
      });
    } else if (request.mode === SignatureMode.SEQUENTIAL) {
      const next = request.signers
        .getItems()
        .filter((s) => s.status === SignerStatus.PENDING)
        .sort((a, b) => a.signerOrder - b.signerOrder)[0];
      const org = await this.em.findOne(Organization, { id: orgId });
      if (next?.user) {
        await this.sendInternalSignNotification(next, request, org?.name ?? 'Alega', orgId);
        next.status = SignerStatus.NOTIFIED;
      } else if (next?.externalEmail) {
        const { plain, hash, expiresAt } = this.tokenService.generateTokenPair();
        next.tokenHash = hash;
        next.tokenExpiresAt = expiresAt;
        const url = `${this.appUrl()}/sign?token=${encodeURIComponent(plain)}`;
        await this.email.sendSignatureRequestEmail(
          next.externalEmail,
          url,
          request.title,
          org?.name ?? 'Alega',
          true,
        );
        next.status = SignerStatus.NOTIFIED;
      }
      await this.em.flush();
    }
  }

  async decline(
    requestId: string,
    organizationId: string,
    userId: string,
    signerId: string,
    reason: string,
    req: Request,
  ): Promise<void> {
    const request = await this.em.findOne(
      SignatureRequest,
      { id: requestId, organization: organizationId },
      { populate: ['document', 'signers', 'signers.user'] },
    );
    if (!request) throw new NotFoundException();
    const signer = request.signers.getItems().find((s) => s.id === signerId);
    if (!signer) throw new NotFoundException();
    if (signer.user && (signer.user as User).id !== userId) throw new ForbiddenException();
    signer.status = SignerStatus.DECLINED;
    request.status = SignatureRequestStatus.CANCELLED;
    if (request.document) request.document.lockedForSigning = false;
    await this.audit.record(organizationId, signer, SignatureEventType.DECLINED, req, { metadata: { reason } });
    await this.em.flush();
  }

  async declineExternal(plainToken: string, reason: string, req: Request): Promise<void> {
    const hash = this.tokenService.hashPlainToken(plainToken);
    const signer = await this.em.findOne(
      SignatureRequestSigner,
      { tokenHash: hash },
      { filters: false, populate: ['request', 'request.document'] } as any,
    );
    if (!signer) throw new NotFoundException();
    const r = await this.em.findOne(
      SignatureRequest,
      { id: signer.request.id },
      { populate: ['document'] },
    );
    if (!r) throw new NotFoundException();
    const orgId = (r as any).organization.id;
    signer.status = SignerStatus.DECLINED;
    r.status = SignatureRequestStatus.CANCELLED;
    if (r.document) r.document.lockedForSigning = false;
    await this.audit.record(orgId, signer, SignatureEventType.DECLINED, req, { metadata: { reason } });
    await this.em.flush();
  }

  async verifyByRequestId(
    requestId: string,
  ): Promise<
    | { found: false }
    | {
        found: true;
        title: string;
        organizationName: string;
        documentHash: string;
        tsa: string | null;
        signers: { name: string; signedAt: string | null }[];
      }
  > {
    const r = await this.em.findOne(
      SignatureRequest,
      { id: requestId, status: SignatureRequestStatus.COMPLETED },
      { populate: ['document', 'signers', 'signers.user', 'organization'], filters: false } as any,
    );
    if (!r) {
      return { found: false };
    }
    const signers = r.signers.getItems().map((s) => ({
      name: s.externalName
        || (s.user
          ? [((s.user as User).firstName), ((s.user as User).lastName)].filter(Boolean).join(' ').trim()
            || (s.user as User).email
          : '—'),
      signedAt: s.signedAt ? s.signedAt.toISOString() : null,
    }));
    return {
      found: true,
      title: r.document?.title ?? r.title,
      organizationName: (r as any).organization?.name ?? '—',
      documentHash: r.documentHashAfter!,
      tsa: r.tsaTimestamp ?? null,
      signers,
    };
  }

  async verifyByHash(
    documentHash: string,
  ): Promise<
    | { found: false }
    | {
        found: true;
        title: string;
        organizationName: string;
        documentHash: string;
        tsa: string | null;
        signers: { name: string; signedAt: string | null }[];
      }
  > {
    const r = await this.em.findOne(
      SignatureRequest,
      { documentHashAfter: documentHash, status: SignatureRequestStatus.COMPLETED },
      { populate: ['document', 'signers', 'signers.user', 'organization'] },
    );
    if (!r) {
      return { found: false };
    }
    const signers = r.signers.getItems().map((s) => ({
      name: s.externalName
        || (s.user
          ? [((s.user as User).firstName), ((s.user as User).lastName)].filter(Boolean).join(' ').trim()
            || (s.user as User).email
          : '—'),
      signedAt: s.signedAt ? s.signedAt.toISOString() : null,
    }));
    return {
      found: true,
      title: r.document?.title ?? r.title,
      organizationName: (r as any).organization?.name ?? '—',
      documentHash: r.documentHashAfter!,
      tsa: r.tsaTimestamp ?? null,
      signers,
    };
  }
}
