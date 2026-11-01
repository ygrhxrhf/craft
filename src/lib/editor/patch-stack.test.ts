import { describe, expect, it } from 'vitest';

import {
  canRedoAt,
  canUndoAt,
  emptyStack,
  groupActions,
  isUndoableAction,
  mergePatchesFromOtherTabs,
  popRedo,
  popUndo,
  pushGroup,
  pushStep,
  type Patch,
  type PatchStack,
} from './patch-stack';

const p = (path: string, value: unknown, oldValue: unknown): Patch => ({ path, value, oldValue });

describe('the patch double stack (G586)', () => {
  it('appends forward patches and prepends inverse patches', () => {
    let stack: PatchStack = emptyStack();
    stack = pushStep(stack, { patches: [p('a', 1, 0)], inversePatches: [p('a', 0, 1)] });
    stack = pushStep(stack, { patches: [p('b', 2, 1)], inversePatches: [p('b', 1, 2)] });
    expect(stack.patches.map((x) => x.path)).toEqual(['a', 'b']);
    // The inverse stack is reverse-order: the newest step sits at the head.
    expect(stack.inversePatches.map((x) => x.path)).toEqual(['b', 'a']);
  });

  it('undo pops the inverse head — the last step\u2019s inverse', () => {
    let stack: PatchStack = emptyStack();
    stack = pushStep(stack, { patches: [p('a', 1, 0)], inversePatches: [p('a', 0, 1)] });
    stack = pushStep(stack, { patches: [p('b', 2, 1)], inversePatches: [p('b', 1, 2)] });
    const undo = popUndo(stack)!;
    expect(undo.step).toEqual([p('b', 1, 2)]);
    expect(undo.rest.inversePatches.map((x) => x.path)).toEqual(['a']);
  });

  it('redo pops the forward tail', () => {
    const stack = pushStep(emptyStack(), { patches: [p('a', 1, 0)], inversePatches: [p('a', 0, 1)] });
    const redo = popRedo(stack)!;
    expect(redo.step).toEqual([p('a', 1, 0)]);
    expect(redo.rest.patches).toEqual([]);
  });

  it('returns null when there is nothing to undo or redo', () => {
    expect(popUndo(emptyStack())).toBeNull();
    expect(popRedo(emptyStack())).toBeNull();
  });
});

describe('undo/redo do not enter the step table (G655)', () => {
  it('a lone undo or redo is not undoable', () => {
    expect(isUndoableAction([{ type: 'undo' }])).toBe(false);
    expect(isUndoableAction([{ type: 'redo' }])).toBe(false);
  });

  it('anything else is undoable', () => {
    expect(isUndoableAction([{ type: 'insertText' }])).toBe(true);
    expect(isUndoableAction([{ type: 'undo' }, { type: 'insertText' }])).toBe(true);
  });
});

describe('the index-hole stop (G655)', () => {
  it('canUndo is a hasOwnProperty check, so a hole stops in place', () => {
    const patches = { 0: {}, 2: {} };
    expect(canUndoAt(patches, 0)).toBe(true);
    expect(canUndoAt(patches, 1)).toBe(false); // the hole — Ctrl+Z silently does nothing
    expect(canUndoAt(patches, 2)).toBe(true);
  });

  it('canRedo looks one index ahead', () => {
    const patches = { 1: {} };
    expect(canRedoAt(patches, 0)).toBe(true);
    expect(canRedoAt(patches, 1)).toBe(false);
  });
});

describe('cross-tab patch merge (G586)', () => {
  it('merges another tab\u2019s patches by the same rule', () => {
    const mine = pushStep(emptyStack(), { patches: [p('a', 1, 0)], inversePatches: [p('a', 0, 1)] });
    const theirs = { patches: [p('b', 2, 1)], inversePatches: [p('b', 1, 2)] };
    const merged = mergePatchesFromOtherTabs(mine, theirs);
    expect(merged.patches.map((x) => x.path)).toEqual(['a', 'b']);
    expect(merged.inversePatches.map((x) => x.path)).toEqual(['b', 'a']);
  });
});

// G593: `group(t, e) { actions }` — several actions wrapped into one undo step.
describe('the compound action group (G593)', () => {
  it('concatenates forward patches in order and inverse patches in reverse', () => {
    const grouped = groupActions({
      steps: [
        { patches: [p('a', 1, 0)], inversePatches: [p('a', 0, 1)] },
        { patches: [p('b', 2, 1)], inversePatches: [p('b', 1, 2)] },
      ],
    });
    expect(grouped.patches.map((x) => x.path)).toEqual(['a', 'b']);
    // Undo the group walks its sub-steps backwards.
    expect(grouped.inversePatches.map((x) => x.path)).toEqual(['b', 'a']);
  });

  it('a whole group is one step on the stack', () => {
    const stack = pushGroup(emptyStack(), {
      steps: [
        { patches: [p('a', 1, 0)], inversePatches: [p('a', 0, 1)] },
        { patches: [p('b', 2, 1)], inversePatches: [p('b', 1, 2)] },
      ],
    });
    expect(stack.patches).toHaveLength(2); // two patches…
    expect(stack.inversePatches).toHaveLength(2);
    // …but one undo pops the whole group's inverse.
    const undo = popUndo(stack)!;
    expect(undo.step[0].path).toBe('b');
  });
});
