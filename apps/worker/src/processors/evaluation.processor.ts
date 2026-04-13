import { Worker, Job } from 'bullmq';
import { MikroORM, EntityManager } from '@mikro-orm/postgresql';
import { getRedisConnection } from '../config/redis';
import { extractText, extractStructure } from '../utils/text-extractor';
import { chunkText } from '../utils/text-chunker';
import { checkSpelling } from '../services/spell-checker';
import { validateStructure } from '../services/structure-validator';
import { validateReferences } from '../services/reference-validator';

interface EvaluationJobData {
  documentId: string;
  documentVersionId?: string;
  config: {
    spellCheckEnabled: boolean;
    structureCheckEnabled: boolean;
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

      if (!doc.minioKey) {
        throw new Error('Document has no file stored');
      }

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

      const text = await extractText(fileBuffer, doc.mimeType || 'text/plain');
      const headings = await extractStructure(fileBuffer, doc.mimeType || 'text/plain');

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

      await job.updateProgress(50);

      const evaluationDetails: Record<string, unknown> = {};
      let totalScore = 0;
      let checksRun = 0;

      if (config.spellCheckEnabled) {
        const spellResult = await checkSpelling(text);
        evaluationDetails.spelling = spellResult;
        totalScore += spellResult.accuracy;
        checksRun++;
        await job.updateProgress(60);
      }

      if (config.structureCheckEnabled && config.templateDocId) {
        const templateDoc = await em.findOne('Document', config.templateDocId, {
          filters: false,
        }) as any;

        if (templateDoc?.minioKey) {
          const templateStream = await minio.getObject(bucket, templateDoc.minioKey);
          const templateChunks: Buffer[] = [];
          for await (const chunk of templateStream) {
            templateChunks.push(Buffer.from(chunk));
          }
          const templateBuffer = Buffer.concat(templateChunks);
          const templateHeadings = await extractStructure(
            templateBuffer,
            templateDoc.mimeType || 'text/plain',
          );

          const structResult = validateStructure(headings, templateHeadings);
          evaluationDetails.structure = structResult;
          totalScore += structResult.completeness;
          checksRun++;
        }
        await job.updateProgress(75);
      }

      if (config.referenceCheckEnabled) {
        const refResult = validateReferences(text);
        evaluationDetails.references = refResult;
        totalScore += refResult.formatScore;
        checksRun++;
        await job.updateProgress(85);
      }

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
      await em.flush();

      await job.updateProgress(100);

      return {
        documentId,
        score: finalScore,
        passed,
        details: evaluationDetails,
      };
    },
    {
      connection: getRedisConnection(),
      concurrency: 2,
    },
  );

  worker.on('completed', (job, result) => {
    console.log(`Evaluation ${job.id} completed: score=${result.score}, passed=${result.passed}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Evaluation ${job?.id} failed:`, err.message);
  });

  return worker;
}
