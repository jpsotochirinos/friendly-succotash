import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { EntityManager } from '@mikro-orm/postgresql';
import { Queue } from 'bullmq';
import { createHash } from 'node:crypto';
import * as unzipper from 'unzipper';
import {
  ImportAgent,
  ImportBatch,
  ImportItem,
  Organization,
} from '@tracker/db';
import {
  ImportBatchStatus,
  ImportChannel,
  ImportItemStatus,
  PlanTier,
  assertBatchWithinTier,
  getImportCapabilities,
} from '@tracker/shared';
import { google } from 'googleapis';
import { StorageService } from '../storage/storage.service';
import {
  CreateImportBatchDto,
  PatchImportItemDto,
  StartOAuthIngestDto,
} from './dto/create-batch.dto';
import { createUploadToken } from './utils/upload-token';

const STAGING_RETENTION_DAYS = 30;

@Injectable()
export class ImportService {
  private readonly analyzeQueue: Queue;
  private readonly commitQueue: Queue;
  private readonly revertQueue: Queue;
  private readonly driveIngestQueue: Queue;
  private readonly msGraphIngestQueue: Queue;

  constructor(
    private readonly em: EntityManager,
    private readonly storage: StorageService,
  ) {
    const connection = {
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
    };
    this.analyzeQueue = new Queue('import-analyze', { connection });
    this.commitQueue = new Queue('import-commit', { connection });
    this.revertQueue = new Queue('import-revert', { connection });
    this.driveIngestQueue = new Queue('import-drive-ingest', { connection });
    this.msGraphIngestQueue = new Queue('import-ms-graph-ingest', { connection });
  }

  private async resolveOrgTier(organizationId: string): Promise<PlanTier> {
    const org = await this.em.findOne(Organization, { id: organizationId });
    return org?.planTier ?? PlanTier.FREE;
  }

  async createBatch(
    dto: CreateImportBatchDto,
    userId: string,
    organizationId: string,
  ): Promise<{ batch: ImportBatch; uploadToken: string }> {
    const tier = await this.resolveOrgTier(organizationId);
    const cap = getImportCapabilities(tier);

    if (dto.channel === ImportChannel.DESKTOP && !cap.allowDesktopChannel) {
      throw new ForbiddenException('El canal de escritorio requiere un plan superior.');
    }
    if (dto.channel === ImportChannel.ASSISTED && !cap.allowAssistedChannel) {
      throw new ForbiddenException('La migración asistida requiere plan Pro.');
    }

    const expires = new Date();
    expires.setDate(expires.getDate() + STAGING_RETENTION_DAYS);

    const batch = this.em.create(ImportBatch, {
      name: dto.name,
      channel: dto.channel,
      status: ImportBatchStatus.CREATED,
      config: {
        ...(dto.config ?? {}),
        dpaAcceptedAt: (dto.config as any)?.dpaAcceptedAt,
        reportEmail: (dto.config as any)?.reportEmail,
      },
      stagingExpiresAt: expires,
      createdBy: userId,
      organization: organizationId,
    } as any);

    await this.em.flush();
    const uploadToken = createUploadToken(batch.id, organizationId);
    return { batch, uploadToken };
  }

  getReportingInfo(organizationId: string) {
    return this.resolveOrgTier(organizationId).then((tier) => {
      const caps = getImportCapabilities(tier);
      return {
        planTier: tier,
        capabilities: caps,
        dpa: {
          requiredBeforeIngest: true,
          summary:
            'El tratamiento de datos personales en documentos importados queda sujeto al acuerdo de tratamiento (DPA) de su organización.',
        },
        trialAntiAbuse: {
          maxBatchesPerWeekPerUser: 1,
          note: 'Límite orientativo para cuentas trial; configurable en servidor.',
        },
      };
    });
  }

  async listBatches(organizationId: string): Promise<ImportBatch[]> {
    return this.em.find(
      ImportBatch,
      { organization: organizationId } as any,
      { orderBy: { createdAt: 'DESC' } as any },
    );
  }

  async getBatch(id: string, organizationId: string): Promise<ImportBatch> {
    const batch = await this.em.findOne(ImportBatch, { id, organization: organizationId } as any);
    if (!batch) throw new NotFoundException('Lote no encontrado');
    return batch;
  }

