import type { EntityManager } from '@mikro-orm/postgresql';
import type { Client as MinioClient } from 'minio';
import type { UserSinoeCredentials } from '@tracker/db';
import type { ScrapeResult } from '../../base-scraper';
import { buildLastScrapeSnapshot } from './json-snapshot-repository';
import type { NotificacionRepository, PersistStats, SinoePersistContext } from './notification-repository';
import { SinoePostgresRepository } from './postgres-repository';

/**
 * Persistencia Postgres + snapshot JSON en credenciales SINOE.
 */
export class SinoeCompositeRepository implements NotificacionRepository {
  private readonly pg: SinoePostgresRepository;

  constructor(minio: MinioClient, bucket: string) {
    this.pg = new SinoePostgresRepository(minio, bucket);
  }

  async persistScrapeResult(
    em: EntityManager,
    credentialsRow: UserSinoeCredentials,
    result: ScrapeResult,
    ctx: SinoePersistContext,
  ): Promise<PersistStats> {
    const stats = await this.pg.persistScrapeRows(em, ctx, result);
    credentialsRow.lastScrapeSnapshot = buildLastScrapeSnapshot(result, stats) as unknown as Record<
      string,
      unknown
    >;
    return stats;
  }
}

export async function createMinioClientForWorker(): Promise<{
  client: MinioClient;
  bucket: string;
}> {
  const { Client: MinioClient } = await import('minio');
  const client = new MinioClient({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: Number(process.env.MINIO_PORT) || 9000,
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  });
  const bucket = process.env.MINIO_BUCKET || 'tracker-storage';
  return { client, bucket };
}
