import { Schema } from '@tiptap/pm/model';
import { describe, expect, it } from 'vitest';

import {
  INDENT_STEP_PX,
  INDENT_VARIABLE,
  MAX_INDENT_LEVEL,
  clampIndent,
  indentDown,
  indentStyle,
  indentTargets,
  indentUp,
  indentWidth,
} from './block-indent';

/**
 * Block indentation (G218): one level is 28px, and level 0 omits the variable rather than setting
 * it to zero.
 */
describe('the indent width', () => {
  it('is 28px per level', () => {
    expect(INDENT_STEP_PX).toBe(28);
    expect(indentWidth(1)).toBe(28);
    expect(indentWidth(2)).toBe(56);
    expect(indentWidth(0)).toBe(0);
  });
});

describe('the inline style', () => {
  it('omits the variable entirely at level 0', () => {
    expect(indentStyle(0)).toEqual({});
  });

  it('sets the variable above zero', () => {
    expect(indentStyle(1)).toEqual({ [INDENT_VARIABLE]: '28px' });
    expect(indentStyle(2)).toEqual({ [INDENT_VARIABLE]: '56px' });
  });
});

describe('stepping the level', () => {
  it('goes up and down one at a time', () => {
    expect(indentUp(0)).toBe(1);
    expect(indentUp(1)).toBe(2);
    expect(indentDown(2)).toBe(1);
    expect(indentDown(1)).toBe(0);
  });

  it('never goes below zero', () => {
    expect(indentDown(0)).toBe(0);
  });

  it('stops at the ceiling', () => {
    expect(indentUp(MAX_INDENT_LEVEL)).toBe(MAX_INDENT_LEVEL);
  });

  it('returns to no variable after stepping down to zero', () => {
    const level = indentDown(indentDown(indentUp(0)));
    expect(indentStyle(level)).toEqual({});
  });
});

describe('clamping a stored level', () => {
  it('accepts integers in range and floors junk at zero', () => {
    expect(clampIndent(2)).toBe(2);
    expect(clampIndent(99)).toBe(MAX_INDENT_LEVEL);
    expect(clampIndent(-3)).toBe(0);
    expect(clampIndent(Number.NaN)).toBe(0);
    expect(clampIndent(undefined)).toBe(0);
  });
});

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: {
      group: 'block',
      content: 'inline*',
      attrs: { indent: { default: 0 } },
      toDOM: () => ['p', 0],
    },
    bulletList: {
      group: 'block',
      content: 'listItem+',
      toDOM: () => ['ul', 0],
    },
    listItem: {
      content: 'paragraph block*',
      toDOM: () => ['li', 0],
    },
    text: { group: 'inline' },
  },
});

function docWith(...texts: string[]) {
  return schema.node(
    'doc',
    null,
    texts.map((text) => schema.node('paragraph', null, text ? [schema.text(text)] : [])),
  );
}

// G581/G912: Tab indents the top-level blocks the selection touches.
describe('the blocks a Tab press touches', () => {
  it('picks the block holding a collapsed caret', () => {
    const doc = docWith('alpha', 'beta');
    expect(indentTargets(doc, 2, 2).map((target) => target.index)).toEqual([0]);
  });

  it('picks every block a cross-block selection covers', () => {
    const doc = docWith('alpha', 'beta', 'gamma');
    const targets = indentTargets(doc, 2, doc.child(0).nodeSize + 3);
    expect(targets.map((target) => target.index)).toEqual([0, 1]);
  });

  it('does not pull in the next block when the caret sits at its start', () => {
    const doc = docWith('alpha', 'beta');
    const boundary = doc.child(0).nodeSize + 1;
    expect(indentTargets(doc, boundary, boundary).map((target) => target.index)).toEqual([1]);
  });

  it('skips blocks that cannot carry an indent', () => {
    const list = schema.node('bulletList', null, [
      schema.node('listItem', null, [schema.node('paragraph', null, [schema.text('item')])]),
    ]);
    const doc = schema.node('doc', null, [list, schema.node('paragraph', null, [schema.text('after')])]);
    const targets = indentTargets(doc, 2, doc.content.size - 1);
    expect(targets.map((target) => target.index)).toEqual([1]);
  });

  it('carries the current level so the caller can step it', () => {
    const doc = schema.node('doc', null, [schema.node('paragraph', { indent: 3 }, [schema.text('x')])]);
    expect(indentTargets(doc, 2, 2)[0]).toMatchObject({ index: 0, level: 3 });
  });
});
