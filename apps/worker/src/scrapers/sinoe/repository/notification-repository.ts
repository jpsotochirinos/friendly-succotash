import type { EntityManager } from '@mikro-orm/postgresql';
import type { UserSinoeCredentials } from '@tracker/db';
import type { ScrapeResult } from '../../base-scraper';

export interface SinoePersistContext {
  organizationId: string;
  userId: string;
}

export interface PersistStats {
  newCount: number;
  totalCount: number;
  byStatus: Record<string, number>;
}

export interface NotificacionRepository {
  persistScrapeResult(
    em: EntityManager,
    credentialsRow: UserSinoeCredentials,
    result: ScrapeResult,
    ctx: SinoePersistContext,
  ): Promise<PersistStats>;
}
