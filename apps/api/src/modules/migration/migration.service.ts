import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { MessageEvent } from '@nestjs/common';
import Redis from 'ioredis';
import { Observable } from 'rxjs';
import { ImportBatch, Organization, Trackable } from '@tracker/db';
import {
  alegaMigrationRedisChannel,
  getImportCapabilities,
  hybridClassify,
  ImportBatchStatus,
  MatterType,
  PlanTier,
  suggestTrackableKey,
  TrackableStatus,
  type MigrationPlanFolderProfile,
  type StoredMigrationPlan,
} from '@tracker/shared';
import type { MigrationFolderProfileDto } from './dto/migration.dto';
import type { MigrationPlanGroupInputDto } from './dto/migration.dto';
import { LlmService } from '../llm/llm.service';

const MIGRATION_SYSTEM_PROMPT = `Eres un asistente de migración de documentos legales hacia Alega.
Ayuda al usuario a organizar expedientes y archivos: sugiere pasos concretos, aclara riesgos (PII, retención),
y no inventes APIs. Si no hay contexto suficiente, pide una aclaración breve.
Responde en español, tono profesional y conciso.`;

@Injectable()
export class MigrationService {
  constructor(
    private readonly em: EntityManager,
    private readonly llm: LlmService,
  ) {}

  private async orgTier(organizationId: string): Promise<PlanTier> {
    const org = await this.em.findOne(Organization, { id: organizationId } as any);
    return org?.planTier ?? PlanTier.FREE;
  }

  async profileFolderBatch(
    dto: { batchId: string; folders: MigrationFolderProfileDto[] },
    organizationId: string,
  ) {
    await this.ensureBatch(dto.batchId, organizationId);
    const tier = await this.orgTier(organizationId);
    const cap = getImportCapabilities(tier);

    const foldersOut = dto.folders.map((folder) => {
      const risks: string[] = [];
      const detectedEntities: string[] = [];
      const classifications: ReturnType<typeof hybridClassify>[] = [];

      for (const snip of folder.sampleSnippets ?? []) {
        const fn = snip.filename.split('/').pop() || snip.filename;
        const c = hybridClassify({
          filename: fn,
          textPreview: snip.text.slice(0, 200_000),
          tier: cap,
        });
        classifications.push(c);
        if (c.kind) detectedEntities.push(String(c.kind));
      }

      const dominant = classifications[0];
      const avgConf =
        classifications.length > 0
          ? classifications.reduce((s, c) => s + (c.confidence ?? 0), 0) /
            classifications.length
          : 0;

      if ((folder.fileCount ?? 0) > 10_000) {
        risks.push('Carpeta con muchos archivos; considere dividir el lote.');
      }

      return {
        relPath: folder.relPath,
        suggestedKind: dominant?.kind ?? 'Sin clasificar',
        confidence: avgConf || dominant?.confidence || 0.35,
        detectedEntities: [...new Set(detectedEntities)].slice(0, 20),
        risks,
      };
    });

    const kinds = foldersOut.map((f) => f.suggestedKind).filter(Boolean);
    const dominantKinds = [...new Set(kinds)].slice(0, 12);
    const coverageConfidence =
      foldersOut.length > 0
        ? foldersOut.reduce((s, f) => s + (f.confidence ?? 0), 0) / foldersOut.length
        : 0;

    return {
      folders: foldersOut,
      overall: { dominantKinds, coverageConfidence },
    };
  }

  async suggestGroups(
    dto: { batchId: string; profile: Record<string, unknown> },
    organizationId: string,
  ) {
    await this.ensureBatch(dto.batchId, organizationId);
    const folders =
      (dto.profile.folders as Array<
        MigrationPlanFolderProfile & { suggestedKind?: string }
      > | undefined) ?? [];

    const groups: Array<{
      id: string;
      title: string;
      trackableKind: string;
      fileIds: string[];
      confidence: number;
      rationale: string;
    }> = [];

    let idx = 0;
    for (const f of folders) {
      const preview =
        f.sampleSnippets?.map((s) => s.text).join('\n').slice(0, 50_000) ?? '';
      const pathHint = f.sampleFilenames?.[0] ?? f.relPath;
      const sug = suggestTrackableKey(pathHint || f.relPath, preview);
      idx += 1;
      groups.push({
        id: `g-${idx}`,
        title: sug.key.slice(0, 500),
        trackableKind: f.suggestedKind ?? 'matter',
        fileIds: [],
        confidence: sug.confidence,
        rationale: `Agrupación heurística desde ruta y muestras de texto (${f.relPath}).`,
      });
    }

    return { groups };
  }

