import { Worker, type Job } from 'bullmq';
import type { MikroORM } from '@mikro-orm/core';
import { Document, SignatureRequest } from '@tracker/db';
import { SignatureRequestStatus } from '@tracker/shared';
import { getRedisConnection } from '../config/redis';

export function createSignaturesExpireWorker(orm: MikroORM) {
  return new Worker(
    'signatures-expire',
    async (_job: Job) => {
      const em = orm.em.fork();
      const now = new Date();
      const list = await em.find(
        SignatureRequest,
        { status: SignatureRequestStatus.PENDING, expiresAt: { $lt: now } } as any,
        { populate: ['document'], filters: false },
      );
      for (const r of list) {
        r.status = SignatureRequestStatus.EXPIRED;
        if (r.document) {
          (r.document as Document).lockedForSigning = false;
        }
      }
      await em.flush();
      return { expired: list.length };
    },
    { connection: getRedisConnection(), concurrency: 1 },
  );
}
