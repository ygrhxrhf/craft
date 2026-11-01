import { describe, expect, it } from 'vitest';

import { OFFICIAL_SYNC_STATES, SYNC_LOG_CATEGORIES, SyncLog, officialSyncState } from './official-status';

// G339: seven official states, derived from the five local ones plus the boot phase.
describe('the official sync state', () => {
  it('covers the seven collected names', () => {
    expect([...OFFICIAL_SYNC_STATES]).toEqual([
      'connected', 'connecting', 'syncing', 'loading_cache', 'offline', 'disconnected', 'unknown',
    ]);
  });

  it('derives the live states', () => {
    expect(officialSyncState('synced')).toBe('connected');
    expect(officialSyncState('syncing')).toBe('syncing');
    expect(officialSyncState('offline')).toBe('offline');
    // The local name for "socket dropped while online".
    expect(officialSyncState('degraded')).toBe('disconnected');
    expect(officialSyncState('error')).toBe('unknown');
  });

  it('keeps the two boot phases distinct', () => {
    expect(officialSyncState('syncing', 'starting')).toBe('connecting');
    expect(officialSyncState('syncing', 'loading_cache')).toBe('loading_cache');
  });
});

// G341: conflict is a first-class log category.
describe('the sync log', () => {
  it('lists the eight categories', () => {
    expect([...SYNC_LOG_CATEGORIES]).toEqual([
      'lifecycle', 'socket', 'conflict', 'monitor', 'worker', 'network', 'offline', 'success',
    ]);
  });

  it('keeps conflicts separately and bounds the buffer', () => {
    const log = new SyncLog(3);
    log.add('conflict', 'task/a');
    log.add('success', 'flush');
    log.add('conflict', 'task/b');
    expect(log.conflicts().map((event) => event.detail)).toEqual(['task/a', 'task/b']);
    log.add('network', 'x');
    log.add('network', 'y');
    expect(log.all()).toHaveLength(3);
    expect(log.all().some((event) => event.detail === 'task/a')).toBe(false);
  });
});