  async chatProxy(
    dto: {
      batchId: string;
      messages: Array<{ role: string; content: string }>;
      contextRef?: string;
    },
    organizationId: string,
  ) {
    const batch = await this.ensureBatch(dto.batchId, organizationId);
    const context = {
      batchId: batch.id,
      batchName: batch.name,
      batchStatus: batch.status,
      configSummary: batch.config
        ? {
            hasMigrationPlan: Boolean((batch.config as any).migrationPlan),
          }
        : {},
      contextRef: dto.contextRef,
    };
    const ctxNote =
      '\n\nContexto del lote (JSON resumido): ' + JSON.stringify(context).slice(0, 4000);

    const userMsgs = dto.messages.filter((m) => m.role === 'user' || m.role === 'assistant');
    const trimmed = userMsgs.slice(-24).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content.slice(0, 12_000),
    }));

    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: MIGRATION_SYSTEM_PROMPT + ctxNote },
      ...trimmed,
    ];

    try {
      const data = await this.llm.chatCompletionJson({
        messages,
        options: { temperature: 0.4, maxTokens: 800 },
      });
      const choices = data.choices as
        | Array<{ message?: { content?: string } }>
        | undefined;
      const reply = (choices?.[0]?.message?.content ?? '').trim();
      const model = typeof data.model === 'string' ? data.model : undefined;
      return { reply, model };
    } catch (e) {
      if (e instanceof ServiceUnavailableException) {
        const last = [...trimmed].reverse().find((m) => m.role === 'user')?.content ?? '';
        return {
          reply:
            '[stub sin proveedor LLM] Configure GEMINI_API_KEY o DEEPSEEK_API_KEY en el servidor del API. ' +
            'Pregunta recibida: ' +
            (last.slice(0, 200) || '(vacía)'),
          model: 'stub',
        };
      }
      throw e;
    }
  }

  async commitPlan(
    dto: {
      batchId: string;
      plan: {
        groups: MigrationPlanGroupInputDto[];
        mappings?: Record<string, { groupId: string; trackableId?: string }>;
      };
    },
    userId: string,
    organizationId: string,
  ) {
    const batch = await this.ensureBatch(dto.batchId, organizationId);

    const pathToTrackable: Record<string, string> = {};
    const enrichedGroups: StoredMigrationPlan['groups'] = [];

    for (const g of dto.plan.groups) {
      const trackable = this.em.create(Trackable, {
        title: g.title.slice(0, 500),
        type: (g.trackableKind || 'matter').slice(0, 100),
        matterType: MatterType.OTHER,
        expedientNumber: g.expedienteHint?.slice(0, 120),
        status: TrackableStatus.CREATED,
        organization: organizationId,
        createdBy: userId,
        metadata: {
          importBatchId: batch.id,
          importDraft: true,
          migrationGroupId: g.id,
        },
      } as any);
      await this.em.flush();

      for (const rel of g.fileRelPaths ?? []) {
        const norm = rel.replace(/\\/g, '/').replace(/^\//, '');
        pathToTrackable[norm] = trackable.id;
      }

      enrichedGroups.push({
        ...g,
        trackableId: trackable.id,
      });
    }

    if (dto.plan.mappings) {
      for (const [rel, m] of Object.entries(dto.plan.mappings)) {
        const norm = rel.replace(/\\/g, '/').replace(/^\//, '');
        const group = dto.plan.groups.find((x) => x.id === m.groupId);
        if (!group) continue;
        const tr = enrichedGroups.find((eg) => eg.id === group.id);
        if (tr) pathToTrackable[norm] = m.trackableId ?? tr.trackableId;
      }
    }

    const migrationPlan: StoredMigrationPlan = {
      version: 1,
      committedAt: new Date().toISOString(),
      groups: enrichedGroups,
      pathToTrackable,
    };

    batch.config = {
      ...(typeof batch.config === 'object' && batch.config ? batch.config : {}),
      migrationPlan,
    } as any;
    batch.status = ImportBatchStatus.PLAN_READY;
    await this.em.flush();

    return { ok: true, batchId: batch.id, trackablesCreated: enrichedGroups.length };
  }

  subscribeBatchEvents(
    batchId: string,
    organizationId: string,
  ): Observable<MessageEvent> {
    return new Observable<MessageEvent>((observer) => {
      let sub: Redis | null = null;
      let ping: ReturnType<typeof setInterval> | null = null;
      let closed = false;

      void (async () => {
        try {
          const batch = await this.em.findOne(ImportBatch, {
            id: batchId,
            organization: organizationId,
          } as any);
          if (!batch) {
            observer.error(new NotFoundException('Lote no encontrado'));
            return;
          }
          observer.next({
            data: JSON.stringify({
              type: 'batch.status',
              batchId,
              at: new Date().toISOString(),
              payload: { status: batch.status, totalItems: batch.totalItems },
            }),
          });

          sub = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: Number(process.env.REDIS_PORT) || 6379,
            maxRetriesPerRequest: 3,
          });
          const chan = alegaMigrationRedisChannel(batchId);
          await sub.subscribe(chan);
          sub.on('message', (_ch, message) => {
            if (!closed) {
              observer.next({ data: message });
            }
          });

          ping = setInterval(() => {
            if (!closed) {
              observer.next({
                data: JSON.stringify({
                  type: 'ping',
                  batchId,
                  at: new Date().toISOString(),
                }),
              });
            }
          }, 25_000);
        } catch (e) {
          observer.error(e);
        }
      })();

      return () => {
        closed = true;
        if (ping) clearInterval(ping);
        if (sub) {
          void sub.quit();
        }
      };
    });
  }

  private async ensureBatch(batchId: string, organizationId: string): Promise<ImportBatch> {
    const batch = await this.em.findOne(ImportBatch, {
      id: batchId,
      organization: organizationId,
    } as any);
    if (!batch) throw new NotFoundException('Lote no encontrado');
    return batch;
  }
}
