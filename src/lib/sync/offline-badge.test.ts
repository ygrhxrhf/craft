import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  BADGE_EDITED_OFFLINE,
  BADGE_EDITED_OPEN_TO_SYNC,
  BADGE_OPEN_TO_SYNC,
  offlineBadgeForDoc,
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

// G237：第三态「打开以同步」＝本地镜像已比列表那份新，但写已推送（不在队列里）。
describe('the per-row inputs', () => {
  it('reads the queue first, then the mirror timestamp', () => {
    expect(
      offlineBadgeForDoc({ offline: true, hasPendingWrite: true, listedUpdatedAt: '2026-01-01T00:00:00.000Z' }),
    ).toBe('editedOffline');
    expect(
      offlineBadgeForDoc({ offline: false, hasPendingWrite: true, listedUpdatedAt: '2026-01-01T00:00:00.000Z' }),
    ).toBe('editedOpenToSync');
    expect(
      offlineBadgeForDoc({
        offline: false,
        hasPendingWrite: false,
        mirrorUpdatedAt: '2026-02-01T00:00:00.000Z',
        listedUpdatedAt: '2026-01-01T00:00:00.000Z',
      }),
    ).toBe('openToSync');
    expect(
      offlineBadgeForDoc({
        offline: false,
        hasPendingWrite: false,
        mirrorUpdatedAt: '2026-01-01T00:00:00.000Z',
        listedUpdatedAt: '2026-01-01T00:00:00.000Z',
      }),
    ).toBe('none');
    expect(
      offlineBadgeForDoc({ offline: false, hasPendingWrite: false, listedUpdatedAt: '2026-01-01T00:00:00.000Z' }),
    ).toBe('none');
  });
});

describe('the badge is hung on both lists', () => {
  const source = (rel: string) => readFileSync(join(process.cwd(), 'src', rel), 'utf8');

  it('renders inside the browse list row and the sidebar tree row', () => {
    for (const file of ['components/document/DocumentListView.tsx', 'components/sidebar/DocumentTreeItem.tsx']) {
      const src = source(file);
      expect(src, file).toContain("import { OfflineBadge } from '@/components/sync/OfflineBadge'");
      expect(src, file).toMatch(/<OfflineBadge\s+documentId=/);
    }
  });
});
