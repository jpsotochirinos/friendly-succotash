import { describe, it, expect } from 'vitest';
import { encodeListingCursor, decodeListingCursor, buildListingWhereClause } from './trackables-listing.query';
import { TrackableListingUrgency, TrackableStatus } from '@tracker/shared';

describe('trackables-listing.query', () => {
  it('encode/decode listing cursor roundtrip', () => {
    const payload = {
      sortBy: 'urgency' as const,
      r: 2,
      nd: '2026-01-01T00:00:00.000Z',
      id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      cr: '2025-01-01T00:00:00.000Z',
    };
    const raw = encodeListingCursor(payload);
    expect(decodeListingCursor(raw)).toEqual(payload);
  });

  it('decodeListingCursor returns null for garbage', () => {
    expect(decodeListingCursor('not-base64!!!')).toBeNull();
    expect(decodeListingCursor(undefined)).toBeNull();
  });

  it('buildListingWhereClause omits urgency when omitUrgency', () => {
    const org = '11111111-2222-3333-4444-555555555555';
    const withUrgency = buildListingWhereClause(org, {
      scope: 'active',
      urgency: TrackableListingUrgency.OVERDUE,
    });
    expect(withUrgency.clause).toContain('listing_urgency');

    const omit = buildListingWhereClause(
      org,
      { scope: 'active', urgency: TrackableListingUrgency.OVERDUE },
      { omitUrgency: true },
    );
    expect(omit.clause).not.toContain('listing_urgency');
  });

  it('buildListingWhereClause archived scope uses ARCHIVED status', () => {
    const org = '11111111-2222-3333-4444-555555555555';
    const { clause, params } = buildListingWhereClause(org, { scope: 'archived' });
    expect(clause).toContain('t.status = ?');
    expect(params).toContain(TrackableStatus.ARCHIVED);
  });
});
