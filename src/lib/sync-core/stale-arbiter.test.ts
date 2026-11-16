import { describe, expect, it } from 'vitest';

import { clampClientSyncTs, deleteOpExemptsStale, serverTimestamp, shouldOverwriteLocal, type PendingIntent } from './stale-arbiter';

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

/**
 * `gap.md` G1638 —— 未来戳的界。`rec.syncTs` 由设备自己的钟生成，服务端此前原样采信
 * （③ 的 max 只会把它抬得更远）：一台时间调到 2099 的设备能把整个账号的增量游标推到未来，
 * 之后所有正常时刻的改动都被 GET 的 since 谓词永久跳过、同一行也被 LWW 永久压死。
 * 修法＝**落库值**钳到服务端此刻；客户端原值仍参与 LWW 判旧（同设备两笔的前后关系归设备）。
 */
describe('G1638 — future client timestamps are clamped', () => {
  const server = '2026-11-16T12:00:00.000Z';

  it('a far-future stamp is clamped to the server clock', () => {
    expect(clampClientSyncTs(server, '2099-05-01T12:00:00.000Z')).toBe(server);
  });

  it('a slightly-ahead stamp inside the tolerance is kept (the debounce window must still land ahead)', () => {
    // 同设备去抖窗口里连发的两笔天然相差毫秒级；③ 就是为这种"略超前"保留的
    expect(clampClientSyncTs(server, '2026-11-16T12:00:02.000Z')).toBe('2026-11-16T12:00:02.000Z');
    expect(clampClientSyncTs(server, '2026-11-16T12:00:05.000Z')).toBe('2026-11-16T12:00:05.000Z');
  });

  it('just past the tolerance is clamped', () => {
    expect(clampClientSyncTs(server, '2026-11-16T12:00:06.000Z')).toBe(server);
  });

  it('a past stamp falls back to the server clock (max behavior, unchanged)', () => {
    expect(clampClientSyncTs(server, '2026-11-16T11:59:59.000Z')).toBe(server);
    expect(clampClientSyncTs(server, '2020-01-01T00:00:00.000Z')).toBe(server);
  });

  it('an unparseable stamp falls back to the server clock (it is bad data, not intent)', () => {
    expect(clampClientSyncTs(server, 'not-a-date')).toBe(server);
    expect(clampClientSyncTs(server, '')).toBe(server);
  });

  it('the clamp never lands beyond server + tolerance even for absurd offsets', () => {
    const clamped = clampClientSyncTs(server, '9999-12-31T23:59:59.999Z');
    expect(clamped).toBe(server);
    expect(Date.parse(clamped)).toBeLessThanOrEqual(Date.parse(server) + 5_000);
  });
});
