import { describe, expect, it } from 'vitest';

import {
  ONLY_COLLABORATORS_LABEL,
  SHARE_PERMISSIONS,
  isSharePermission,
  normalizeSharePermission,
  shareWriteRole,
  tierOpensToLink,
} from './permission';

describe('isSharePermission (G131: five tiers)', () => {
  it('accepts the five access levels a document link has', () => {
    for (const tier of ['collaborators', 'viewAndComment', 'editAndComment', 'linkView', 'linkEdit']) {
      expect(isSharePermission(tier), tier).toBe(true);
    }
    expect([...SHARE_PERMISSIONS]).toEqual([
      'collaborators', 'viewAndComment', 'editAndComment', 'linkView', 'linkEdit',
    ]);
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

describe('normalizeSharePermission (G131: migrate the old three tiers)', () => {
  it('maps the retired three tiers onto the five', () => {
    expect(normalizeSharePermission('view')).toBe('linkView');
    expect(normalizeSharePermission('edit')).toBe('linkEdit');
    expect(normalizeSharePermission('collaborators')).toBe('collaborators');
  });

  it('passes an already-current tier through', () => {
    expect(normalizeSharePermission('viewAndComment')).toBe('viewAndComment');
    expect(normalizeSharePermission('linkEdit')).toBe('linkEdit');
  });

  it('returns null for a value outside the tiers', () => {
    expect(normalizeSharePermission('off')).toBeNull();
    expect(normalizeSharePermission(undefined)).toBeNull();
  });
});

describe('the closed tier', () => {
  it('carries the collected label', () => {
    expect(ONLY_COLLABORATORS_LABEL).toBe('仅限有访问权限的协作者');
  });

  it('opens the document to a link only on the two link tiers', () => {
    expect(tierOpensToLink('linkView')).toBe(true);
    expect(tierOpensToLink('linkEdit')).toBe(true);
    // 前三档靠协作者名单授权，链接本身不给任何角色。
    expect(tierOpensToLink('collaborators')).toBe(false);
    expect(tierOpensToLink('viewAndComment')).toBe(false);
    expect(tierOpensToLink('editAndComment')).toBe(false);
  });

  it('still opens the two retired tiers, via the migration map', () => {
    expect(tierOpensToLink('view')).toBe(true);
    expect(tierOpensToLink('edit')).toBe(true);
  });
});

describe('shareWriteRole', () => {
  it('grants editing to a signed-in visitor of a link-edit tier', () => {
    expect(shareWriteRole('linkEdit', 'user-1')).toBe('editor');
    // 旧值 edit 经归一后同样是编辑档。
    expect(shareWriteRole('edit', 'user-1')).toBe('editor');
  });

  it('grants nothing to the view tiers, however signed-in the visitor is', () => {
    expect(shareWriteRole('linkView', 'user-1')).toBeNull();
    expect(shareWriteRole('viewAndComment', 'user-1')).toBeNull();
    expect(shareWriteRole('editAndComment', 'user-1')).toBeNull();
  });

  it('grants nothing to the closed tier — the link is not a grant at all', () => {
    expect(shareWriteRole('collaborators', 'user-1')).toBeNull();
  });

  it('grants nothing to an anonymous visitor of the edit tier', () => {
    expect(shareWriteRole('linkEdit', null)).toBeNull();
    expect(shareWriteRole('linkEdit', '')).toBeNull();
  });

  it('grants nothing for a permission value outside the tiers', () => {
    expect(shareWriteRole('off', 'user-1')).toBeNull();
    expect(shareWriteRole(undefined, 'user-1')).toBeNull();
  });
});
