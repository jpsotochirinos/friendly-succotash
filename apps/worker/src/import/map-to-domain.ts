import type { EntityManager } from '@mikro-orm/postgresql';
import {
  Document,
  DocumentVersion,
  Folder,
  ImportBatch,
  ImportItem,
  Trackable,
} from '@tracker/db';
import {
  DocumentReviewStatus,
  ImportBatchStatus,
  ImportItemStatus,
  MatterType,
  TrackableStatus,
} from '@tracker/shared';
import { resolveImportAdapter } from './adapters/index';
import type { ImportDomainAdapter } from './adapters/types';

/**
 * Cuando el wizard desktop confirmó un plan (`migrationPlan.pathToTrackable`), mapea ítems
 * a los `Trackable` ya creados sin volver a agrupar por heurística.
 */
export async function mapFromMigrationPlan(
  em: EntityManager,
  batch: ImportBatch,
  organizationId: string,
): Promise<void> {
  const raw = (batch.config as any)?.migrationPlan as
    | { pathToTrackable?: Record<string, string> }
    | undefined;
  const pathToTrackable = raw?.pathToTrackable;
  if (!pathToTrackable || Object.keys(pathToTrackable).length === 0) {
    return;
  }

  const items = await em.find(
    ImportItem,
    {
      batch: batch.id,
      organization: organizationId,
      status: ImportItemStatus.CLASSIFIED,
    } as any,
  );

  const defaultTid = Object.values(pathToTrackable)[0];
  const folderCache = new Map<string, string>();

  for (const item of items) {
    const trackableId = pathToTrackable[item.sourcePath] ?? defaultTid;
    if (!trackableId) continue;

    const trackable = await em.findOne(Trackable, {
      id: trackableId,
      organization: organizationId,
    } as any);
    if (!trackable) continue;

    const dir = dirname(item.sourcePath);
    const parts = dir ? dir.split('/').filter(Boolean) : [];
    let folderId: string | undefined;
    if (parts.length) {
      folderId = await getOrCreateFolderPath(
        em,
        trackable.id,
        organizationId,
        parts,
        folderCache,
      );
    }

    const baseName = basename(item.sourcePath);
    const doc = em.create(Document, {
      title: baseName.slice(0, 500),
      filename: baseName,
      mimeType: item.mimeDetected || 'application/octet-stream',
      minioKey: item.stagingKey,
      currentVersion: 1,
      reviewStatus: DocumentReviewStatus.DRAFT,
      folder: folderId,
      organization: organizationId,
      tags: [`import:${batch.id}`, `import-src:${item.sourcePath.slice(0, 200)}`],
    } as any);
    await em.flush();

    em.create(DocumentVersion, {
      document: doc,
      versionNumber: 1,
      minioKey: item.stagingKey,
      fileSize: Number(item.sizeBytes),
    } as any);

    item.mappedTrackable = trackable as any;
    item.mappedDocument = doc as any;
    item.status = ImportItemStatus.MAPPED;
  }

  batch.status = ImportBatchStatus.READY_FOR_REVIEW;
  await em.flush();
}

/**
 * Crea borradores de Trackable / Folder / Document vinculados al lote de importación.
 */
export async function mapImportDrafts(
  em: EntityManager,
  batch: ImportBatch,
  organizationId: string,
  adapter?: ImportDomainAdapter,
): Promise<void> {
  const cfg = batch.config as any;
  if (
    cfg?.migrationPlan?.pathToTrackable &&
    typeof cfg.migrationPlan.pathToTrackable === 'object' &&
    Object.keys(cfg.migrationPlan.pathToTrackable).length > 0
  ) {
    await mapFromMigrationPlan(em, batch, organizationId);
    return;
  }

  const impl = adapter ?? resolveImportAdapter(batch.config as any);
  const items = await em.find(
    ImportItem,
    {
      batch: batch.id,
      organization: organizationId,
      status: ImportItemStatus.CLASSIFIED,
    } as any,
  );

  const byKey = new Map<string, ImportItem[]>();
  for (const it of items) {
    const base = it.suggestedTrackableKey || 'sin-clasificar';
    const refined =
      impl.refineTrackableKey?.(it.sourcePath, it.extractedTextPreview || '') ?? base;
    it.suggestedTrackableKey = refined;
    if (!byKey.has(refined)) byKey.set(refined, []);
    byKey.get(refined)!.push(it);
  }

  for (const [key, group] of byKey) {
    const title = key.slice(0, 500);
    const extra = impl.trackableMetadataExtra?.(batch) ?? {};
    const trackable = em.create(Trackable, {
      title,
      type: 'import',
      matterType: MatterType.OTHER,
      status: TrackableStatus.CREATED,
      organization: organizationId,
      metadata: {
        importBatchId: batch.id,
        importDraft: true,
        suggestedKey: key,
        ...extra,
      },
    } as any);
    await em.flush();

    const folderCache = new Map<string, string>();

    for (const item of group) {
      const dir = dirname(item.sourcePath);
      const parts = dir ? dir.split('/').filter(Boolean) : [];
      let folderId: string | undefined;
      if (parts.length) {
        folderId = await getOrCreateFolderPath(
          em,
          trackable.id,
          organizationId,
          parts,
          folderCache,
        );
      }

      const baseName = basename(item.sourcePath);
      const doc = em.create(Document, {
        title: baseName.slice(0, 500),
        filename: baseName,
        mimeType: item.mimeDetected || 'application/octet-stream',
        minioKey: item.stagingKey,
        currentVersion: 1,
        reviewStatus: DocumentReviewStatus.DRAFT,
        folder: folderId,
        organization: organizationId,
        tags: [`import:${batch.id}`, `import-src:${item.sourcePath.slice(0, 200)}`],
      } as any);
      await em.flush();

      em.create(DocumentVersion, {
        document: doc,
        versionNumber: 1,
        minioKey: item.stagingKey,
        fileSize: Number(item.sizeBytes),
      } as any);

      item.mappedTrackable = trackable as any;
      item.mappedDocument = doc as any;
      item.status = ImportItemStatus.MAPPED;
    }
  }

  batch.status = ImportBatchStatus.READY_FOR_REVIEW;
  await em.flush();
}

function dirname(p: string): string {
  const n = p.replace(/\\/g, '/');
  const i = n.lastIndexOf('/');
  return i <= 0 ? '' : n.slice(0, i);
}

function basename(p: string): string {
  const n = p.replace(/\\/g, '/');
  const i = n.lastIndexOf('/');
  return i < 0 ? n : n.slice(i + 1);
}

async function getOrCreateFolderPath(
  em: EntityManager,
  trackableId: string,
  organizationId: string,
  segments: string[],
  cache: Map<string, string>,
): Promise<string> {
  let parentId: string | undefined;
  const trail: string[] = [];
  for (const seg of segments) {
    trail.push(seg);
    const cacheKey = `${trackableId}:${trail.join('/')}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      parentId = cached;
      continue;
    }
    const existing = await em.findOne(Folder, {
      trackable: trackableId,
      parent: parentId ?? null,
      name: seg,
    } as any);
    if (existing) {
      cache.set(cacheKey, existing.id);
      parentId = existing.id;
      continue;
    }
    const count = await em.count(Folder, { trackable: trackableId } as any);
    const folder = em.create(Folder, {
      name: seg.slice(0, 255),
      trackable: trackableId,
      parent: parentId,
      organization: organizationId,
      sortOrder: count,
    } as any);
    await em.flush();
    cache.set(cacheKey, folder.id);
    parentId = folder.id;
  }
  if (!parentId) throw new Error('getOrCreateFolderPath: empty segments');
  return parentId;
}
