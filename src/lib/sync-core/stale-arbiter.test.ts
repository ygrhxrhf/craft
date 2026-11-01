import { describe, expect, it } from 'vitest';

import { deleteOpExemptsStale, serverTimestamp, shouldOverwriteLocal, type PendingIntent } from './stale-arbiter';

/**
 * G1511: the three candidate fixes for the same-device stale race, each independently decidable.
 */
describe('option 1 — delete-op exempts stale (G1511)', () => {
  it('a stale rejection of a tombstone is exempt', () => {
    expect(deleteOpExemptsStale('delete', 'stale')).toBe(true);
  });

  it('an upsert still takes the stale rejection', () => {
    expect(deleteOpExemptsStale('upsert', 'stale')).toBe(false);
  });

  it('other reasons are untouched', () => {
    expect(deleteOpExemptsStale('delete', 'not_found')).toBe(false);
  });
});

describe('option 2 — same-device loopback exemption (G1511)', () => {
  const pending: PendingIntent[] = [{ table: 'document', recordId: 'd1', syncTs: '2026-01-01T00:00:05.000Z' }];

  it('does not overwrite local when a newer intent for the same record is still pending', () => {
    expect(
      shouldOverwriteLocal({
        rejected: { table: 'document', id: 'd1', reason: 'stale' },
        rejectedSyncTs: '2026-01-01T00:00:03.000Z',
        pending,
      }),
    ).toBe(false);
  });

  it('overwrites when the pending intent is not newer', () => {
    expect(
      shouldOverwriteLocal({
        rejected: { table: 'document', id: 'd1', reason: 'stale' },
        rejectedSyncTs: '2026-01-01T00:00:09.000Z',
        pending,
      }),
    ).toBe(true);
  });

  it('a non-stale rejection is overwritten as before', () => {
    expect(
      shouldOverwriteLocal({
        rejected: { table: 'document', id: 'd1', reason: 'not_found' },
        rejectedSyncTs: '2026-01-01T00:00:03.000Z',
        pending,
      }),
    ).toBe(true);
  });

  it('a pending intent for a different record does not exempt', () => {
    expect(
      shouldOverwriteLocal({
        rejected: { table: 'document', id: 'd2', reason: 'stale' },
        rejectedSyncTs: '2026-01-01T00:00:03.000Z',
        pending,
      }),
    ).toBe(true);
  });
});

describe('option 3 — server timestamp only advances (G1511)', () => {
  it('takes the client stamp when it is ahead', () => {
    expect(serverTimestamp('2026-01-01T00:00:03.000Z', '2026-01-01T00:00:05.000Z')).toBe(
      '2026-01-01T00:00:05.000Z',
    );
  });

  it('keeps the server stamp when it is ahead', () => {
    expect(serverTimestamp('2026-01-01T00:00:09.000Z', '2026-01-01T00:00:05.000Z')).toBe(
      '2026-01-01T00:00:09.000Z',
    );
  });
});
