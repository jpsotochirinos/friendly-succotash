/**
 * Application-level envelope for reversible secrets (e.g. third-party logins).
 * Rotation: bump CURRENT_KEY_VERSION, keep decrypt path for old versions, re-encrypt on read or batch job.
 * Never log plaintext; store SINOE_CREDENTIALS_KEY only in a secrets manager in production.
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const CURRENT_KEY_VERSION = 1;

export interface EncryptedBlob {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
  keyVersion: number;
}

export interface SinoeCredentialPayload {
  username: string;
  password: string;
}

/** Parse 32-byte key from hex (64 chars) or base64. */
export function parseDataEncryptionKey(raw: string | undefined): Buffer {
  if (!raw?.trim()) {
    throw new Error('Encryption key is not configured');
  }
  const trimmed = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }
  const key = Buffer.from(trimmed, 'base64');
  if (key.length !== KEY_LENGTH) {
    throw new Error(`Encryption key must decode to ${KEY_LENGTH} bytes (use hex or base64)`);
  }
  return key;
}

export function encryptJson(payload: unknown, key: Buffer, keyVersion = CURRENT_KEY_VERSION): EncryptedBlob {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  const plaintext = JSON.stringify(payload);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { ciphertext, iv, authTag, keyVersion };
}

export function decryptJson<T>(blob: EncryptedBlob, key: Buffer): T {
  if (blob.keyVersion !== CURRENT_KEY_VERSION) {
    throw new Error(`Unsupported encryption key version: ${blob.keyVersion}`);
  }
  const decipher = createDecipheriv(ALGO, key, blob.iv);
  decipher.setAuthTag(blob.authTag);
  const plaintext = Buffer.concat([decipher.update(blob.ciphertext), decipher.final()]).toString('utf8');
  return JSON.parse(plaintext) as T;
}

export function encryptSinoeCredentials(payload: SinoeCredentialPayload, key: Buffer): EncryptedBlob {
  return encryptJson(payload, key);
}

export function decryptSinoeCredentials(blob: EncryptedBlob, key: Buffer): SinoeCredentialPayload {
  return decryptJson<SinoeCredentialPayload>(blob, key);
}
