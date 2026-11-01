import { describe, expect, it } from 'vitest';

import { isProtocolUndo, missingProtocolActions, protocolAction, PROTOCOL_ACTIONS } from './action-ids';
import { isOverridden, resolveScopedSetting, scopeOfSetting, SCOPE_COPY, teamScopeCopy } from '@/lib/app/settings-scope';

/**
 * G282: undo/redo are protocol actions, and the six previously-unrecorded actions are named with
 * whether the local build has an equivalent.
 */
describe('the protocol action roster (G282)', () => {
  it('treats undo and redo as first-class protocol actions', () => {
    expect(isProtocolUndo('undo')).toBe(true);
    expect(isProtocolUndo('redo')).toBe(true);
    expect(isProtocolUndo('setTextStyle')).toBe(false);
    expect(protocolAction('undo')?.status).toBe('equivalent');
  });

  it('names the six previously-unrecorded actions', () => {
    const ids = PROTOCOL_ACTIONS.map((a) => a.id);
    for (const id of [
      'setLineType',
      'setPageParagraphSpacingType',
      'setPageStylePreset',
      'duplicateSubtree',
      'insertNewBlocksToObjectList',
      'toggleCoverImageEnabled',
    ]) {
      expect(ids, id).toContain(id);
    }
  });

  it('marks the three the local build has no equivalent for', () => {
    expect(missingProtocolActions().map((a) => a.id).sort()).toEqual([
      'insertNewBlocksToObjectList',
      'setPageParagraphSpacingType',
      'setPageStylePreset',
    ]);
  });

  it('returns null for an unknown action', () => {
    expect(protocolAction('nope')).toBeNull();
  });
});

/**
 * G166: settings resolve space → team → personal, and the copy says which scope applies.
 */
describe('the three-layer settings scope (G166)', () => {
  it('space overrides team overrides personal', () => {
    const settings = {
      personal: { accent: 'blue', brand: 'p' },
      team: { accent: 'green' },
      space: { accent: 'red' },
    };
    expect(resolveScopedSetting(settings, 'accent')).toBe('red');
    expect(scopeOfSetting(settings, 'accent')).toBe('space');
    expect(isOverridden(settings, 'accent')).toBe(true);
  });

  it('falls back to team when the space does not override', () => {
    const settings = { personal: { accent: 'blue' }, team: { accent: 'green' }, space: {} };
    expect(resolveScopedSetting(settings, 'accent')).toBe('green');
    expect(scopeOfSetting(settings, 'accent')).toBe('team');
    expect(isOverridden(settings, 'accent')).toBe(false);
  });

  it('falls back to personal when neither above sets it', () => {
    const settings = { personal: { accent: 'blue' }, team: {}, space: {} };
    expect(resolveScopedSetting(settings, 'accent')).toBe('blue');
    expect(scopeOfSetting(settings, 'accent')).toBe('personal');
  });

  it('invents nothing when no layer has the key', () => {
    expect(resolveScopedSetting({}, 'accent')).toBeUndefined();
    expect(scopeOfSetting({}, 'accent')).toBeNull();
  });

  it('fills the team name into the team-scope sentence', () => {
    expect(teamScopeCopy('设计')).toBe('这些设置适用于"设计"团队所有空间发布的内容。');
    expect(SCOPE_COPY.override.label).toBe('你可以覆盖单个空间的这些设置。');
  });
});
