import { describe, expect, it } from 'vitest';

import { capabilitiesFor, effectivePermission } from './permission-axes';
import { spaceCapabilitiesFor, SPACE_ROLE_DESCRIPTIONS } from './space-role';

/**
 * G588: the three capability keys are separate — a commenter can comment without editing, which
 * a single `canEdit` boolean could not express. Forced-read-only is its own dimension.
 */
describe('the three capability keys (G588)', () => {
  it('owner and editor get all three', () => {
    for (const role of ['owner', 'editor'] as const) {
      expect(capabilitiesFor(role)).toEqual({ canView: true, canComment: true, canEdit: true });
    }
  });

  it('a commenter can comment but not edit — the split a single boolean loses', () => {
    expect(capabilitiesFor('commenter')).toEqual({ canView: true, canComment: true, canEdit: false });
  });

  it('a viewer can only view', () => {
    expect(capabilitiesFor('viewer')).toEqual({ canView: true, canComment: false, canEdit: false });
  });

  it('an unknown role has no capability at all', () => {
    expect(capabilitiesFor(null)).toEqual({ canView: false, canComment: false, canEdit: false });
    expect(capabilitiesFor(undefined)).toEqual({ canView: false, canComment: false, canEdit: false });
  });
});

describe('forced read-only is an independent dimension (G588)', () => {
  it('forces readOnly without changing the capability keys', () => {
    const perm = effectivePermission({ role: 'editor', forcedReadOnly: true });
    expect(perm.canEdit).toBe(true); // the capability is unchanged…
    expect(perm.readOnly).toBe(true); // …only the view is forced read-only
  });

  it('a non-editor is read-only regardless', () => {
    expect(effectivePermission({ role: 'viewer' }).readOnly).toBe(true);
    expect(effectivePermission({ role: 'commenter' }).readOnly).toBe(true);
  });

  it('an editor without the forced flag can write', () => {
    expect(effectivePermission({ role: 'editor' }).readOnly).toBe(false);
  });
});

/**
 * G324: the space axis is independent — owner/member differ only on settings and invites.
 */
describe('the space role axis (G324)', () => {
  it('only an owner changes settings and invites', () => {
    expect(spaceCapabilitiesFor('owner')).toEqual({ canChangeSettings: true, canInviteMembers: true });
    expect(spaceCapabilitiesFor('member')).toEqual({ canChangeSettings: false, canInviteMembers: false });
    expect(spaceCapabilitiesFor('guest')).toEqual({ canChangeSettings: false, canInviteMembers: false });
  });

  it('carries the official member/owner descriptions verbatim', () => {
    expect(SPACE_ROLE_DESCRIPTIONS.owner).toBe('可以更改设置并邀请新成员');
    expect(SPACE_ROLE_DESCRIPTIONS.member).toBe('无法更改设置或邀请新成员');
  });
});
