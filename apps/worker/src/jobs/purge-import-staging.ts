import type { EntityManager } from '@mikro-orm/postgresql';
import { ImportBatch } from '@tracker/db';
import { ImportBatchStatus } from '@tracker/shared';

/**
 * Elimina objetos MinIO de lotes en staging cuya fecha de caducidad pasó (30 días).
 */
export async function purgeExpiredImportStaging(
  em: EntityManager,
): Promise<{ batchesPurged: number; keysRemoved: number }> {
  const now = new Date();
  const batches = await em.find(
    ImportBatch,
    {
      stagingExpiresAt: { $lt: now },
      status: {
        $in: [
          ImportBatchStatus.COMMITTED,
          ImportBatchStatus.REVERTED,
          ImportBatchStatus.FAILED,
        ],
      },
    } as any,
    { filters: false, limit: 50 },
  );

  const { Client: MinioClient } = await import('minio');
  const minio = new MinioClient({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: Number(process.env.MINIO_PORT) || 9000,
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  });
  const bucket = process.env.MINIO_BUCKET || 'tracker-storage';

  let keysRemoved = 0;
  let batchesPurged = 0;

  for (const batch of batches) {
    const orgId =
      typeof batch.organization === 'string'
        ? batch.organization
        : (batch.organization as { id: string }).id;
    const prefix = `staging/org-${orgId}/batch-${batch.id}/`;
    const keys: string[] = [];
    let marker: string | undefined;
    for (;;) {
      const res = await minio.listObjectsQuery(bucket, prefix, marker);
      for (const obj of res.objects) {
        if (obj.name) keys.push(obj.name);
      }
      if (!res.isTruncated) break;
      marker = res.nextMarker;
    }
    if (keys.length) {
      await minio.removeObjects(bucket, keys);
      keysRemoved += keys.length;
    }
    batchesPurged += 1;
  }

  return { batchesPurged, keysRemoved };
}
