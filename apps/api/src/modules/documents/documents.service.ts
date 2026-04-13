import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Document, DocumentVersion, Evaluation } from '@tracker/db';
import { DocumentReviewStatus } from '@tracker/shared';
import { StorageService } from '../storage/storage.service';
import { BaseCrudService } from '../../common/services/base-crud.service';

@Injectable()
export class DocumentsService extends BaseCrudService<Document> {
  constructor(
    em: EntityManager,
    private readonly storage: StorageService,
  ) {
    super(em, Document);
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

  async enqueueEvaluation(documentId: string): Promise<{ message: string; documentId: string }> {
    const doc = await this.findOne(documentId);
    // In production this would add a BullMQ job; for now mark as pending
    return { message: 'Evaluation queued', documentId: doc.id };
  }

  async getEvaluations(documentId: string): Promise<Evaluation[]> {
    return this.em.find(Evaluation, { document: documentId }, {
      orderBy: { createdAt: 'DESC' } as any,
    });
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
