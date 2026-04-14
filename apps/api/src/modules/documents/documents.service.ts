import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Queue } from 'bullmq';
import { Document, DocumentVersion, Evaluation } from '@tracker/db';
import {
  DocumentReviewStatus,
  checkSpelling,
  validateCitations,
  analyzeCoherence,
  validateReferences,
} from '@tracker/shared';
import { StorageService } from '../storage/storage.service';
import { BaseCrudService } from '../../common/services/base-crud.service';

export interface EvalLogStep {
  name: string;
  label: string;
  status: 'passed' | 'failed' | 'skipped';
  score: number | null;
  summary: string;
  details: Record<string, unknown>;
}

@Injectable()
export class DocumentsService extends BaseCrudService<Document> {
  private readonly evaluationQueue: Queue;

  constructor(
    em: EntityManager,
    private readonly storage: StorageService,
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
      trackableId: string;
      organizationId: string;
      userId: string;
      isTemplate?: boolean;
    },
  ): Promise<Document> {
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
      workflowItem: data.workflowItemId || undefined,
      uploadedBy: data.userId,
      organization: data.organizationId,
    } as any);

    const version = this.em.create(DocumentVersion, {
      document: doc,
      versionNumber: 1,
      minioKey: key,
      fileSize: file.size,
      createdBy: data.userId,
    } as any);

    await this.em.flush();
    return doc;
  }

  async createNewVersion(
    documentId: string,
    file: Express.Multer.File,
    userId: string,
    organizationId: string,
  ): Promise<DocumentVersion> {
    const doc = await this.findOne(documentId, { populate: ['folder', 'folder.trackable'] as any });
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
      workflowItem: targetWorkflowItemId || undefined,
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
    return newDoc;
  }

  async saveEditorContent(
    documentId: string,
    dto: { editorContent: Record<string, unknown>; contentText?: string },
    userId: string,
    organizationId: string,
  ): Promise<Document> {
    const doc = await this.findOne(documentId, { populate: ['folder', 'folder.trackable'] as any });

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
    return doc;
  }

  async submitForReview(documentId: string): Promise<{ message: string; documentId: string }> {
    const doc = await this.findOne(documentId);
    doc.reviewStatus = DocumentReviewStatus.SUBMITTED;
    await this.em.flush();

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

  async createBlankDocument(data: {
    title: string;
    folderId: string;
    trackableId: string;
    workflowItemId?: string;
    organizationId: string;
    userId: string;
  }): Promise<Document> {
    const doc = this.em.create(Document, {
      title: data.title,
      filename: `${data.title}.docx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      currentVersion: 1,
      reviewStatus: DocumentReviewStatus.DRAFT,
      isTemplate: false,
      folder: data.folderId,
      workflowItem: data.workflowItemId || undefined,
      uploadedBy: data.userId,
      organization: data.organizationId,
    } as any);

    await this.em.flush();
    return doc;
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

  async permanentRemove(id: string): Promise<void> {
    const doc = await this.em.findOneOrFail(Document, { id, deletedAt: { $ne: null } } as any);
    this.em.remove(doc);
    await this.em.flush();
  }
}
