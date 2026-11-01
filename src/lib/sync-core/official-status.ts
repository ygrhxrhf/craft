/**
 * G339: the official connection state machine has seven states. Locally the runtime keeps five
 * (`synced` / `syncing` / `offline` / `degraded` / `error`) plus a boot phase, so the official
 * name is **derived** rather than stored — the two vocabularies cannot drift because this is the
 * only translation.
 *
 * The two states that matter most are the ones the local names hide:
 * - `loading_cache` — the cache is being rendered before the network answers.
 * - `offline` ≠ `disconnected` — no network at all, versus a socket that dropped while online.
 */

export const OFFICIAL_SYNC_STATES = [
  'connected',
  'connecting',
  'syncing',
  'loading_cache',
  'offline',
  'disconnected',
  'unknown',
] as const;

export type OfficialSyncState = (typeof OFFICIAL_SYNC_STATES)[number];

export type LocalSyncStatus = 'synced' | 'syncing' | 'offline' | 'degraded' | 'error';
/** Where the boot sequence is: before the cache is read, while reading it, or live. */
export type SyncPhase = 'starting' | 'loading_cache' | 'live';

export function officialSyncState(status: LocalSyncStatus, phase: SyncPhase = 'live'): OfficialSyncState {
  if (phase === 'starting') return 'connecting';
  if (phase === 'loading_cache') return 'loading_cache';

  switch (status) {
    case 'synced':
      return 'connected';
    case 'syncing':
      return 'syncing';
    case 'offline':
      return 'offline';
    // `degraded` is the local name for "the socket dropped while we are online".
    case 'degraded':
      return 'disconnected';
    case 'error':
      return 'unknown';
  }
}

/**
 * G341: `conflict` is a first-class log category — eight in all. A conflict here is a write the
 * server refused as stale while the row it refused was itself the result of a competing write.
 */
export const SYNC_LOG_CATEGORIES = [
  'lifecycle',
  'socket',
  'conflict',
  'monitor',
  'worker',
  'network',
  'offline',
  'success',
] as const;

export type SyncLogCategory = (typeof SYNC_LOG_CATEGORIES)[number];

export interface SyncLogEvent {
  category: SyncLogCategory;
  detail: string;
  at: string;
}

/**
 * G341: a small in-memory log so conflicts are observable instead of only being a `console.warn`.
 * Bounded, because this is a diagnostic surface, not durable storage.
 */
export class SyncLog {
  private readonly events: SyncLogEvent[] = [];

  constructor(private readonly limit = 100) {}

  add(category: SyncLogCategory, detail: string, at: Date = new Date()): void {
    this.events.push({ category, detail, at: at.toISOString() });
    if (this.events.length > this.limit) this.events.splice(0, this.events.length - this.limit);
  }

  all(): readonly SyncLogEvent[] {
    return this.events;
  }

  byCategory(category: SyncLogCategory): SyncLogEvent[] {
    return this.events.filter((event) => event.category === category);
  }

  conflicts(): SyncLogEvent[] {
    return this.byCategory('conflict');
  }
}
