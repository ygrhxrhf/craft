import { describe, expect, it } from 'vitest';
import { Schema } from '@tiptap/pm/model';
import { EditorState } from '@tiptap/pm/state';
import type { Transaction } from '@tiptap/pm/state';
import {
  applyBlockAction,
  clearTaskReminder,
  setTaskReminder,
  blockLinkFor,
  blockMenuItems,
  deleteBlock,
  insertBlockAbove,
  insertBlockBelow,
} from './block-actions';

// A two-node schema is enough: every top-level block is a paragraph whose text
// identifies it. Shape (node type + text) is asserted rather than text alone, so a
// transaction that merges two blocks cannot pass by producing the same characters.
const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'text*', group: 'block', attrs: { blockId: { default: null } } },
    cardBlock: { content: 'block+', group: 'block' },
    taskItem: { content: 'text*', group: 'block', attrs: { remindAt: { default: null } } },
    text: {},
  },
  marks: {},
});

function stateWith(labels: string[]) {
  const doc = schema.nodes.doc.create(
    null,
    labels.map((label) => schema.nodes.paragraph.create(null, label ? schema.text(label) : null)),
  );
  return EditorState.create({ schema, doc });
}

function shapeOf(state: EditorState) {
  const shape: [string, string][] = [];
  state.doc.forEach((node) => shape.push([node.type.name, node.textContent]));
  return shape;
}

function run(state: EditorState, action: (dispatch: (tr: Transaction) => void) => void) {
  return shapeOf(runState(state, action));
}

function runState(state: EditorState, action: (dispatch: (tr: Transaction) => void) => void) {
  const box: { next: EditorState | undefined } = { next: undefined };
  action((tr) => {
    box.next = state.apply(tr);
  });
  if (!box.next) throw new Error('the action dispatched nothing');
  return box.next;
}

const blocks = (...labels: (string | null)[]) =>
  labels.map((label) => ['paragraph', label ?? ''] as [string, string]);

describe('the caret after inserting', () => {
  it('lands inside the new block when inserting below', () => {
    const state = stateWith(['甲', '乙']);
    const next = runState(state, (d) => insertBlockBelow(state, d, 0));
    expect(next.selection.$from.parent.textContent).toBe('');
    expect(next.selection.$from.depth).toBe(1);
  });

  it('lands inside the new block when inserting above', () => {
    const state = stateWith(['甲', '乙']);
    const next = runState(state, (d) => insertBlockAbove(state, d, 1));
    expect(next.selection.$from.parent.textContent).toBe('');
    expect(next.selection.$from.depth).toBe(1);
  });
});

