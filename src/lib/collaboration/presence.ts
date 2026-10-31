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
}

export interface PeerPresence {
  clientId: number;
  user: PresenceUser;
  cursor: PresenceCursor | null;
  editingBlockId: string | null;
  openPageId: string | null;
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
  return { user, cursor: null, editingBlockId: null, openPageId: null };
}

/** Peers = every awareness state except ours, minus users who left without cleanup. */
export function selectPeers(
  states: Map<number, PresenceState>,
  selfId: number,
): PeerPresence[] {
  const peers: PeerPresence[] = [];

  states.forEach((state, clientId) => {
    if (clientId === selfId || !state?.user) return;
    peers.push({
      clientId,
      user: state.user,
      cursor: state.cursor ?? null,
      editingBlockId: state.editingBlockId ?? null,
      openPageId: state.openPageId ?? null,
    });
  });

  return peers;
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
}
