import { describe, expect, it } from 'vitest';

import {
  ONLY_COLLABORATORS_LABEL,
  SHARE_PERMISSIONS,
  isSharePermission,
  shareWriteRole,
  tierOpensToLink,
} from './permission';

describe('isSharePermission', () => {
  it('accepts the three tiers a document link has (G04)', () => {
    expect(isSharePermission('view')).toBe(true);
    expect(isSharePermission('edit')).toBe(true);
    expect(isSharePermission('collaborators')).toBe(true);
    expect([...SHARE_PERMISSIONS]).toEqual(['view', 'edit', 'collaborators']);
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

describe('the closed tier', () => {
  it('carries the collected label', () => {
    expect(ONLY_COLLABORATORS_LABEL).toBe('仅限有访问权限的协作者');
  });

  it('does not open the document to a mere link holder', () => {
    expect(tierOpensToLink('view')).toBe(true);
    expect(tierOpensToLink('edit')).toBe(true);
    expect(tierOpensToLink('collaborators')).toBe(false);
  });
});

describe('shareWriteRole', () => {
  it('grants editing to a signed-in visitor of an edit tier', () => {
    expect(shareWriteRole('edit', 'user-1')).toBe('editor');
  });

  it('grants nothing to the view tier, however signed-in the visitor is', () => {
    expect(shareWriteRole('view', 'user-1')).toBeNull();
  });

  it('grants nothing to the closed tier — the link is not a grant at all', () => {
    expect(shareWriteRole('collaborators', 'user-1')).toBeNull();
  });

  it('grants nothing to an anonymous visitor of the edit tier', () => {
    expect(shareWriteRole('edit', null)).toBeNull();
    expect(shareWriteRole('edit', '')).toBeNull();
  });

  it('grants nothing for a permission value outside the tiers', () => {
    expect(shareWriteRole('off', 'user-1')).toBeNull();
    expect(shareWriteRole(undefined, 'user-1')).toBeNull();
  });
});
