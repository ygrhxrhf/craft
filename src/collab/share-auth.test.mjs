import { describe, expect, it } from 'vitest';

import { shareGrantStillValid } from './share-auth.mjs';

const EDIT_AT_3 = { docId: 'doc-1', userId: 'u-2', role: 'editor', viaShare: true, shareVersion: 3 };
const publishedEdit3 = { isPublished: true, permission: 'edit', shareVersion: 3 };

describe('shareGrantStillValid', () => {
  it('keeps a grant whose live share row still matches', () => {
    expect(shareGrantStillValid(EDIT_AT_3, publishedEdit3)).toBe(true);
  });

  it('accepts version 0, which is what a link that never changed tiers carries', () => {
    expect(
      shareGrantStillValid(
        { ...EDIT_AT_3, shareVersion: 0 },
        { isPublished: true, permission: 'edit', shareVersion: 0 },
      ),
    ).toBe(true);
  });

  it('refuses once the owner changed the tier, even at the same version number', () => {
    expect(shareGrantStillValid(EDIT_AT_3, { ...publishedEdit3, shareVersion: 4 })).toBe(false);
  });

  it('refuses a revoked publication', () => {
    expect(
      shareGrantStillValid(EDIT_AT_3, { ...publishedEdit3, isPublished: false }),
    ).toBe(false);
  });

  it('refuses a link downgraded to the view tier', () => {
    expect(shareGrantStillValid(EDIT_AT_3, { ...publishedEdit3, permission: 'view' })).toBe(false);
  });

  it('refuses when the share row is gone', () => {
    for (const live of [null, undefined]) {
      expect(shareGrantStillValid(EDIT_AT_3, live), `live=${live}`).toBe(false);
    }
  });

  it('leaves grants that did not come from a share link alone', () => {
    const owner = { docId: 'doc-1', userId: 'u-1', role: 'owner' };
    const member = { docId: 'doc-1', userId: 'u-3', role: 'editor' };
    expect(shareGrantStillValid(owner, null)).toBe(true);
    expect(shareGrantStillValid(member, { isPublished: false, permission: 'view', shareVersion: 9 })).toBe(true);
  });
});
