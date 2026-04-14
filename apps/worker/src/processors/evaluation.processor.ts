import { Worker, Job } from 'bullmq';
import { MikroORM } from '@mikro-orm/postgresql';
import { getRedisConnection } from '../config/redis';
import { extractText, extractStructure } from '../utils/text-extractor';
import { chunkText } from '../utils/text-chunker';
import { checkSpelling, validateReferences, validateCitations, analyzeCoherence } from '@tracker/shared';

interface EvaluationJobData {
  documentId: string;
  documentVersionId?: string;
  config: {
    spellCheckEnabled: boolean;
    citationCheckEnabled: boolean;
    coherenceCheckEnabled: boolean;
    referenceCheckEnabled: boolean;
    templateDocId?: string;
    similarityThreshold: number;
  };
}

export function createEvaluationWorker(orm: MikroORM) {
  const worker = new Worker<EvaluationJobData>(
    'document-evaluation',
    async (job: Job<EvaluationJobData>) => {
      const { documentId, config } = job.data;
      const em = orm.em.fork();

      await job.updateProgress(5);

      const doc = await em.findOneOrFail('Document', documentId, {
        filters: false,
      }) as any;

      // ── Extract text ──────────────────────────────────────────────────────
      let text = doc.contentText || '';

      if (doc.minioKey) {
        await job.updateProgress(10);

        const { Client: MinioClient } = await import('minio');
        const minio = new MinioClient({
          endPoint: process.env.MINIO_ENDPOINT || 'localhost',
          port: Number(process.env.MINIO_PORT) || 9000,
          useSSL: process.env.MINIO_USE_SSL === 'true',
          accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
          secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
        });

        const bucket = process.env.MINIO_BUCKET || 'tracker-storage';
        const stream = await minio.getObject(bucket, doc.minioKey);
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
          chunks.push(Buffer.from(chunk));
        }
        const fileBuffer = Buffer.concat(chunks);

        await job.updateProgress(20);

        text = await extractText(fileBuffer, doc.mimeType || 'text/plain');
        await extractStructure(fileBuffer, doc.mimeType || 'text/plain');

        doc.contentText = text;
        await em.flush();

        await job.updateProgress(30);

        const textChunks = chunkText(text);
        await em.nativeDelete('DocumentChunk', { document: documentId });
        for (let i = 0; i < textChunks.length; i++) {
          em.create('DocumentChunk', {
            document: documentId,
            chunkIndex: i,
            content: textChunks[i],
          });
        }
        await em.flush();
      }

      await job.updateProgress(35);

      // ── Run checks ────────────────────────────────────────────────────────
      const evaluationDetails: Record<string, unknown> = {};
      let totalScore = 0;
      let checksRun = 0;

      // Step 1 — Spelling (Spanish, real nspell)
      if (config.spellCheckEnabled) {
        const spellResult = await checkSpelling(text);
        evaluationDetails.spelling = {
          ...spellResult,
          label: 'Ortografía (Español)',
        };
        totalScore += spellResult.accuracy;
        checksRun++;
        await job.updateProgress(55);
      }

      // Step 2 — Citations
      if (config.citationCheckEnabled) {
        const citationResult = validateCitations(text);
        evaluationDetails.citations = {
          ...citationResult,
          label: 'Citas y referencias',
        };
        totalScore += citationResult.score;
        checksRun++;
        await job.updateProgress(70);
      }

      // Step 3 — Coherence
      if (config.coherenceCheckEnabled) {
        const coherenceResult = await analyzeCoherence(text);
        evaluationDetails.coherence = {
          ...coherenceResult,
          label: 'Coherencia textual',
        };
        totalScore += coherenceResult.score;
        checksRun++;
        await job.updateProgress(85);
      }

      // Legacy reference check (kept for backward compat)
      if (config.referenceCheckEnabled && !config.citationCheckEnabled) {
        const refResult = validateReferences(text);
        evaluationDetails.references = refResult;
        totalScore += refResult.formatScore;
        checksRun++;
      }

      // ── Score + persist ───────────────────────────────────────────────────
      const finalScore = checksRun > 0 ? totalScore / checksRun : 0;
      const threshold = config.similarityThreshold;
      const passed = finalScore >= threshold;

      em.create('Evaluation', {
        document: documentId,
        documentVersion: job.data.documentVersionId || undefined,
        type: 'quality_check',
        score: finalScore,
        threshold,
        result: passed ? 'passed' : 'failed',
        details: evaluationDetails,
      });

      doc.evaluationScore = finalScore;
      // Advance status: passed minimum criteria → in_review; failed → revision_needed
      doc.reviewStatus = passed ? 'in_review' : 'revision_needed';

      await em.flush();
      await job.updateProgress(100);

      return {
        documentId,
        score: finalScore,
        passed,
        newStatus: doc.reviewStatus,
        details: evaluationDetails,
      };
    },
    {
      connection: getRedisConnection(),
      concurrency: 2,
    },
  );

  worker.on('completed', (job, result) => {
    console.log(
      `[eval] ${job.id} completed — score=${result.score.toFixed(2)}, status=${result.newStatus}`,
    );
  });

  worker.on('failed', (job, err) => {
    console.error(`[eval] ${job?.id} failed:`, err.message);
  });

  return worker;
}