describe('blockMenuItems', () => {
  // Craft's block menus vary per block type (V43), but every entry we render has to do
  // something — 提醒我／转换为卡片／添加表情 stay out until they have a local action.
  it('offers the Craft block actions, delete last', () => {
    expect(blockMenuItems({ canDelete: true }).map((item) => item.id)).toEqual([
      'insert-above',
      'insert-below',
      'move-up',
      'move-down',
      'move-top',
      'move-bottom',
      'copy-link',
      'convert-card',
      'add-comment',
      'delete',
    ]);
  });

  it('labels every entry with the wording Craft shows', () => {
    expect(blockMenuItems({ canDelete: true }).map((item) => item.label)).toEqual([
      '在上方插入区块',
      '在下方插入区块',
      '上移',
      '下移',
      '移至顶部',
      '移至底部',
      '复制区块链接',
      '转换为卡片',
      '添加评论',
      '删除',
    ]);
  });

  it('offers 提醒我… only on a task item', () => {
    expect(blockMenuItems({ canDelete: true }).map((item) => item.id)).not.toContain('remind');
    expect(blockMenuItems({ canDelete: true, isTask: true }).map((item) => item.id)).toContain('remind');
  });

  it('withholds 删除 from the only block in the document', () => {
    // deleteBlock refuses to empty the document, so an entry that can only fail
    // would surface as an uncaught error instead of doing nothing visible.
    expect(blockMenuItems({ canDelete: false }).map((item) => item.id)).toEqual([
      'insert-above',
      'insert-below',
      'move-up',
      'move-down',
      'move-top',
      'move-bottom',
      'copy-link',
      'convert-card',
      'add-comment',
    ]);
  });

  it('never lists the same entry twice', () => {
    for (const canDelete of [true, false]) {
      const ids = blockMenuItems({ canDelete }).map((item) => item.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe('insertBlockBelow', () => {
  it('adds an empty block directly after the addressed one', () => {
    const state = stateWith(['甲', '乙', '丙']);
    expect(run(state, (d) => insertBlockBelow(state, d, 1))).toEqual(blocks('甲', '乙', null, '丙'));
  });

  it('accepts the last block', () => {
    const state = stateWith(['甲', '乙']);
    expect(run(state, (d) => insertBlockBelow(state, d, 1))).toEqual(blocks('甲', '乙', null));
  });
});

describe('insertBlockAbove', () => {
  it('adds an empty block directly before the addressed one', () => {
    const state = stateWith(['甲', '乙']);
    expect(run(state, (d) => insertBlockAbove(state, d, 1))).toEqual(blocks('甲', null, '乙'));
  });

  it('can address the first block', () => {
    const state = stateWith(['甲']);
    expect(run(state, (d) => insertBlockAbove(state, d, 0))).toEqual(blocks(null, '甲'));
  });
});

describe('deleteBlock', () => {
  it('removes only the addressed block', () => {
    const state = stateWith(['甲', '乙', '丙']);
    expect(run(state, (d) => deleteBlock(state, d, 1))).toEqual(blocks('甲', '丙'));
  });

  it('does not merge its neighbours', () => {
    const state = stateWith(['甲', '乙', '丙']);
    const shape = run(state, (d) => deleteBlock(state, d, 1));
    expect(shape).toHaveLength(2);
    expect(shape[0][1]).toBe('甲');
    expect(shape[1][1]).toBe('丙');
  });

  it('refuses to empty the document', () => {
    const state = stateWith(['甲']);
    expect(() => run(state, (d) => deleteBlock(state, d, 0))).toThrow();
  });
});

describe('convertBlockToCard', () => {
  it('wraps the addressed block in a card and keeps its text', () => {
    const state = stateWith(['甲', '乙']);
    const next = runState(state, (d) => applyBlockAction(state, d, 0, 'convert-card'));
    expect(next.doc.child(0).type.name).toBe('cardBlock');
    expect(next.doc.child(0).textContent).toBe('甲');
    expect(next.doc.child(1).type.name).toBe('paragraph');
  });

  it('does not nest a card that is already a card', () => {
    const state = stateWith(['甲']);
    const once = runState(state, (d) => applyBlockAction(state, d, 0, 'convert-card'));
    expect(() => run(once, (d) => applyBlockAction(once, d, 0, 'convert-card'))).toThrow(
      'the action dispatched nothing',
    );
  });
});

describe('setTaskReminder', () => {
  function taskState() {
    const doc = schema.nodes.doc.create(null, [
      schema.nodes.taskItem.create(null, schema.text('买牛奶')),
    ]);
    return EditorState.create({ schema, doc });
  }

  it('writes the resolved instant onto a task item', () => {
    const state = taskState();
    const now = new Date('2026-10-13T10:00:00Z');
    const next = runState(state, (d) => setTaskReminder(state, d, 0, 'in1hour', now));
    expect(next.doc.child(0).attrs.remindAt).toBe('2026-10-13T11:00:00.000Z');
  });

  it('clears the reminder for a preset with no computed time', () => {
    const state = taskState();
    const next = runState(state, (d) => setTaskReminder(state, d, 0, 'saveForLater', new Date()));
    expect(next.doc.child(0).attrs.remindAt).toBeNull();
  });

  it('clears a reminder that was set', () => {
    const state = taskState();
    const set = runState(state, (d) => setTaskReminder(state, d, 0, 'in1hour', new Date()));
    const cleared = runState(set, (d) => clearTaskReminder(set, d, 0));
    expect(cleared.doc.child(0).attrs.remindAt).toBeNull();
  });

  it('does nothing when there is no reminder to clear', () => {
    const state = taskState();
    expect(() => run(state, (d) => clearTaskReminder(state, d, 0))).toThrow(
      'the action dispatched nothing',
    );
  });

  it('does nothing to a block that is not a task', () => {
    const state = stateWith(['甲']);
    expect(() => run(state, (d) => setTaskReminder(state, d, 0, 'in20min', new Date()))).toThrow(
      'the action dispatched nothing',
    );
  });
});

describe('the move entries', () => {
  it('moves the addressed block up one', () => {
    const state = stateWith(['甲', '乙', '丙']);
    expect(run(state, (d) => applyBlockAction(state, d, 1, 'move-up'))).toEqual(blocks('乙', '甲', '丙'));
  });

  it('moves the addressed block down one', () => {
    const state = stateWith(['甲', '乙', '丙']);
    expect(run(state, (d) => applyBlockAction(state, d, 1, 'move-down'))).toEqual(blocks('甲', '丙', '乙'));
  });

  it('moves the addressed block to the top and to the bottom', () => {
    const state = stateWith(['甲', '乙', '丙']);
    expect(run(state, (d) => applyBlockAction(state, d, 2, 'move-top'))).toEqual(blocks('丙', '甲', '乙'));
    expect(run(state, (d) => applyBlockAction(state, d, 0, 'move-bottom'))).toEqual(blocks('乙', '丙', '甲'));
  });

  it('dispatches nothing when the block is already at the edge', () => {
    const state = stateWith(['甲', '乙']);
    expect(() => run(state, (d) => applyBlockAction(state, d, 0, 'move-up'))).toThrow(
      'the action dispatched nothing',
    );
  });
});

describe('blockLinkFor', () => {
  const ID = '11111111-1111-4111-8111-111111111111';

  it('mints an id for a block that has none and stamps it on', () => {
    const state = stateWith(['甲', '乙']);
    const next = runState(state, (d) => {
      const link = blockLinkFor(state, d, 1, 'doc-1', () => ID);
      expect(link).toBe(`/documents/doc-1#b-${ID}`);
    });
    expect(next.doc.child(1).attrs.blockId).toBe(ID);
    expect(next.doc.child(0).attrs.blockId).toBeNull();
  });

  it('reuses an id the block already carries and writes nothing', () => {
    const base = stateWith(['甲']);
    const stamped = base.apply(
      base.tr.setNodeMarkup(0, undefined, { ...base.doc.child(0).attrs, blockId: ID }),
    );
    const link = blockLinkFor(stamped, () => { throw new Error('should not dispatch'); }, 0, 'doc-1', () => 'fresh');
    expect(link).toBe(`/documents/doc-1#b-${ID}`);
  });
});

describe('applyBlockAction', () => {
  it('runs the entry the menu labelled 在上方插入区块', () => {
    const state = stateWith(['甲', '乙']);
    expect(run(state, (d) => applyBlockAction(state, d, 1, 'insert-above'))).toEqual(blocks('甲', null, '乙'));
  });

  it('runs the entry the menu labelled 在下方插入区块', () => {
    const state = stateWith(['甲', '乙']);
    expect(run(state, (d) => applyBlockAction(state, d, 0, 'insert-below'))).toEqual(blocks('甲', null, '乙'));
  });

  it('runs the entry the menu labelled 删除', () => {
    const state = stateWith(['甲', '乙']);
    expect(run(state, (d) => applyBlockAction(state, d, 0, 'delete'))).toEqual(blocks('乙'));
  });

  it('dispatches nothing for an id the menu does not offer', () => {
    const state = stateWith(['甲']);
    expect(() => run(state, (d) => applyBlockAction(state, d, 0, 'remind-me' as never))).toThrow(
      'the action dispatched nothing',
    );
  });

  it('covers every id the menu offers except the one that leaves the editor', () => {
    // 复制区块链接 needs the document id and the clipboard, so it is not a transaction.
    // The middle block can move in every direction; the first one cannot move up.
    const state = stateWith(['甲', '乙', '丙']);
    for (const item of blockMenuItems({ canDelete: true })) {
      // 复制区块链接 leaves the editor; 提醒我… opens a submenu instead of a transaction.
      // 复制区块链接 leaves the editor; 提醒我… and 添加评论 open other surfaces.
      if (item.id === 'copy-link' || item.id === 'remind' || item.id === 'add-comment') continue;
      expect(() => run(state, (d) => applyBlockAction(state, d, 1, item.id))).not.toThrow();
    }
  });
});
