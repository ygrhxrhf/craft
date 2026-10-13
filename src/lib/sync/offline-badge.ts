/**
 * The offline badge in list views (G237). Three states, each with its own collected string:
 *
 * - 已离线编辑 (`browse.doc.edited.offline`) — the document was edited while offline.
 * - 已编辑 · 打开以同步 (`browse.doc.edited.offline.sync`) — edited, and opening it will sync.
 * - 打开以同步 (`browse.doc.open.to.sync`) — nothing local, but opening will sync it.
 *
 * The first two need a pending write for that document; the third does not.
 */
export type OfflineBadgeState = 'editedOffline' | 'editedOpenToSync' | 'openToSync' | 'none';

export const BADGE_EDITED_OFFLINE = '已离线编辑';
export const BADGE_EDITED_OFFLINE_KEY = 'browse.doc.edited.offline';

export const BADGE_EDITED_OPEN_TO_SYNC = '已编辑 · 打开以同步';
export const BADGE_EDITED_OPEN_TO_SYNC_KEY = 'browse.doc.edited.offline.sync';

export const BADGE_OPEN_TO_SYNC = '打开以同步';
export const BADGE_OPEN_TO_SYNC_KEY = 'browse.doc.open.to.sync';

export interface BadgeInput {
  /** Whether the client is offline right now. */
  offline: boolean;
  /** Whether this document has a write waiting to be pushed. */
  hasPendingWrite: boolean;
  /** Whether opening the document would trigger a sync. */
  opensToSync: boolean;
}

/**
 * The state to show. A pending write is what earns the two 「edited」 states; the plain
 * 「打开以同步」 is for a document that has nothing local but will sync when opened.
 */
export function offlineBadgeState({ offline, hasPendingWrite, opensToSync }: BadgeInput): OfflineBadgeState {
  if (hasPendingWrite) return offline ? 'editedOffline' : 'editedOpenToSync';
  return opensToSync ? 'openToSync' : 'none';
}

/** The label for a state, or null when there is nothing to show. */
export function offlineBadgeLabel(state: OfflineBadgeState): string | null {
  switch (state) {
    case 'editedOffline':
      return BADGE_EDITED_OFFLINE;
    case 'editedOpenToSync':
      return BADGE_EDITED_OPEN_TO_SYNC;
    case 'openToSync':
      return BADGE_OPEN_TO_SYNC;
    case 'none':
      return null;
  }
}