  /**
   * Sube un ZIP vía multipart y expande a staging + crea ImportItems.
   */
  async ingestZipMultipart(
    buffer: Buffer,
    batchId: string,
    organizationId: string,
  ): Promise<{ itemsCreated: number }> {
    const batch = await this.getBatch(batchId, organizationId);
    if (
      batch.status !== ImportBatchStatus.CREATED &&
      batch.status !== ImportBatchStatus.INGESTING &&
      batch.status !== ImportBatchStatus.PLAN_READY
    ) {
      throw new BadRequestException('Este lote ya no acepta archivos.');
    }

    const tier = await this.resolveOrgTier(organizationId);
    const cap = getImportCapabilities(tier);

    batch.status = ImportBatchStatus.INGESTING;
    await this.em.flush();

    const directory = await unzipper.Open.buffer(buffer);
    let itemsCreated = 0;
    let totalBytes = 0;
    const seen = new Set<string>();

    for (const file of directory.files) {
      if (file.type === 'Directory') continue;
      const path = file.path.replace(/\\/g, '/');
      if (path.endsWith('/') || !path.length) continue;

      const buf = await file.buffer();
      const sha = createHash('sha256').update(buf).digest('hex');
      if (seen.has(sha)) continue;
      seen.add(sha);

      totalBytes += buf.length;
      const check = assertBatchWithinTier(tier, totalBytes, itemsCreated + 1);
      if (!check.ok) {
        throw new BadRequestException(check.reason);
      }

      const mime = guessMime(path);
      const stagingKey = this.storage.buildStagingKey(organizationId, batchId, path);
      await this.storage.uploadStaging(stagingKey, buf, mime);

      this.em.create(ImportItem, {
        batch: batchId,
        sourcePath: path,
        sha256: sha,
        sizeBytes: String(buf.length),
        mimeDetected: mime,
        stagingKey,
        status: ImportItemStatus.QUEUED,
        organization: organizationId,
      } as any);
      itemsCreated += 1;

    }

    batch.totalItems = itemsCreated;
    batch.status = ImportBatchStatus.ANALYZING;
    await this.em.flush();

    await this.analyzeQueue.add(
      'run',
      { batchId, organizationId },
      { removeOnComplete: 100, removeOnFail: 50 },
    );

    return { itemsCreated };
  }

  async enqueueAnalyze(batchId: string, organizationId: string): Promise<void> {
    await this.getBatch(batchId, organizationId);
    await this.analyzeQueue.add(
      'run',
      { batchId, organizationId },
      { removeOnComplete: 100, removeOnFail: 50 },
    );
  }

