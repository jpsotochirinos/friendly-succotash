import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import {
  ActivityLog,
  Document,
  DocumentVersion,
  DocumentWorkflowParticipation,
  Evaluation,
  Folder,
  Organization,
  WorkflowItem,
  StageInstance,
  ProcessTrack,
  ActivityInstance,
} from '@tracker/db';
import {
  DocumentReviewStatus,
  checkSpelling,
  validateCitations,
  analyzeCoherence,
  validateReferences,
  normalizeDocumentTrashRetentionDays,
  DomainEvents,
} from '@tracker/shared';
import { StorageService } from '../storage/storage.service';
import { LlmService } from '../llm/llm.service';
import { SearchService } from '../search/search.service';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { BlueprintResolverService } from '../blueprints/blueprint-resolver.service';
import {
  plainTextOrMarkdownToHtml,
  renderHtmlAsDocx,
  stripHtmlToPlain,
} from './docx-renderer.util';

export interface EvalLogStep {
  name: string;
  label: string;
  status: 'passed' | 'failed' | 'skipped';
  score: number | null;
  summary: string;
  details: Record<string, unknown>;
}

/** Compartir por WA: binario en MinIO o render DOCX on-the-fly desde `contentText`. */
export type WhatsAppShareMetadata =
  | { kind: 'minio'; minioKey: string; filename: string; mimeType: string; bytes: number }
  | { kind: 'rendered'; filename: string; mimeType: string; bytes: number };

@Injectable()
export class DocumentsService extends BaseCrudService<Document> {
  private readonly evaluationQueue: Queue;

