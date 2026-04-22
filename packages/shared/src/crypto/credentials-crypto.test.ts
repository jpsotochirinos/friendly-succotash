import { describe, it, expect } from 'vitest';
import { randomBytes } from 'crypto';
import {
  parseDataEncryptionKey,
  encryptSinoeCredentials,
  decryptSinoeCredentials,
} from './credentials-crypto';

describe('credentials-crypto', () => {
  it('round-trips SINOE payload with hex key', () => {
    const key = randomBytes(32);
    const hex = key.toString('hex');
    const parsed = parseDataEncryptionKey(hex);
    const blob = encryptSinoeCredentials({ username: 'user1', password: 'secret' }, parsed);
    const out = decryptSinoeCredentials(blob, parsed);
    expect(out).toEqual({ username: 'user1', password: 'secret' });
  });

  it('round-trips with base64 key', () => {
    const key = randomBytes(32);
    const b64 = key.toString('base64');
    const parsed = parseDataEncryptionKey(b64);
    const blob = encryptSinoeCredentials({ username: 'a', password: 'b' }, parsed);
    expect(decryptSinoeCredentials(blob, parsed)).toEqual({ username: 'a', password: 'b' });
  });

  it('rejects wrong key length', () => {
    expect(() => parseDataEncryptionKey('abcd')).toThrow(/32 bytes/);
  });
});
