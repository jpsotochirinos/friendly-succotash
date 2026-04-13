import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Document } from '@tracker/db';

export interface SearchResult {
  id: string;
  title: string;
  filename: string;
  isTemplate: boolean;
  reviewStatus: string;
  rank: number;
  headline: string;
  trackableTitle?: string;
  folderName?: string;
  updatedAt: Date;
}

interface SearchOptions {
  query: string;
  organizationId: string;
  isTemplate?: boolean;
  trackableId?: string;
  excludeDocId?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class SearchService {
  constructor(private readonly em: EntityManager) {}

  async searchDocuments(options: SearchOptions): Promise<{
    data: SearchResult[];
    total: number;
  }> {
    const conn = this.em.getConnection();
    const limit = options.limit || 20;
    const offset = options.offset || 0;

    const rawQuery = options.query.trim();
    if (!rawQuery) {
      return { data: [], total: 0 };
    }

    let dynamicWhere = '';
    const dynamicParams: any[] = [];

    if (options.isTemplate !== undefined) {
      dynamicWhere += ' AND d.is_template = ?';
      dynamicParams.push(options.isTemplate);
    }

    if (options.trackableId) {
      dynamicWhere += ' AND f.trackable_id = ?';
      dynamicParams.push(options.trackableId);
    }

    if (options.excludeDocId) {
      dynamicWhere += ' AND d.id != ?';
      dynamicParams.push(options.excludeDocId);
    }

    const countResult = await conn.execute(`
      SELECT COUNT(*) as total
      FROM documents d
      LEFT JOIN folders f ON d.folder_id = f.id
      WHERE d.organization_id = ?
      ${dynamicWhere}
      AND d.search_vector @@ websearch_to_tsquery('spanish', ?)
    `, [options.organizationId, ...dynamicParams, rawQuery]);

    const total = parseInt(countResult[0]?.total || '0', 10);

    const results = await conn.execute(`
      SELECT
        d.id,
        d.title,
        d.filename,
        d.is_template as "isTemplate",
        d.review_status as "reviewStatus",
        d.updated_at as "updatedAt",
        ts_rank(d.search_vector, websearch_to_tsquery('spanish', ?)) as rank,
        ts_headline('spanish', coalesce(d.content_text, ''), websearch_to_tsquery('spanish', ?),
          'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20'
        ) as headline,
        t.title as "trackableTitle",
        f.name as "folderName"
      FROM documents d
      LEFT JOIN folders f ON d.folder_id = f.id
      LEFT JOIN trackables t ON f.trackable_id = t.id
      WHERE d.organization_id = ?
      ${dynamicWhere}
      AND d.search_vector @@ websearch_to_tsquery('spanish', ?)
      ORDER BY
        CASE WHEN d.is_template THEN 0 ELSE 1 END,
        rank DESC
      LIMIT ? OFFSET ?
    `, [rawQuery, rawQuery, options.organizationId, ...dynamicParams, rawQuery, limit, offset]);

    return { data: results as SearchResult[], total };
  }

  async findSimilarDocuments(
    documentId: string,
    organizationId: string,
    limit = 10,
  ): Promise<SearchResult[]> {
    const conn = this.em.getConnection();

    const docResult = await conn.execute(`
      SELECT content_text, title FROM documents
      WHERE id = ? AND organization_id = ?
    `, [documentId, organizationId]);

    if (!docResult.length || !docResult[0].content_text) {
      return [];
    }

    const contentSample = docResult[0].content_text.substring(0, 2000);

    if (!contentSample.trim()) return [];

    const results = await conn.execute(`
      SELECT
        d.id,
        d.title,
        d.filename,
        d.is_template as "isTemplate",
        d.review_status as "reviewStatus",
        d.updated_at as "updatedAt",
        ts_rank(d.search_vector, plainto_tsquery('spanish', ?)) as rank,
        ts_headline('spanish', coalesce(d.content_text, ''), plainto_tsquery('spanish', ?),
          'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15'
        ) as headline
      FROM documents d
      WHERE d.organization_id = ?
        AND d.id != ?
        AND d.search_vector @@ plainto_tsquery('spanish', ?)
      ORDER BY rank DESC
      LIMIT ?
    `, [contentSample, contentSample, organizationId, documentId, contentSample, limit]);

    return results as SearchResult[];
  }

  async getTemplates(
    organizationId: string,
    limit = 50,
  ): Promise<Document[]> {
    return this.em.find(
      Document,
      { isTemplate: true, deletedAt: null } as any,
      {
        orderBy: { updatedAt: 'DESC' } as any,
        limit,
        populate: ['uploadedBy', 'folder'] as any,
      },
    );
  }

  async listDocuments(
    organizationId: string,
    filters?: { isTemplate?: boolean; tag?: string },
    limit = 50,
    offset = 0,
  ): Promise<{ data: any[]; total: number }> {
    const where: any = { organization: organizationId, deletedAt: null };
    if (filters?.isTemplate !== undefined) where.isTemplate = filters.isTemplate;

    const [items, total] = await this.em.findAndCount(
      Document,
      where,
      {
        orderBy: { updatedAt: 'DESC' } as any,
        limit,
        offset,
        populate: ['uploadedBy', 'folder', 'folder.trackable'] as any,
      } as any,
    );

    let results = items as any[];
    if (filters?.tag) {
      results = results.filter((d: any) => d.tags?.includes(filters.tag));
    }

    return { data: results, total };
  }
}
