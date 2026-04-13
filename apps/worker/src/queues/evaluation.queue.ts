import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis';

export const evaluationQueue = new Queue('document-evaluation', {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
  },
});

export async function scheduleEvaluation(
  documentId: string,
  documentVersionId?: string,
  config?: {
    spellCheckEnabled?: boolean;
    structureCheckEnabled?: boolean;
    referenceCheckEnabled?: boolean;
    templateDocId?: string;
    similarityThreshold?: number;
  },
) {
  await evaluationQueue.add('evaluate', {
    documentId,
    documentVersionId,
    config: {
      spellCheckEnabled: true,
      structureCheckEnabled: true,
      referenceCheckEnabled: true,
      similarityThreshold: 0.4,
      ...config,
    },
  });
}
