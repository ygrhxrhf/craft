import { describe, expect, it } from 'vitest';

import { ACTION_ENTRIES, actionEntry, chordedActions, missingActions } from './actions-menu';

/**
 * The 「动作」 sub-tab (G225): twelve entries, five with a key chord, and the local build's gap.
 */
describe('the twelve entries', () => {
  it('has all twelve, in the collected order', () => {
    expect(ACTION_ENTRIES.map((e) => e.id)).toEqual([
      'findInPage',
      'quickOpen',
      'addComment',
      'moveUp',
      'moveDown',
      'moveTop',
      'moveBottom',
      'group',
      'ungroup',
      'rename',
      'duplicate',
      'delete',
    ]);
  });

  it('prints a chord on exactly five', () => {
    expect(chordedActions()).toHaveLength(5);
    expect(chordedActions().map((e) => e.id)).toEqual([
      'findInPage',
      'quickOpen',
      'addComment',
      'moveUp',
      'moveDown',
    ]);
  });
});

describe('the local gap', () => {
  it('lists the entries this build lacks', () => {
    // findInPage, quickOpen and the four moves have local surfaces now; the four that stay
    // missing have no local action at all (comment from this tab, group, ungroup, rename).
    expect(missingActions().map((e) => e.id)).toEqual([
      'addComment',
      'group',
      'ungroup',
      'rename',
    ]);
  });

  it('marks duplicate and delete as already present', () => {
    expect(actionEntry('duplicate')?.implemented).toBe(true);
    expect(actionEntry('delete')?.implemented).toBe(true);
  });

  it('returns null for an unknown id', () => {
    expect(actionEntry('nope')).toBeNull();
  });
});
