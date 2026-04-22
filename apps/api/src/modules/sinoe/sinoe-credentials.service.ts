import {
  Injectable,
  BadRequestException,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from '@mikro-orm/postgresql';
import { Queue } from 'bullmq';
import { User, UserSinoeCredentials } from '@tracker/db';
import {
  encryptSinoeCredentials,
  decryptSinoeCredentials,
  parseDataEncryptionKey,
  type EncryptedBlob,
} from '@tracker/shared';

function maskUsername(username: string): string {
  if (username.length <= 4) return '****';
  return `${username.slice(0, 2)}***${username.slice(-2)}`;
}

@Injectable()
export class SinoeCredentialsService implements OnModuleDestroy {
  private readonly queue: Queue;

  constructor(
    private readonly em: EntityManager,
    private readonly config: ConfigService,
  ) {
    this.queue = new Queue('scraping', {
      connection: {
        host: this.config.get('REDIS_HOST', 'localhost'),
        port: Number(this.config.get('REDIS_PORT', 6379)),
      },
    });
  }

  private getKeyBuffer() {
    try {
      return parseDataEncryptionKey(this.config.get<string>('SINOE_CREDENTIALS_KEY'));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Invalid encryption key';
      throw new BadRequestException(
        `Cannot manage SINOE credentials: ${msg}. Set SINOE_CREDENTIALS_KEY (32-byte hex or base64).`,
      );
    }
  }

  async getStatus(userId: string, organizationId: string) {
    const row = await this.em.findOne(
      UserSinoeCredentials,
      { user: userId, organization: organizationId },
      { populate: ['user'] as any },
    );
    if (!row) {
      return { configured: false, usernameMasked: null as string | null };
    }
    const key = this.getKeyBuffer();
    const blob: EncryptedBlob = {
      ciphertext: row.ciphertext,
      iv: row.iv,
      authTag: row.authTag,
      keyVersion: row.keyVersion,
    };
    let usernameMasked: string;
    try {
      const { username } = decryptSinoeCredentials(blob, key);
      usernameMasked = maskUsername(username);
    } catch {
      usernameMasked = '****';
    }
    return {
      configured: true,
      usernameMasked,
      lastScrapeAt: row.lastScrapeAt ?? null,
      lastScrapeError: row.lastScrapeError ?? null,
    };
  }

  async upsert(userId: string, organizationId: string, username: string, password: string) {
    const user = await this.em.findOne(
      User,
      { id: userId, organization: organizationId },
      { populate: ['organization'] as any },
    );
    if (!user) throw new NotFoundException('User not found in organization');

    const key = this.getKeyBuffer();
    const blob = encryptSinoeCredentials({ username, password }, key);

    let row = await this.em.findOne(UserSinoeCredentials, { user: userId });
    if (!row) {
      row = this.em.create(UserSinoeCredentials, {
        user,
        organization: user.organization,
        ciphertext: blob.ciphertext,
        iv: blob.iv,
        authTag: blob.authTag,
        keyVersion: blob.keyVersion,
      } as any);
    } else {
      row.ciphertext = blob.ciphertext;
      row.iv = blob.iv;
      row.authTag = blob.authTag;
      row.keyVersion = blob.keyVersion;
      row.lastScrapeError = null;
    }
    await this.em.flush();
    return { ok: true };
  }

  async remove(userId: string, organizationId: string) {
    const row = await this.em.findOne(UserSinoeCredentials, {
      user: userId,
      organization: organizationId,
    });
    if (!row) throw new NotFoundException('No SINOE credentials configured');
    await this.em.removeAndFlush(row);
    return { ok: true };
  }

  async queueScrapeForCurrentUser(userId: string, organizationId: string) {
    const row = await this.em.findOne(UserSinoeCredentials, {
      user: userId,
      organization: organizationId,
    });
    if (!row) throw new BadRequestException('Configure SINOE credentials first');

    const job = await this.queue.add(
      'scrape-sinoe-user',
      {
        sourceType: 'sinoe' as const,
        config: {
          userId,
          organizationId,
        },
      },
      { removeOnComplete: true },
    );
    return { jobId: job.id };
  }

  async onModuleDestroy() {
    await this.queue.close();
  }
}