  constructor(
    em: EntityManager,
    private readonly storage: StorageService,
    private readonly llm: LlmService,
    private readonly search: SearchService,
    private readonly eventEmitter: EventEmitter2,
    private readonly blueprintResolver: BlueprintResolverService,
  ) {
    super(em, Document);
    this.evaluationQueue = new Queue('document-evaluation', {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
      },
    });
  }

  async uploadDocument(
    file: Express.Multer.File,
    data: {
      title: string;
      folderId: string;
      workflowItemId?: string;
      activityInstanceId?: string;
      /** When set, document is linked to the process-track stage and must match `trackableId` via the stage's process track. */
      classifiedStageInstanceId?: string;
      trackableId: string;
      organizationId: string;
      userId: string;
      isTemplate?: boolean;
    },
  ): Promise<Document> {
    let classifiedStage: StageInstance | undefined;
    if (data.classifiedStageInstanceId) {
      const si = await this.em.findOne(
        StageInstance,
        { id: data.classifiedStageInstanceId, organization: data.organizationId } as any,
        { populate: ['processTrack', 'processTrack.trackable'] as any },
      );
      if (!si) {
        throw new NotFoundException('Stage instance not found');
      }
      const pt = si.processTrack as ProcessTrack;
      const tid =
        (pt.trackable as { id?: string } | undefined)?.id
        ?? (typeof (pt as any).trackable === 'string' ? (pt as any).trackable : undefined);
      if (tid !== data.trackableId) {
        throw new BadRequestException('Stage does not belong to this trackable');
      }
      classifiedStage = si;
    }

    const key = this.storage.buildKey(
      data.organizationId,
      data.trackableId,
      `folder-${data.folderId}`,
      `${Date.now()}-${file.originalname}`,
    );

    await this.storage.upload(key, file.buffer, file.mimetype);

    const doc = this.em.create(Document, {
      title: data.title,
      filename: file.originalname,
      mimeType: file.mimetype,
      minioKey: key,
      currentVersion: 1,
      reviewStatus: DocumentReviewStatus.DRAFT,
      isTemplate: data.isTemplate || false,
      folder: data.folderId,
      workflowItem: data.workflowItemId && !data.activityInstanceId ? data.workflowItemId : undefined,
      uploadedBy: data.userId,
      organization: data.organizationId,
      classifiedStageInstance: classifiedStage,
    } as any);

    const version = this.em.create(DocumentVersion, {
      document: doc,
      versionNumber: 1,
      minioKey: key,
      fileSize: file.size,
      createdBy: data.userId,
    } as any);

    await this.em.flush();
    if (data.activityInstanceId) {
      await this.applyActivityInstanceLink(doc, data.activityInstanceId, data.organizationId);
      await this.em.flush();
    } else if (data.workflowItemId) {
      await this.appendParticipationForNewLink(doc.id, data.workflowItemId, data.organizationId, doc.currentVersion);
    }
    this.emitDocumentEvent(DomainEvents.DOCUMENT_CREATED, {
      documentId: doc.id,
      organizationId: data.organizationId,
      trackableId: data.trackableId,
      workflowItemId: data.workflowItemId ?? null,
      userId: data.userId,
    });
    return doc;
  }

  async createNewVersion(
    documentId: string,
    file: Express.Multer.File,
    userId: string,
    organizationId: string,
  ): Promise<DocumentVersion> {
    const doc = await this.findOne(documentId, { populate: ['folder', 'folder.trackable', 'workflowItem'] as any });
    const nextVersion = doc.currentVersion + 1;

    const key = this.storage.buildKey(
      organizationId,
      (doc.folder as any)?.trackable?.id || 'unknown',
      `folder-${doc.folder?.id}`,
      `v${nextVersion}-${file.originalname}`,
    );

    await this.storage.upload(key, file.buffer, file.mimetype);

    doc.currentVersion = nextVersion;
    doc.minioKey = key;
    doc.filename = file.originalname;

    const version = this.em.create(DocumentVersion, {
      document: doc,
      versionNumber: nextVersion,
      minioKey: key,
      fileSize: file.size,
      createdBy: userId,
    } as any);

    await this.em.flush();
    const trackableId = (doc.folder as any)?.trackable?.id as string | undefined;
    const wi = doc.workflowItem as WorkflowItem | undefined;
    const workflowItemId =
      wi && typeof wi === 'object' && 'id' in wi ? (wi as WorkflowItem).id : ((doc as any).workflowItem as string | undefined) ?? null;
    this.emitDocumentEvent(DomainEvents.DOCUMENT_UPLOADED, {
      documentId: doc.id,
      organizationId,
      trackableId,
      workflowItemId,
      userId,
    });
    return version;
  }

  async downloadDocument(documentId: string): Promise<{
    buffer: Buffer;
    filename: string;
    mimeType: string;
  }> {
    const doc = await this.findOne(documentId);
    const buffer = await this.storage.download(doc.minioKey!);
    return {
      buffer,
      filename: doc.filename || 'download',
      mimeType: doc.mimeType || 'application/octet-stream',
    };
  }

  async downloadDocumentBuffer(documentId: string): Promise<Buffer> {
    const doc = await this.findOne(documentId);
    return this.storage.download(doc.minioKey!);
  }

  /** Metadatos para compartir por WhatsApp (tamaño vía MinIO, o render DOCX si solo hay `contentText`). */
  async getShareMetadataForWhatsApp(
    documentId: string,
    organizationId: string,
  ): Promise<WhatsAppShareMetadata | null> {
    const fork = this.em.fork();
    fork.setFilterParams('tenant', { organizationId });
    const doc = await fork.findOne(Document, { id: documentId });
    if (!doc) return null;

    if (doc.minioKey) {
      const ver = await fork.findOne(DocumentVersion, {
        document: documentId,
        versionNumber: doc.currentVersion,
      });
      let bytes = ver?.fileSize != null ? Number(ver.fileSize) : NaN;
      if (!Number.isFinite(bytes) || bytes < 0) {
        const stat = await this.storage.statObject(doc.minioKey);
        bytes = stat.size;
      }
      return {
        kind: 'minio',
        minioKey: doc.minioKey,
        filename: doc.filename || doc.title || 'document',
        mimeType: doc.mimeType || 'application/octet-stream',
        bytes,
      };
    }

    const raw = doc.contentText?.trim();
    if (!raw) return null;

    const buffer = await renderHtmlAsDocx(
      plainTextOrMarkdownToHtml(doc.contentText ?? ''),
      doc.title || 'Documento',
    );
    const base = (doc.title || 'documento')
      .replace(/[/\\?%*:|"<>]/g, '-')
      .trim()
      .slice(0, 180) || 'documento';
    return {
      kind: 'rendered',
      filename: `${base}.docx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      bytes: buffer.length,
    };
  }

  async getVersions(documentId: string): Promise<DocumentVersion[]> {
    return this.em.find(DocumentVersion, { document: documentId }, {
      orderBy: { versionNumber: 'DESC' } as any,
      populate: ['createdBy'] as any,
    });
  }

  async copyAsTemplate(
    sourceDocId: string,
    targetFolderId: string,
    targetWorkflowItemId: string | undefined,
    userId: string,
    organizationId: string,
    trackableId: string,
    targetActivityInstanceId?: string,
  ): Promise<Document> {
    const sourceDoc = await this.findOne(sourceDocId);
    const sourceBuffer = await this.storage.download(sourceDoc.minioKey!);

    const newKey = this.storage.buildKey(
      organizationId,
      trackableId,
      `folder-${targetFolderId}`,
      `${Date.now()}-copy-${sourceDoc.filename}`,
    );

    await this.storage.upload(newKey, sourceBuffer, sourceDoc.mimeType || 'application/octet-stream');

    const newDoc = this.em.create(Document, {
      title: `${sourceDoc.title} (copia)`,
      filename: sourceDoc.filename,
      mimeType: sourceDoc.mimeType,
      minioKey: newKey,
      currentVersion: 1,
      reviewStatus: DocumentReviewStatus.DRAFT,
      isTemplate: false,
      folder: targetFolderId,
      workflowItem: targetWorkflowItemId && !targetActivityInstanceId ? targetWorkflowItemId : undefined,
      uploadedBy: userId,
      organization: organizationId,
      contentText: sourceDoc.contentText,
    } as any);

    this.em.create(DocumentVersion, {
      document: newDoc,
      versionNumber: 1,
      minioKey: newKey,
      createdBy: userId,
    } as any);

    await this.em.flush();
    if (targetActivityInstanceId) {
      const d = await this.findOne(newDoc.id, { populate: ['folder', 'folder.trackable'] as any });
      await this.applyActivityInstanceLink(d, targetActivityInstanceId, organizationId);
      await this.em.flush();
    } else if (targetWorkflowItemId) {
      await this.appendParticipationForNewLink(newDoc.id, targetWorkflowItemId, organizationId, newDoc.currentVersion);
    }
    this.emitDocumentEvent(DomainEvents.DOCUMENT_CREATED, {
      documentId: newDoc.id,
      organizationId,
      trackableId,
      workflowItemId: targetWorkflowItemId ?? null,
      userId,
    });
    return newDoc;
  }

  async saveEditorContent(
    documentId: string,
    dto: { editorContent: Record<string, unknown>; contentText?: string },
    userId: string,
    organizationId: string,
  ): Promise<Document> {
    const doc = await this.findOne(documentId, { populate: ['folder', 'folder.trackable', 'workflowItem'] as any });

    const prevLen = doc.contentText?.length ?? 0;

    const jsonBuffer = Buffer.from(JSON.stringify(dto.editorContent));
    const editorKey = this.storage.buildKey(
      organizationId,
      (doc.folder as any)?.trackable?.id || 'unknown',
      `folder-${doc.folder?.id}`,
      `editor-${doc.id}-v${doc.currentVersion + 1}.json`,
    );

    await this.storage.upload(editorKey, jsonBuffer, 'application/json');

    doc.currentVersion += 1;
    if (dto.contentText) {
      doc.contentText = dto.contentText;
    }
    doc.reviewStatus = DocumentReviewStatus.DRAFT;

    this.em.create(DocumentVersion, {
      document: doc,
      versionNumber: doc.currentVersion,
      minioKey: editorKey,
      editorContent: dto.editorContent,
      createdBy: userId,
    } as any);

    await this.em.flush();
    const newLen = doc.contentText?.length ?? 0;
    const trackableId = (doc.folder as any)?.trackable?.id as string | undefined;
    const wi = doc.workflowItem as WorkflowItem | undefined;
    const workflowItemId =
      wi && typeof wi === 'object' && 'id' in wi ? (wi as WorkflowItem).id : ((doc as any).workflowItem as string | undefined) ?? null;
    this.emitDocumentEvent(DomainEvents.DOCUMENT_UPDATED, {
      documentId: doc.id,
      organizationId,
      trackableId,
      workflowItemId,
      userId,
      contentLengthDelta: Math.max(0, newLen - prevLen),
    });
    return doc;
  }

  /**
   * Patch document fields including optional workflow link (validates same trackable / org).
   */
  async patchDocument(
    id: string,
    dto: {
      title?: string;
      reviewStatus?: string;
      isTemplate?: boolean;
      tags?: string[];
      workflowItemId?: string | null;
      activityInstanceId?: string | null;
    },
    organizationId: string,
  ): Promise<Document> {
    const doc = await this.findOne(id, { populate: ['folder', 'folder.trackable', 'workflowItem', 'activityInstance'] as any });
    if ((doc as any).organization?.id && (doc as any).organization.id !== organizationId) {
      throw new NotFoundException('Document not found');
    }

    if ('workflowItemId' in dto) {
      const nextWi = dto.workflowItemId ?? null;
      const wiRaw = (doc as any).workflowItem;
      let curWi: string | null = null;
      if (wiRaw != null) {
        curWi = typeof wiRaw === 'string' ? wiRaw : (wiRaw as WorkflowItem).id;
      }
      if (nextWi !== curWi) {
        await this.applyWorkflowItemLink(doc, nextWi, organizationId);
      }
    }
    if ('activityInstanceId' in dto) {
      const nextAi = dto.activityInstanceId ?? null;
      const aiRaw = (doc as any).activityInstance;
      let curAi: string | null = null;
      if (aiRaw != null) {
        curAi = typeof aiRaw === 'string' ? aiRaw : (aiRaw as { id: string }).id;
      }
      if (nextAi !== curAi) {
        await this.applyActivityInstanceLink(doc, nextAi, organizationId);
      }
    }
    if (dto.title !== undefined) (doc as any).title = dto.title;
    if (dto.reviewStatus !== undefined) (doc as any).reviewStatus = dto.reviewStatus;
    if (dto.isTemplate !== undefined) (doc as any).isTemplate = dto.isTemplate;
    if (dto.tags !== undefined) (doc as any).tags = dto.tags;

    await this.em.flush();
    const refreshed = await this.findOne(id, { populate: ['folder', 'folder.trackable', 'workflowItem', 'activityInstance'] as any });
    const trackableId = (refreshed.folder as any)?.trackable?.id as string | undefined;
    const wi = refreshed.workflowItem as WorkflowItem | undefined;
    const workflowItemId =
      wi && typeof wi === 'object' && 'id' in wi
        ? (wi as WorkflowItem).id
        : ((refreshed as any).workflowItem as string | undefined) ?? null;
    this.emitDocumentEvent(DomainEvents.DOCUMENT_UPDATED, {
      documentId: refreshed.id,
      organizationId,
      trackableId,
      workflowItemId,
      contentLengthDelta: 0,
      patchedFields: Object.keys(dto).filter((k) => (dto as any)[k] !== undefined),
    });
    return refreshed;
  }

  async linkWorkflowItem(
    documentId: string,
    body: { workflowItemId?: string | null; activityInstanceId?: string | null },
    organizationId: string,
  ): Promise<Document> {
    const dto: {
      title?: string;
      reviewStatus?: string;
      isTemplate?: boolean;
      tags?: string[];
      workflowItemId?: string | null;
      activityInstanceId?: string | null;
    } = {};
    if ('workflowItemId' in body) dto.workflowItemId = body.workflowItemId;
    if ('activityInstanceId' in body) dto.activityInstanceId = body.activityInstanceId;
    if (Object.keys(dto).length === 0) {
      return this.findOne(documentId, {
        populate: ['folder', 'folder.trackable', 'workflowItem', 'activityInstance'] as any,
      });
    }
    return this.patchDocument(documentId, dto, organizationId);
  }

  async getWorkflowHistory(documentId: string, organizationId: string) {
    const doc = await this.em.findOne(Document, { id: documentId, organization: organizationId } as any);
    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    const rows = await this.em.find(
      DocumentWorkflowParticipation,
      { document: documentId, organization: organizationId } as any,
      {
        orderBy: { startedAt: 'DESC' } as any,
        populate: ['workflowItem'] as any,
      },
    );

    const wis = rows.map((r) => r.workflowItem).filter(Boolean) as WorkflowItem[];
    if (wis.length) await this.em.populate(wis, ['currentState'] as any);

    return rows.map((row) => {
      const wi = row.workflowItem as WorkflowItem | undefined;
      const stateKey = (wi?.currentState as { key?: string } | undefined)?.key ?? null;
      return {
        id: row.id,
        startedAt: row.startedAt,
        endedAt: row.endedAt ?? null,
        versionAtStart: row.versionAtStart ?? null,
        workflowItem: wi
          ? {
              id: wi.id,
              title: wi.title,
              kind: wi.kind ?? null,
              status: stateKey,
              startDate: wi.startDate ?? null,
              dueDate: wi.dueDate ?? null,
            }
          : null,
      };
    });
  }

  private async applyWorkflowItemLink(
    doc: Document,
    workflowItemId: string | null,
    organizationId: string,
  ): Promise<void> {
    await this.closeOpenParticipations(doc.id, organizationId);

    if (!workflowItemId) {
      (doc as any).workflowItem = undefined;
      (doc as any).activityInstance = undefined;
      return;
    }

    const wi = await this.em.findOne(
      WorkflowItem,
      { id: workflowItemId, organization: organizationId } as any,
      { populate: ['trackable'] as any },
    );
    if (!wi) {
      throw new BadRequestException('La actividad no existe o no pertenece a la organización.');
    }

    const folder = doc.folder as { trackable?: { id: string } } | undefined;
    const trackableId = folder?.trackable?.id;
    const wiTrackableId = (wi as any).trackable?.id ?? (wi as any).trackable;
    if (folder && trackableId && wiTrackableId && trackableId !== wiTrackableId) {
      throw new BadRequestException('La actividad debe pertenecer al mismo expediente que la carpeta del documento.');
    }

    (doc as any).activityInstance = undefined;
    (doc as any).workflowItem = wi;
    this.em.create(DocumentWorkflowParticipation, {
      document: doc,
      workflowItem: wi,
      startedAt: new Date(),
      endedAt: null,
      versionAtStart: doc.currentVersion,
      organization: organizationId,
    } as any);
  }

  private async applyActivityInstanceLink(
    doc: Document,
    activityInstanceId: string | null,
    organizationId: string,
  ): Promise<void> {
    await this.closeOpenParticipations(doc.id, organizationId);

    if (!activityInstanceId) {
      (doc as any).activityInstance = undefined;
      return;
    }

    const act = await this.em.findOne(
      ActivityInstance,
      { id: activityInstanceId, organization: organizationId } as any,
      { populate: ['trackable'] as any },
    );
    if (!act) {
      throw new BadRequestException('La actividad no existe o no pertenece a la organización.');
    }

    let folder = doc.folder as { id?: string; trackable?: { id: string } } | string | undefined;
    if (typeof folder === 'string') {
      const f = await this.em.findOne(Folder, { id: folder, organization: organizationId } as any, {
        populate: ['trackable'] as any,
      });
      (doc as any).folder = f;
      folder = f as any;
    } else if (folder && typeof folder === 'object' && folder.id && !(folder as any).trackable) {
      await this.em.populate(doc, ['folder', 'folder.trackable'] as any);
      folder = doc.folder as any;
    }

    const trackableId = (folder as any)?.trackable?.id ?? (folder as any)?.trackable;
    const actTid = (act as any).trackable?.id ?? (act as any).trackable;
    if (trackableId && actTid && String(trackableId) !== String(actTid)) {
      throw new BadRequestException('La actividad debe pertenecer al mismo expediente que la carpeta del documento.');
    }

    (doc as any).workflowItem = undefined;
    (doc as any).activityInstance = act;
  }

  private async closeOpenParticipations(documentId: string, organizationId: string): Promise<void> {
    const open = await this.em.find(DocumentWorkflowParticipation, {
      document: documentId,
      organization: organizationId,
      endedAt: null,
    } as any);
    const now = new Date();
    for (const row of open) {
      row.endedAt = now;
    }
  }

  private async appendParticipationForNewLink(
    documentId: string,
    workflowItemId: string,
    organizationId: string,
    versionAtStart: number,
  ): Promise<void> {
    const wi = await this.em.findOne(WorkflowItem, { id: workflowItemId, organization: organizationId } as any);
    if (!wi) return;

    this.em.create(DocumentWorkflowParticipation, {
      document: documentId,
      workflowItem: workflowItemId,
      startedAt: new Date(),
      endedAt: null,
      versionAtStart,
      organization: organizationId,
    } as any);
    await this.em.flush();
  }

  async submitForReview(
    documentId: string,
    organizationId: string,
    userId: string,
  ): Promise<{ message: string; documentId: string }> {
    const doc = await this.findOne(documentId, { populate: ['folder', 'folder.trackable', 'workflowItem'] as any });
    doc.reviewStatus = DocumentReviewStatus.SUBMITTED;
    await this.em.flush();

    const trackableId = (doc.folder as any)?.trackable?.id as string | undefined;
    const wi = doc.workflowItem as WorkflowItem | undefined;
    const workflowItemId =
      wi && typeof wi === 'object' && 'id' in wi ? (wi as WorkflowItem).id : ((doc as any).workflowItem as string | undefined) ?? null;
    this.emitDocumentEvent(DomainEvents.DOCUMENT_SUBMITTED, {
      documentId: doc.id,
      organizationId,
      trackableId,
      workflowItemId,
      userId,
    });

    const config = {
      spellCheckEnabled: true,
      citationCheckEnabled: true,
      coherenceCheckEnabled: true,
      referenceCheckEnabled: false,
      similarityThreshold: 0.6,
    };

    await this.runInlineEvaluation(doc, config);

    this.tryEnqueueForWorker(doc.id, config);

    return {
      message: 'Evaluación completada.',
      documentId: doc.id,
    };
  }

  async enqueueEvaluation(documentId: string): Promise<{ message: string; documentId: string }> {
    const doc = await this.findOne(documentId);
    const config = {
      spellCheckEnabled: true,
      citationCheckEnabled: true,
      coherenceCheckEnabled: true,
      referenceCheckEnabled: false,
      similarityThreshold: 0.6,
    };

    await this.runInlineEvaluation(doc, config);

    this.tryEnqueueForWorker(doc.id, config);

    return { message: 'Evaluación completada.', documentId: doc.id };
  }

  private tryEnqueueForWorker(documentId: string, config: Record<string, unknown>) {
    this.evaluationQueue.add('evaluate', { documentId, config }).catch(() => {});
  }

  private async runInlineEvaluation(
    doc: any,
    config: {
      spellCheckEnabled: boolean;
      citationCheckEnabled: boolean;
      coherenceCheckEnabled: boolean;
      referenceCheckEnabled: boolean;
      similarityThreshold: number;
    },
  ) {
    const text: string = doc.contentText || '';
    const evaluationDetails: Record<string, unknown> = {};
    let totalScore = 0;
    let checksRun = 0;

    if (config.spellCheckEnabled) {
      const result = await checkSpelling(text);
      evaluationDetails.spelling = { ...result, label: 'Ortografía (Español)' };
      totalScore += result.accuracy;
      checksRun++;
    }

    if (config.citationCheckEnabled) {
      const result = validateCitations(text);
      evaluationDetails.citations = { ...result, label: 'Citas y referencias' };
      totalScore += result.score;
      checksRun++;
    }

    if (config.coherenceCheckEnabled) {
      const result = await analyzeCoherence(text);
      evaluationDetails.coherence = { ...result, label: 'Coherencia textual' };
      totalScore += result.score;
      checksRun++;
    }

    if (config.referenceCheckEnabled) {
      const result = validateReferences(text);
      evaluationDetails.references = { ...result, label: 'Referencias' };
      totalScore += result.formatScore;
      checksRun++;
    }

    const finalScore = checksRun > 0 ? totalScore / checksRun : 0;
    const threshold = config.similarityThreshold;
    const passed = finalScore >= threshold;

    this.em.create('Evaluation' as any, {
      document: doc.id,
      type: 'quality_check',
      score: finalScore,
      threshold,
      result: passed ? 'passed' : 'failed',
      details: evaluationDetails,
    } as any);

    doc.evaluationScore = finalScore;
    doc.reviewStatus = passed ? 'in_review' : 'revision_needed';

    await this.em.flush();
  }

  async findReviewQueue(organizationId: string): Promise<Document[]> {
    return this.em.find(
      Document,
      {
        reviewStatus: {
          $in: [
            DocumentReviewStatus.SUBMITTED,
            DocumentReviewStatus.IN_REVIEW,
            DocumentReviewStatus.APPROVED,
            DocumentReviewStatus.REVISION_NEEDED,
          ],
        },
        deletedAt: null,
        organization: organizationId,
      } as any,
      {
        populate: ['folder', 'folder.trackable', 'workflowItem', 'uploadedBy', 'evaluations'] as any,
        orderBy: { updatedAt: 'DESC' } as any,
      },
    );
  }

  async getEvaluations(documentId: string): Promise<Evaluation[]> {
    return this.em.find(Evaluation, { document: documentId }, {
      orderBy: { createdAt: 'DESC' } as any,
    });
  }

  async getEvaluationLog(documentId: string, evaluationId?: string) {
    const where: any = { document: documentId };
    if (evaluationId) where.id = evaluationId;

    const evaluation = await this.em.findOne('Evaluation', where, {
      orderBy: { createdAt: 'DESC' } as any,
    }) as any;

    if (!evaluation) return null;

    const details = evaluation.details || {};
    const steps = this.buildLogSteps(details);
    const checksCount = steps.filter(s => s.status !== 'skipped').length;
    const passed = evaluation.result === 'passed';
    const scorePercent = Math.round(evaluation.score * 100);
    const thresholdPercent = Math.round(evaluation.threshold * 100);

    const checkNames = steps
      .filter(s => s.status !== 'skipped')
      .map(s => s.label.toLowerCase());
    let checkList = 'ninguno';
    if (checkNames.length === 1) {
      checkList = checkNames[0];
    } else if (checkNames.length > 1) {
      const last = checkNames.at(-1);
      checkList = checkNames.slice(0, -1).join(', ') + ' y ' + last;
    }

    const narrativeSummary = `La evaluación del documento obtuvo un puntaje de ${scorePercent}% (umbral requerido: ${thresholdPercent}%). ${
      passed
        ? 'El documento cumple con los criterios mínimos de calidad.'
        : 'El documento no cumple con los criterios mínimos y requiere revisión.'
    } Se evaluaron ${checksCount} criterios: ${checkList}.`;

    return {
      documentId,
      evaluationId: evaluation.id,
      evaluatedAt: evaluation.createdAt,
      overallScore: evaluation.score,
      threshold: evaluation.threshold,
      passed,
      verdict: passed ? 'Aprobado' : 'Necesita revisión',
      narrativeSummary,
      steps,
    };
  }

  private buildLogSteps(details: Record<string, any>) {
    const steps: EvalLogStep[] = [];
    if (details.spelling) steps.push(this.buildSpellingStep(details.spelling));
    if (details.citations) steps.push(this.buildCitationsStep(details.citations));
    if (details.coherence) steps.push(this.buildCoherenceStep(details.coherence));
    if (details.references) steps.push(this.buildReferencesStep(details.references));
    if (details.structure) steps.push(this.buildStructureStep(details.structure));
    return steps;
  }

  private buildSpellingStep(s: any): EvalLogStep {
    const accuracy = Math.round(s.accuracy * 100);
    return {
      name: 'spelling',
      label: 'Ortografía',
      status: s.accuracy >= 0.9 ? 'passed' : 'failed',
      score: s.accuracy,
      summary: `Se revisaron ${s.totalWords} palabras. Se encontraron ${s.misspelledCount} errores ortográficos. Precisión: ${accuracy}%.`,
      details: {
        misspelledWords: s.misspelledWords || [],
        suggestions: s.suggestions || {},
      },
    };
  }

  private buildCitationsStep(c: any): EvalLogStep {
    const densityNote = c.citationDensity != null ? ` Densidad: ${c.citationDensity} citas/1000 palabras.` : '';
    const bibNote = c.hasBibliography ? ' Se encontró sección de bibliografía.' : '';
    return {
      name: 'citations',
      label: 'Citas y referencias',
      status: c.score >= 0.7 ? 'passed' : 'failed',
      score: c.score,
      summary: `Se encontraron ${c.totalCitations} citas en el documento. ${c.validCitations} válidas, ${c.invalidCitations?.length || 0} inválidas.${densityNote}${bibNote}`,
      details: {
        citationsFound: c.citationsFound || [],
        invalidCitations: c.invalidCitations || [],
        duplicateCitations: c.duplicateCitations || [],
        hasBibliography: c.hasBibliography ?? false,
        citationDensity: c.citationDensity ?? null,
      },
    };
  }

  private buildCoherenceStep(co: any): EvalLogStep {
    let summary = `El documento tiene ${co.paragraphCount} párrafos con un promedio de ${co.avgParagraphLength} palabras.`;
    if (co.sentenceCount) {
      summary += ` ${co.sentenceCount} oraciones (promedio ${co.avgSentenceLength} palabras).`;
    }
    if (co.transitionWordCount != null) {
      summary += ` ${co.transitionWordCount} conectores lógicos encontrados.`;
    }
    if (co.vocabularyDiversity != null) {
      summary += ` Diversidad léxica: ${Math.round(co.vocabularyDiversity * 100)}%.`;
    }
    if (co.issues?.length) {
      summary += ` Problemas: ${co.issues.join('; ')}.`;
    }
    return {
      name: 'coherence',
      label: 'Coherencia',
      status: co.score >= 0.7 ? 'passed' : 'failed',
      score: co.score,
      summary,
      details: {
        issues: co.issues || [],
        suggestions: co.suggestions || [],
        sentenceCount: co.sentenceCount ?? null,
        transitionWordCount: co.transitionWordCount ?? null,
        vocabularyDiversity: co.vocabularyDiversity ?? null,
      },
    };
  }

  private buildReferencesStep(r: any): EvalLogStep {
    let summary = `Se encontraron ${r.totalReferences} referencias.`;
    if (r.outdatedReferences?.length) {
      summary += ` ${r.outdatedReferences.length} desactualizadas.`;
    }
    return {
      name: 'references',
      label: 'Referencias',
      status: (r.outdatedReferences?.length || 0) === 0 ? 'passed' : 'failed',
      score: r.formatScore ?? null,
      summary,
      details: {
        outdatedReferences: r.outdatedReferences || [],
      },
    };
  }

  private buildStructureStep(st: any): EvalLogStep {
    const completeness = Math.round(st.completeness * 100);
    let summary = `Se encontraron ${st.matchedSections?.length || 0} de ${st.templateSections?.length || 0} secciones requeridas. Completitud: ${completeness}%.`;
    if (st.missingSections?.length) {
      summary += ` Faltan: ${st.missingSections.join(', ')}.`;
    }
    return {
      name: 'structure',
      label: 'Estructura',
      status: st.completeness >= 0.7 ? 'passed' : 'failed',
      score: st.completeness,
      summary,
      details: {
        matchedSections: st.matchedSections || [],
        missingSections: st.missingSections || [],
      },
    };
  }

  /**
   * Create a document with a real DOCX in MinIO so SuperDoc opens with visible body text.
   */
  async createDocumentFromHtml(data: {
    title: string;
    html: string;
    folderId: string;
    trackableId: string;
    workflowItemId?: string;
    activityInstanceId?: string;
    organizationId: string;
    userId: string;
    /** If set, used as indexed contentText instead of stripping HTML */
    contentTextOverride?: string;
    assistantDraft?: { mode: string; extra?: Record<string, unknown> };
  }): Promise<Document> {
    const safeTitle = data.title.trim() || 'Documento';
    const buf = await renderHtmlAsDocx(data.html, safeTitle);
    const filename = `${safeTitle.replace(/[/\\?%*:|"<>]/g, '_').slice(0, 120) || 'documento'}.docx`;

    const key = this.storage.buildKey(
      data.organizationId,
      data.trackableId,
      `folder-${data.folderId}`,
      `${Date.now()}-${filename}`,
    );

    await this.storage.upload(
      key,
      buf,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );

    const contentText =
      data.contentTextOverride?.slice(0, 500_000) ?? stripHtmlToPlain(data.html).slice(0, 500_000);

    const doc = this.em.create(Document, {
      title: safeTitle,
      filename,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      minioKey: key,
      currentVersion: 1,
      reviewStatus: DocumentReviewStatus.DRAFT,
      isTemplate: false,
      folder: data.folderId,
      workflowItem: data.workflowItemId && !data.activityInstanceId ? data.workflowItemId : undefined,
      uploadedBy: data.userId,
      organization: data.organizationId,
      contentText,
    } as any);

    const version = this.em.create(DocumentVersion, {
      document: doc,
      versionNumber: 1,
      minioKey: key,
      fileSize: buf.length,
      createdBy: data.userId,
    } as any);

    await this.em.flush();

    if (data.activityInstanceId) {
      await this.applyActivityInstanceLink(doc, data.activityInstanceId, data.organizationId);
      await this.em.flush();
    } else if (data.workflowItemId) {
      await this.appendParticipationForNewLink(doc.id, data.workflowItemId, data.organizationId, doc.currentVersion);
    }

    this.emitDocumentEvent(DomainEvents.DOCUMENT_CREATED, {
      documentId: doc.id,
      organizationId: data.organizationId,
      trackableId: data.trackableId,
      workflowItemId: data.workflowItemId ?? null,
      userId: data.userId,
    });

    if (data.assistantDraft) {
      await this.logAssistantDraftDocument({
        organizationId: data.organizationId,
        userId: data.userId,
        trackableId: data.trackableId,
        documentId: doc.id,
        mode: data.assistantDraft.mode,
        extra: data.assistantDraft.extra,
      });
    }

    return doc;
  }

  /** Top document snippets from org search (KB v1: indexed firm documents). */
  async retrieveOrgKnowledge(
    organizationId: string,
    query: string,
    opts?: { trackableId?: string; limit?: number },
  ): Promise<Array<{ documentId: string; title: string; snippet: string; score: number }>> {
    const raw = query.trim();
    if (!raw) return [];
    const limit = Math.min(Math.max(opts?.limit ?? 5, 1), 20);
    const { data } = await this.search.searchDocuments({
      query: raw,
      organizationId,
      trackableId: opts?.trackableId,
      isTemplate: false,
      limit,
    });
    const out: Array<{ documentId: string; title: string; snippet: string; score: number }> = [];
    for (const row of data) {
      const loaded = await this.findOne(row.id);
      const full = String((loaded as any).contentText ?? '');
      let snippet = String(row.headline ?? '')
        .replace(/<mark>/gi, '')
        .replace(/<\/mark>/gi, '');
      if (snippet.length < 80 && full) {
        snippet = full.slice(0, 500);
      }
      snippet = stripHtmlToPlain(snippet).slice(0, 800);
      out.push({
        documentId: row.id,
        title: row.title,
        snippet,
        score: row.rank,
      });
    }
    return out;
  }

  private async logAssistantDraftDocument(params: {
    organizationId: string;
    userId: string;
    trackableId: string;
    documentId: string;
    mode: string;
    extra?: Record<string, unknown>;
  }): Promise<void> {
    this.em.create(ActivityLog, {
      organization: params.organizationId as any,
      trackable: params.trackableId as any,
      entityType: 'document',
      entityId: params.documentId,
      user: params.userId as any,
      action: 'assistant_draft_brief',
      details: { source: 'assistant', mode: params.mode, ...params.extra },
    } as any);
    await this.em.flush();
  }

  async createBlankDocument(data: {
    title: string;
    folderId: string;
    trackableId: string;
    workflowItemId?: string;
    activityInstanceId?: string;
    organizationId: string;
    userId: string;
    /** Initial plain text / markdown stored for search & assistant */
    initialContentText?: string;
  }): Promise<Document> {
    const text = data.initialContentText?.trim();
    if (text) {
      const html = plainTextOrMarkdownToHtml(text);
      return this.createDocumentFromHtml({
        title: data.title,
        html,
        folderId: data.folderId,
        trackableId: data.trackableId,
        workflowItemId: data.workflowItemId,
        activityInstanceId: data.activityInstanceId,
        organizationId: data.organizationId,
        userId: data.userId,
        contentTextOverride: text,
      });
    }

    const doc = this.em.create(Document, {
      title: data.title,
      filename: `${data.title}.docx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      currentVersion: 1,
      reviewStatus: DocumentReviewStatus.DRAFT,
      isTemplate: false,
      folder: data.folderId,
      workflowItem: data.workflowItemId && !data.activityInstanceId ? data.workflowItemId : undefined,
      uploadedBy: data.userId,
      organization: data.organizationId,
      contentText: undefined,
    } as any);

    await this.em.flush();
    if (data.activityInstanceId) {
      await this.applyActivityInstanceLink(doc, data.activityInstanceId, data.organizationId);
      await this.em.flush();
    } else if (data.workflowItemId) {
      await this.appendParticipationForNewLink(doc.id, data.workflowItemId, data.organizationId, doc.currentVersion);
    }
    this.emitDocumentEvent(DomainEvents.DOCUMENT_CREATED, {
      documentId: doc.id,
      organizationId: data.organizationId,
      trackableId: data.trackableId,
      workflowItemId: data.workflowItemId ?? null,
      userId: data.userId,
    });
    return doc;
  }

  /** Update indexed text for assistant / search (does not patch binary). */
  async updateDocumentContentText(
    documentId: string,
    organizationId: string,
    dto: { contentText: string; mode: 'replace' | 'append' },
  ): Promise<Document> {
    const doc = await this.findOne(documentId, { populate: ['folder'] as any });
    if ((doc as any).organization?.id && (doc as any).organization.id !== organizationId) {
      throw new NotFoundException('Document not found');
    }
    const prev = (doc as any).contentText as string | undefined;
    const next =
      dto.mode === 'append'
        ? [prev?.trim(), dto.contentText.trim()].filter(Boolean).join('\n\n')
        : dto.contentText;
    (doc as any).contentText = next;
    await this.em.flush();
    return doc;
  }

  /** Move document to another folder within the same trackable. */
  async moveDocumentToFolder(
    documentId: string,
    targetFolderId: string,
    organizationId: string,
  ): Promise<Document> {
    const doc = await this.findOne(documentId, { populate: ['folder', 'folder.trackable'] as any });
    if ((doc as any).organization?.id && (doc as any).organization.id !== organizationId) {
      throw new NotFoundException('Document not found');
    }
    const target = await this.em.findOne(Folder, { id: targetFolderId, organization: organizationId } as any, {
      populate: ['trackable'] as any,
    });
    if (!target) throw new NotFoundException('Carpeta destino no encontrada');
    const curTid = (doc.folder as any)?.trackable?.id;
    const tgtTid = (target as any).trackable?.id ?? (target as any).trackable;
    if (curTid && tgtTid && String(curTid) !== String(tgtTid)) {
      throw new BadRequestException('La carpeta destino debe ser del mismo expediente');
    }
    (doc as any).folder = target.id;
    await this.em.flush();
    return this.findOne(documentId, { populate: ['folder', 'folder.trackable', 'workflowItem'] as any });
  }

  private emitDocumentEvent(
    event: (typeof DomainEvents)[keyof typeof DomainEvents],
    payload: {
      documentId: string;
      organizationId: string;
      trackableId?: string;
      workflowItemId?: string | null;
      userId?: string;
      contentLengthDelta?: number;
      patchedFields?: string[];
    },
  ): void {
    this.eventEmitter.emit(event, payload);
  }

  async softRemove(id: string): Promise<void> {
    const doc = await this.findOne(id);
    doc.deletedAt = new Date();
    await this.em.flush();
  }

  async restore(id: string): Promise<Document> {
    const doc = await this.em.findOneOrFail(Document, { id, deletedAt: { $ne: null } } as any);
    doc.deletedAt = undefined;
    await this.em.flush();
    return doc;
  }

  async findTrashed(organizationId: string): Promise<Document[]> {
    return this.em.find(Document, { deletedAt: { $ne: null }, organization: organizationId } as any, {
      orderBy: { deletedAt: 'DESC' } as any,
    });
  }

  async resolveTrashRetentionDays(organizationId: string): Promise<number> {
    const org = await this.em.findOne(
      Organization,
      { id: organizationId },
      { fields: ['settings'] as any, filters: false },
    );
    return normalizeDocumentTrashRetentionDays(org?.settings?.documentTrashRetentionDays);
  }

  async purgeExpiredTrashedDocuments(organizationId: string, retentionDays: number): Promise<void> {
    const cutoff = new Date();
    cutoff.setTime(cutoff.getTime() - retentionDays * 24 * 60 * 60 * 1000);
    const docs = await this.em.find(
      Document,
      { organization: organizationId, deletedAt: { $lt: cutoff } } as any,
    );
    for (const doc of docs) {
      this.em.remove(doc);
    }
    if (docs.length) {
      await this.em.flush();
    }
  }

  async permanentRemove(id: string): Promise<void> {
    const doc = await this.em.findOneOrFail(Document, { id, deletedAt: { $ne: null } } as any);
    this.em.remove(doc);
    await this.em.flush();
  }

  async aiComplete(
    body: { messages: unknown[]; stream?: boolean; options?: Record<string, unknown> },
    res: import('express').Response,
  ): Promise<void> {
    return this.llm.aiComplete(body, res);
  }

  /** Link document to a procedural `StageInstance` (expediente v2). */
  async classifyDocument(
    documentId: string,
    stageInstanceId: string | null,
    organizationId: string,
  ): Promise<Document> {
    const doc = await this.em.findOne(Document, { id: documentId, organization: organizationId });
    if (!doc) throw new NotFoundException('Document not found');
    if (stageInstanceId) {
      const stage = await this.em.findOne(StageInstance, { id: stageInstanceId, organization: organizationId });
      if (!stage) throw new NotFoundException('Stage instance not found');
    }
    doc.classifiedStageInstance = stageInstanceId
      ? this.em.getReference(StageInstance, stageInstanceId)
      : undefined;
    await this.em.flush();
    return doc;
  }

  /**
   * Returns suggested document types for a stage (from resolved blueprint for the process track).
   */
  async suggestedTypesForStage(
    stageInstanceId: string,
    organizationId: string,
  ): Promise<{ documentType: string; name: string }[]> {
    const si = await this.em.findOne(
      StageInstance,
      { id: stageInstanceId, organization: organizationId },
      { populate: ['processTrack', 'processTrack.trackable', 'processTrack.blueprint', 'processTrack.blueprint.parentBlueprint'] },
    );
    if (!si) throw new NotFoundException('Stage instance not found');
    const pt = si.processTrack as ProcessTrack;
    const tree = await this.blueprintResolver.resolveForProcessTrack(pt);
    const stage = tree.stages.find((s) => s.code === si.stageTemplateCode);
    return (stage?.documentSuggestions ?? []).map((d) => {
      const prov = d as { name: string; _p?: { name: { value: string } } };
      return {
        documentType: d.documentType,
        name: prov._p?.name?.value ?? prov.name,
      };
    });
  }
}