  /** Lista carpetas y archivos bajo un padre de Google Drive (para el selector UI). */
  async listDriveFolder(
    batchId: string,
    organizationId: string,
    parentId: string,
  ): Promise<{ id: string; name: string; mimeType: string }[]> {
    const batch = await this.getBatch(batchId, organizationId);
    if (batch.channel !== ImportChannel.OAUTH_DRIVE) {
      throw new BadRequestException('El lote no es de Google Drive.');
    }
    const refresh = (batch.config as any)?.oauth?.google?.refreshToken as string | undefined;
    if (!refresh) {
      throw new BadRequestException('Conecte Google Drive primero (OAuth).');
    }
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new BadRequestException('Google OAuth no está configurado en el servidor.');
    }
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
    oauth2.setCredentials({ refresh_token: refresh });
    const drive = google.drive({ version: 'v3', auth: oauth2 });
    const pid = parentId?.trim() || 'root';
    const out: { id: string; name: string; mimeType: string }[] = [];
    let pageToken: string | undefined;
    do {
      const res = await drive.files.list({
        q: `'${pid}' in parents and trashed=false`,
        fields: 'nextPageToken, files(id,name,mimeType)',
        pageToken,
        pageSize: 200,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });
      for (const f of res.data.files ?? []) {
        if (f.id && f.name && f.mimeType) {
          out.push({ id: f.id, name: f.name, mimeType: f.mimeType });
        }
      }
      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);
    out.sort((a, b) => {
      const fa = a.mimeType === 'application/vnd.google-apps.folder' ? 0 : 1;
      const fb = b.mimeType === 'application/vnd.google-apps.folder' ? 0 : 1;
      if (fa !== fb) return fa - fb;
      return a.name.localeCompare(b.name);
    });
    return out;
  }

  async startDriveIngest(
    batchId: string,
    organizationId: string,
    dto: StartOAuthIngestDto,
  ): Promise<{ ok: boolean }> {
    const batch = await this.getBatch(batchId, organizationId);
    if (batch.channel !== ImportChannel.OAUTH_DRIVE) {
      throw new BadRequestException('El lote no es de Google Drive.');
    }
    const refresh = (batch.config as any)?.oauth?.google?.refreshToken as string | undefined;
    if (!refresh) {
      throw new BadRequestException('Conecte Google Drive primero (OAuth).');
    }
    if (
      batch.status !== ImportBatchStatus.CREATED &&
      batch.status !== ImportBatchStatus.INGESTING &&
      batch.status !== ImportBatchStatus.PLAN_READY
    ) {
      throw new BadRequestException('Este lote ya no acepta ingesta desde Drive.');
    }
    const rootFolderId = dto.rootFolderId?.trim() || 'root';
    await this.driveIngestQueue.add(
      'ingest',
      { batchId, organizationId, rootFolderId },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 80,
      },
    );
    return { ok: true };
  }

  async startMsGraphIngest(
    batchId: string,
    organizationId: string,
    dto: StartOAuthIngestDto,
  ): Promise<{ ok: boolean }> {
    const batch = await this.getBatch(batchId, organizationId);
    const ch = batch.channel;
    if (
      ch !== ImportChannel.OAUTH_ONEDRIVE &&
      ch !== ImportChannel.OAUTH_SHAREPOINT
    ) {
      throw new BadRequestException('El lote no es de OneDrive/SharePoint.');
    }
    const refresh = (batch.config as any)?.oauth?.microsoft?.refreshToken as string | undefined;
    if (!refresh) {
      throw new BadRequestException('Conecte Microsoft (OneDrive/SharePoint) primero.');
    }
    if (
      batch.status !== ImportBatchStatus.CREATED &&
      batch.status !== ImportBatchStatus.INGESTING &&
      batch.status !== ImportBatchStatus.PLAN_READY
    ) {
      throw new BadRequestException('Este lote ya no acepta ingesta.');
    }
    await this.msGraphIngestQueue.add(
      'ingest',
      {
        batchId,
        organizationId,
        mode: dto.mode ?? 'onedrive',
        siteId: dto.siteId,
        rootItemId: dto.rootItemId,
      },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 80,
      },
    );
    return { ok: true };
  }

  async getReview(batchId: string, organizationId: string) {
    await this.getBatch(batchId, organizationId);
    const items = await this.em.find(
      ImportItem,
      { batch: batchId, organization: organizationId } as any,
      {
        orderBy: { sourcePath: 'ASC' } as any,
        populate: ['mappedTrackable', 'mappedDocument'] as any,
      },
    );

    const groups = new Map<string, typeof items>();
    for (const it of items) {
      const k = it.suggestedTrackableKey || 'sin-clasificar';
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(it);
    }

    return {
      batchId,
      groups: [...groups.entries()].map(([key, rows]) => ({
        suggestedTrackableKey: key,
        confidence: rows[0]?.trackableConfidence ?? null,
        items: rows,
      })),
      items,
    };
  }

  async patchItem(
    itemId: string,
    dto: PatchImportItemDto,
    organizationId: string,
  ): Promise<ImportItem> {
    const item = await this.em.findOne(ImportItem, { id: itemId, organization: organizationId } as any);
    if (!item) throw new NotFoundException('Ítem no encontrado');
    if (dto.suggestedTrackableKey !== undefined) {
      item.suggestedTrackableKey = dto.suggestedTrackableKey;
    }
    if (dto.classification) {
      item.classification = {
        ...item.classification,
        ...dto.classification,
      } as any;
    }
    await this.em.flush();
    return item;
  }

  async commitBatch(batchId: string, userId: string, organizationId: string): Promise<void> {
    const batch = await this.getBatch(batchId, organizationId);
    if (
      batch.status !== ImportBatchStatus.READY_FOR_REVIEW &&
      batch.status !== ImportBatchStatus.MAPPING
    ) {
      throw new BadRequestException('El lote no está listo para confirmar.');
    }
    batch.status = ImportBatchStatus.COMMITTING;
    await this.em.flush();
    await this.commitQueue.add(
      'run',
      { batchId, organizationId, userId },
      { removeOnComplete: 50, removeOnFail: 20 },
    );
  }

  async revertBatch(batchId: string, organizationId: string): Promise<void> {
    await this.getBatch(batchId, organizationId);
    await this.revertQueue.add(
      'run',
      { batchId, organizationId },
      { removeOnComplete: 50, removeOnFail: 20 },
    );
  }

  /**
   * Tras TUS: archivo local ya en disco; subir a MinIO staging y registrar como un ZIP o archivo suelto.
   */
  async finalizeTusUpload(params: {
    localPath: string;
    originalName: string;
    batchId: string;
    organizationId: string;
  }): Promise<void> {
    const fs = await import('node:fs/promises');
    const buf = await fs.readFile(params.localPath);
    const lower = params.originalName.toLowerCase();
    if (lower.endsWith('.zip')) {
      await this.ingestZipMultipart(buf, params.batchId, params.organizationId);
      return;
    }
    const batch = await this.getBatch(params.batchId, params.organizationId);
    const ingestible =
      batch.status === ImportBatchStatus.CREATED ||
      batch.status === ImportBatchStatus.PLAN_READY ||
      batch.status === ImportBatchStatus.INGESTING;
    if (!ingestible) {
      throw new BadRequestException('Este lote ya no acepta archivos.');
    }
    const tier = await this.resolveOrgTier(params.organizationId);
    const sha = createHash('sha256').update(buf).digest('hex');
    const mime = guessMime(params.originalName);
    const stagingKey = this.storage.buildStagingKey(
      params.organizationId,
      params.batchId,
      params.originalName,
    );
    await this.storage.uploadStaging(stagingKey, buf, mime);

    const dup = await this.em.count(ImportItem, {
      batch: params.batchId,
      sha256: sha,
    } as any);
    if (dup > 0) return;

    const check = assertBatchWithinTier(tier, buf.length, batch.totalItems + 1);
    if (!check.ok) throw new BadRequestException(check.reason);

    this.em.create(ImportItem, {
      batch: params.batchId,
      sourcePath: params.originalName,
      sha256: sha,
      sizeBytes: String(buf.length),
      mimeDetected: mime,
      stagingKey,
      status: ImportItemStatus.QUEUED,
      organization: params.organizationId,
    } as any);
    batch.totalItems += 1;
    batch.status = ImportBatchStatus.ANALYZING;
    await this.em.flush();
    await this.analyzeQueue.add(
      'run',
      { batchId: params.batchId, organizationId: params.organizationId },
      { removeOnComplete: 100, removeOnFail: 50 },
    );
  }

  async registerImportAgent(
    userId: string,
    organizationId: string,
    dto: { label?: string },
  ): Promise<{ agentId: string; agentToken: string }> {
    const secret = randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(secret, 10);
    const agent = this.em.create(ImportAgent, {
      user: userId,
      organization: organizationId,
      label: dto.label,
      tokenHash,
    } as any);
    await this.em.flush();
    const payload = JSON.stringify({ i: agent.id, s: secret });
    const agentToken = Buffer.from(payload, 'utf8').toString('base64url');
    return { agentId: agent.id, agentToken };
  }

  async heartbeatImportAgent(
    agentToken: string | undefined,
    body: { stats?: Record<string, unknown> },
  ): Promise<{ ok: boolean }> {
    if (!agentToken?.trim()) {
      throw new UnauthorizedException('Token de agente requerido');
    }
    let parsed: { i: string; s: string };
    try {
      const raw = Buffer.from(agentToken.trim(), 'base64url').toString('utf8');
      parsed = JSON.parse(raw) as { i: string; s: string };
    }
    catch {
      throw new UnauthorizedException('Token inválido');
    }
    const agent = await this.em.findOne(
      ImportAgent,
      { id: parsed.i } as any,
      { filters: false },
    );
    if (!agent) {
      throw new UnauthorizedException('Agente no encontrado');
    }
    const ok = await bcrypt.compare(parsed.s, agent.tokenHash);
    if (!ok) {
      throw new UnauthorizedException('Token inválido');
    }
    agent.lastHeartbeatAt = new Date();
    if (body.stats) {
      agent.lastStats = body.stats;
    }
    await this.em.flush();
    return { ok: true };
  }
}

function guessMime(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    txt: 'text/plain',
    eml: 'message/rfc822',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
  };
  return map[ext] || 'application/octet-stream';
}
