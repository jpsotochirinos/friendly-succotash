import { describe, it, expect } from 'vitest';
import { whatsappThreadNeedsRotation } from './assistant-whatsapp-idle.util';

describe('whatsappThreadNeedsRotation', () => {
  it('returns false when idleHours <= 0', () => {
    const t = new Date('2020-01-01T00:00:00Z');
    expect(whatsappThreadNeedsRotation(t, t, 0, Date.now())).toBe(false);
    expect(whatsappThreadNeedsRotation(t, t, -1, Date.now())).toBe(false);
  });

  it('returns false when no anchor date', () => {
    expect(whatsappThreadNeedsRotation(null, null, 4, Date.now())).toBe(false);
    expect(whatsappThreadNeedsRotation(undefined, undefined, 4, Date.now())).toBe(false);
  });

  it('archives when lastMessageAt older than idle window', () => {
    const now = new Date('2025-06-01T12:00:00Z').getTime();
    const last = new Date('2025-06-01T06:00:00Z'); // 6h ago
    expect(whatsappThreadNeedsRotation(last, last, 4, now)).toBe(true);
  });

  it('does not archive within idle window', () => {
    const now = new Date('2025-06-01T12:00:00Z').getTime();
    const last = new Date('2025-06-01T10:00:00Z'); // 2h ago
    expect(whatsappThreadNeedsRotation(last, last, 4, now)).toBe(false);
  });

  it('uses updatedAt when lastMessageAt missing', () => {
    const now = new Date('2025-06-01T12:00:00Z').getTime();
    const updated = new Date('2025-06-01T05:00:00Z');
    expect(whatsappThreadNeedsRotation(null, updated, 4, now)).toBe(true);
  });
});
