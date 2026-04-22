import * as Minio from 'minio';
import { EntityManager } from '@mikro-orm/postgresql';
import { AssistantAttachment, AssistantAttachmentStatus } from '@tracker/db';

/** Deletes staged assistant chat uploads older than `maxAgeHours` (default 24). */
export async function purgeAssistantStaging(em: EntityManager, maxAgeHours = 24): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
  const rows = await em.find(
    AssistantAttachment,
    {
      status: AssistantAttachmentStatus.STAGED,
      createdAt: { $lt: cutoff },
    } as any,
    { filters: false },
  );

  if (!rows.length) return 0;

  const client = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: Number(process.env.MINIO_PORT || 9000),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  });
  const bucket = process.env.MINIO_BUCKET || 'tracker-storage';

  for (const att of rows) {
    try {
      await client.removeObject(bucket, att.minioKey);
    } catch {
      /* ignore */
    }
    em.remove(att);
  }
  await em.flush();
  return rows.length;
}
