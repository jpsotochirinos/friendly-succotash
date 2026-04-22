import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { Readable } from 'stream';

@Injectable()
export class StorageService implements OnModuleInit {
  private client!: Minio.Client;
  private bucket!: string;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    this.client = new Minio.Client({
      endPoint: this.config.get('MINIO_ENDPOINT', 'localhost'),
      port: Number(this.config.get('MINIO_PORT', 9000)),
      useSSL: this.config.get('MINIO_USE_SSL', 'false') === 'true',
      accessKey: this.config.get('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: this.config.get('MINIO_SECRET_KEY', 'minioadmin'),
    });

    this.bucket = this.config.get('MINIO_BUCKET', 'tracker-storage');

    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
    }
  }

  async upload(
    key: string,
    buffer: Buffer,
    contentType: string,
    metadata?: Record<string, string>,
  ): Promise<string> {
    await this.client.putObject(this.bucket, key, buffer, buffer.length, {
      'Content-Type': contentType,
      ...metadata,
    });
    return key;
  }

  async uploadStream(
    key: string,
    stream: Readable,
    size: number,
    contentType: string,
  ): Promise<string> {
    await this.client.putObject(this.bucket, key, stream, size, {
      'Content-Type': contentType,
    });
    return key;
  }

  async download(key: string): Promise<Buffer> {
    const stream = await this.client.getObject(this.bucket, key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async getStream(key: string): Promise<Readable> {
    return this.client.getObject(this.bucket, key);
  }

  async statObject(key: string): Promise<{ size: number }> {
    const s = await this.client.statObject(this.bucket, key);
    return { size: Number(s.size) };
  }

  async delete(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }

  async getPresignedUrl(key: string, expirySeconds = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, key, expirySeconds);
  }

  async getUploadPresignedUrl(key: string, expirySeconds = 3600): Promise<string> {
    return this.client.presignedPutObject(this.bucket, key, expirySeconds);
  }

  buildKey(orgId: string, trackableId: string, ...parts: string[]): string {
    return `org-${orgId}/trackable-${trackableId}/${parts.join('/')}`;
  }

  /** Staging de importaciones (mismo bucket, prefijo dedicado). */
  buildStagingKey(orgId: string, batchId: string, ...parts: string[]): string {
    return `staging/org-${orgId}/batch-${batchId}/${parts.join('/')}`;
  }

  async uploadStaging(
    key: string,
    buffer: Buffer,
    contentType: string,
    metadata?: Record<string, string>,
  ): Promise<string> {
    return this.upload(key, buffer, contentType, metadata);
  }

  async copyFileToKey(sourcePath: string, destKey: string, contentType: string): Promise<string> {
    const fs = await import('node:fs/promises');
    const buf = await fs.readFile(sourcePath);
    return this.upload(destKey, buf, contentType);
  }

  async removeStagingPrefix(orgId: string, batchId: string): Promise<void> {
    const prefix = `staging/org-${orgId}/batch-${batchId}/`;
    const keys: string[] = [];
    let marker: string | undefined;
    for (;;) {
      const res = await this.client.listObjectsQuery(this.bucket, prefix, marker);
      for (const obj of res.objects) {
        if (obj.name) keys.push(obj.name);
      }
      if (!res.isTruncated) break;
      marker = res.nextMarker;
    }
    if (keys.length) {
      await this.client.removeObjects(this.bucket, keys);
    }
  }
}
