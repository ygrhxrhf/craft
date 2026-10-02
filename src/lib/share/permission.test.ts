import { describe, expect, it } from 'vitest';

import { isSharePermission, shareWriteRole } from './permission';

describe('isSharePermission', () => {
  it('accepts the two tiers a document link has', () => {
    expect(isSharePermission('view')).toBe(true);
    expect(isSharePermission('edit')).toBe(true);
  });

  it('refuses the whiteboard’s `off` tier, which a document expresses as isPublished', () => {
    expect(isSharePermission('off')).toBe(false);
  });

  it('refuses anything that is not exactly one of the tiers', () => {
    for (const value of [undefined, null, '', 'VIEW', 'Edit', 'owner', 'admin', 0, 1, true, {}, []]) {
      expect(isSharePermission(value), `must refuse ${JSON.stringify(value)}`).toBe(false);
    }
  });
});

describe('shareWriteRole', () => {
  it('grants editing to a signed-in visitor of an edit tier', () => {
    expect(shareWriteRole('edit', 'user-1')).toBe('editor');
  });

  it('grants nothing to the view tier, however signed-in the visitor is', () => {
    expect(shareWriteRole('view', 'user-1')).toBeNull();
  });

  it('grants nothing to an anonymous visitor of the edit tier', () => {
    expect(shareWriteRole('edit', null)).toBeNull();
    expect(shareWriteRole('edit', '')).toBeNull();
  });

  it('grants nothing for a permission value outside the two tiers', () => {
    expect(shareWriteRole('off', 'user-1')).toBeNull();
    expect(shareWriteRole(undefined, 'user-1')).toBeNull();
  });
});
