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
    // findInPage, quickOpen, the four moves and 组合/取消组合 (G197) have local surfaces now;
    // 重命名 is the one entry with no local action yet.
    expect(missingActions().map((e) => e.id)).toEqual(['rename']);
  });

  it('marks duplicate and delete as already present', () => {
    expect(actionEntry('duplicate')?.implemented).toBe(true);
    expect(actionEntry('delete')?.implemented).toBe(true);
  });

  it('returns null for an unknown id', () => {
    expect(actionEntry('nope')).toBeNull();
  });
});
