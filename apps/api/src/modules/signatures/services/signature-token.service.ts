import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SignatureTokenService {
  private readonly expiryMs: number;

  constructor(private readonly config: ConfigService) {
    const hours = Number(
      this.config.get('SIGNATURE_EXTERNAL_TOKEN_EXPIRY_HOURS', 72),
    );
    this.expiryMs = hours * 60 * 60 * 1000;
  }

  hashPlainToken(plain: string): string {
    return createHash('sha256').update(plain.trim(), 'utf8').digest('hex');
  }

  generateTokenPair(): { plain: string; hash: string; expiresAt: Date } {
    const plain = randomBytes(32).toString('base64url');
    const hash = this.hashPlainToken(plain);
    const expiresAt = new Date(Date.now() + this.expiryMs);
    return { plain, hash, expiresAt };
  }
}
