import { describe, expect, it } from 'vitest';

import {
  BADGE_EDITED_OFFLINE,
  BADGE_EDITED_OPEN_TO_SYNC,
  BADGE_OPEN_TO_SYNC,
  offlineBadgeLabel,
  offlineBadgeState,
} from './offline-badge';

/**
 * The offline badge (G237): three states, each with its collected string.
 */
describe('choosing the state', () => {
  it('shows 已离线编辑 for a pending write while offline', () => {
    expect(offlineBadgeState({ offline: true, hasPendingWrite: true, opensToSync: true })).toBe(
      'editedOffline',
    );
  });

  it('shows 已编辑 · 打开以同步 for a pending write while online', () => {
    expect(offlineBadgeState({ offline: false, hasPendingWrite: true, opensToSync: false })).toBe(
      'editedOpenToSync',
    );
  });

  it('shows 打开以同步 when there is nothing local but opening syncs', () => {
    expect(offlineBadgeState({ offline: false, hasPendingWrite: false, opensToSync: true })).toBe(
      'openToSync',
    );
  });

  it('shows nothing otherwise', () => {
    expect(offlineBadgeState({ offline: false, hasPendingWrite: false, opensToSync: false })).toBe('none');
    expect(offlineBadgeState({ offline: true, hasPendingWrite: false, opensToSync: false })).toBe('none');
  });
});

describe('the labels', () => {
  it('carries the three collected strings', () => {
    expect(offlineBadgeLabel('editedOffline')).toBe(BADGE_EDITED_OFFLINE);
    expect(offlineBadgeLabel('editedOpenToSync')).toBe(BADGE_EDITED_OPEN_TO_SYNC);
    expect(offlineBadgeLabel('openToSync')).toBe(BADGE_OPEN_TO_SYNC);
  });

  it('has no label for the empty state', () => {
    expect(offlineBadgeLabel('none')).toBeNull();
  });

  it('keeps the middle string verbatim, separator and all', () => {
    expect(BADGE_EDITED_OPEN_TO_SYNC).toBe('已编辑 · 打开以同步');
  });
});
