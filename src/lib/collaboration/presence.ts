import type { MappablePosition } from '@tiptap/core';
import type { Awareness } from 'y-protocols/awareness';

export interface PresenceUser {
  id: string;
  name: string;
  color: string;
}

export interface PresenceCursor {
  anchor: unknown;
  head: unknown;
}

export interface PresenceState {
  user?: PresenceUser;
  cursor?: PresenceCursor | null;
  editingBlockId?: string | null;
  openPageId?: string | null;
  /**
   * G593: the official RTC dimensions carry an `updatedAt` so a stale value can be told from a
   * fresh one. A peer that stopped editing without a clean `null` write (tab killed) leaves its
   * last `editingBlockId` behind; the timestamp is what lets a reader age it out.
   */
  editingBlockUpdatedAt?: number | null;
  openPageUpdatedAt?: number | null;
}

export interface PeerPresence {
  clientId: number;
  user: PresenceUser;
  cursor: PresenceCursor | null;
  editingBlockId: string | null;
  openPageId: string | null;
  editingBlockUpdatedAt: number | null;
  openPageUpdatedAt: number | null;
}

/**
 * Stable palette so the same collaborator keeps one colour across sessions.
 * Mirrors the eight accent dots used by the format panel.
 */
const CURSOR_COLORS = [
  '#e0596b',
  '#e8863c',
  '#d9a520',
  '#4f9e68',
  '#2f9ba8',
  '#4a7de0',
  '#8a5ce0',
  '#c94fa2',
];

export function colorForUserId(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return CURSOR_COLORS[hash % CURSOR_COLORS.length];
}

export function initialPresenceState(user: PresenceUser): PresenceState {
  return {
    user,
    cursor: null,
    editingBlockId: null,
    openPageId: null,
    editingBlockUpdatedAt: null,
    openPageUpdatedAt: null,
  };
}

/** Peers = every awareness state except ours, minus users who left without cleanup. */
export function selectPeers(
  states: Map<number, PresenceState>,
  selfId: number,
  opts: { now?: number; staleAfterMs?: number } = {},
): PeerPresence[] {
  const peers: PeerPresence[] = [];
  const now = opts.now ?? Date.now();
  const staleAfterMs = opts.staleAfterMs ?? DEFAULT_RTC_STALE_MS;

  states.forEach((state, clientId) => {
    if (clientId === selfId || !state?.user) return;
    const editingBlockUpdatedAt = state.editingBlockUpdatedAt ?? null;
    const openPageUpdatedAt = state.openPageUpdatedAt ?? null;
    peers.push({
      clientId,
      user: state.user,
      cursor: state.cursor ?? null,
      // G593: an RTC value older than the window is dropped — a peer that vanished without a clean
      // `null` write must not keep showing as "editing block 9" forever.
      editingBlockId: isFresh(editingBlockUpdatedAt, now, staleAfterMs) ? state.editingBlockId ?? null : null,
      openPageId: isFresh(openPageUpdatedAt, now, staleAfterMs) ? state.openPageId ?? null : null,
      editingBlockUpdatedAt,
      openPageUpdatedAt,
    });
  });

  return peers;
}

/** Default staleness window for the RTC dimensions (official carries `updatedAt` for this). */
export const DEFAULT_RTC_STALE_MS = 30_000;

/** A value with no timestamp is treated as fresh (older clients), an aged one as stale. */
function isFresh(updatedAt: number | null, now: number, staleAfterMs: number): boolean {
  if (updatedAt === null) return true;
  return now - updatedAt <= staleAfterMs;
}

/**
 * Writes our caret into awareness, but only when it actually moved.
 * `setLocalStateField` always emits a change event and rebroadcasts to every
 * peer, so an unconditional write turns each editor transaction into presence
 * traffic — and on a single-client page into a render loop.
 */
export function setLocalCursor(
  awareness: Awareness,
  positions: { anchor: MappablePosition; head: MappablePosition } | null,
) {
  const next = positions
    ? { anchor: positions.anchor.toJSON(), head: positions.head.toJSON() }
    : null;
  setLocalPresenceField(awareness, 'cursor', next);
}

/**
 * Publishes one awareness dimension, but only when it actually changed.
 * Used for the RTC dimensions (editing block / open page) as well as the caret:
 * an unconditional write rebroadcasts to every peer on each keystroke.
 */
export function setLocalPresenceField<K extends 'cursor' | 'editingBlockId' | 'openPageId'>(
  awareness: Awareness,
  key: K,
  value: PresenceState[K],
) {
  const current = (awareness.getLocalState() as PresenceState | undefined)?.[key] ?? null;
  if (JSON.stringify(current ?? null) === JSON.stringify(value ?? null)) return;
  awareness.setLocalStateField(key, value ?? null);
  // G593: the two RTC dimensions carry an `updatedAt` alongside the value, so a peer can age out
  // a stale one. `cursor` is exempt — it is refreshed by movement, not by a wall clock.
  if (key === 'editingBlockId') {
    awareness.setLocalStateField('editingBlockUpdatedAt', value == null ? null : Date.now());
  } else if (key === 'openPageId') {
    awareness.setLocalStateField('openPageUpdatedAt', value == null ? null : Date.now());
  }
}
