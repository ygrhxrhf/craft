import { describe, expect, it } from 'vitest';
import { Schema } from '@tiptap/pm/model';
import { EditorState, TextSelection } from '@tiptap/pm/state';
import type { Transaction } from '@tiptap/pm/state';
import {
  applyBlockAction,
  setCalloutType,
  setDividerStyle,
  setBlockEmoji,
  clearTaskReminder,
  setTaskReminder,
  setTaskCancelled,
  toggleTaskCancelledAtSelection,
  taskItemTarget,
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
    paragraph: { content: 'text*', group: 'block', attrs: { blockId: { default: null }, emoji: { default: null } } },
    cardBlock: { content: 'block+', group: 'block' },
    taskItem: {
      content: 'text*',
      group: 'block',
      attrs: {
        remindAt: { default: null },
        checked: { default: false },
        cancelled: { default: false },
        cancelledAt: { default: null },
      },
    },
    // 真实编辑器里 taskItem 就是被 taskList 包着的（TipTap `TaskList` 的 content 是 `taskItem+`），
    // 顶层裸 taskItem 那一形来自导入与旧数据。两形都必须在测试里出现，否则"菜单只认顶层 taskItem"
    // 这类失灵在单测里是看不见的（G1496）。
    taskList: { content: 'taskItem+', group: 'block' },
    toggleBlock: { content: 'block+', group: 'block', attrs: { open: { default: false } } },
    divider: { group: 'block', atom: true, attrs: { style: { default: 'regular' } } },
    callout: { content: 'block+', group: 'block', attrs: { type: { default: 'info' } } },
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
      'add-content',
      'insert-above',
      'insert-below',
      'move-up',
      'move-down',
      'move-top',
      'move-bottom',
      'copy-link',
      'convert-card',
      'add-comment',
      'add-emoji',
      'delete',
    ]);
  });

  it('labels every entry with the wording Craft shows', () => {
    expect(blockMenuItems({ canDelete: true }).map((item) => item.label)).toEqual([
      '添加内容',
      '在上方插入区块',
      '在下方插入区块',
      '上移',
      '下移',
      '移至顶部',
      '移至底部',
      '复制区块链接',
      '转换为卡片',
      '添加评论',
      '添加表情',
      '删除',
    ]);
  });

  it('offers 提示类型 only on a callout', () => {
    expect(blockMenuItems({ canDelete: true, isCallout: true }).map((item) => item.label)).toContain('提示类型');
    expect(blockMenuItems({ canDelete: true }).map((item) => item.id)).not.toContain('callout-type');
  });

  it('offers 分隔符样式 only on a divider', () => {
    expect(blockMenuItems({ canDelete: true, isDivider: true }).map((item) => item.label)).toContain('分隔符样式');
    expect(blockMenuItems({ canDelete: true }).map((item) => item.id)).not.toContain('divider-style');
  });

  it('offers 展开 on a closed toggle and 收起 on an open one', () => {
    const closed = blockMenuItems({ canDelete: true, isToggle: true });
    expect(closed.map((item) => item.label)).toContain('展开');
    const open = blockMenuItems({ canDelete: true, isToggle: true, toggleOpen: true });
    expect(open.map((item) => item.label)).toContain('收起');
    expect(blockMenuItems({ canDelete: true }).map((item) => item.id)).not.toContain('toggle-open');
  });

  it('offers 提醒我… only on a task item', () => {
    expect(blockMenuItems({ canDelete: true }).map((item) => item.id)).not.toContain('remind');
    expect(blockMenuItems({ canDelete: true, isTask: true }).map((item) => item.id)).toContain('remind');
  });

  it('withholds 删除 from the only block in the document', () => {
    // deleteBlock refuses to empty the document, so an entry that can only fail
    // would surface as an uncaught error instead of doing nothing visible.
    expect(blockMenuItems({ canDelete: false }).map((item) => item.id)).toEqual([
      'add-content',
      'insert-above',
      'insert-below',
      'move-up',
      'move-down',
      'move-top',
      'move-bottom',
      'copy-link',
      'convert-card',
      'add-comment',
      'add-emoji',
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

describe('setCalloutType', () => {
  function calloutState() {
    const doc = schema.nodes.doc.create(null, [
      schema.nodes.callout.create({ type: 'info' }, schema.nodes.paragraph.create(null, schema.text('甲'))),
    ]);
    return EditorState.create({ schema, doc });
  }

  it('changes the kind and keeps the text', () => {
    const state = calloutState();
    const next = runState(state, (d) => setCalloutType(state, d, 0, 'warning'));
    expect(next.doc.child(0).attrs.type).toBe('warning');
    expect(next.doc.child(0).textContent).toBe('甲');
  });

  it('does nothing to a block that is not a callout', () => {
    const state = stateWith(['甲']);
    expect(() => run(state, (d) => setCalloutType(state, d, 0, 'note'))).toThrow(
      'the action dispatched nothing',
    );
  });
});

describe('setDividerStyle', () => {
  function dividerState() {
    const doc = schema.nodes.doc.create(null, [schema.nodes.divider.create({ style: 'regular' })]);
    return EditorState.create({ schema, doc });
  }

  it('changes the weight of a divider', () => {
    const state = dividerState();
    const next = runState(state, (d) => setDividerStyle(state, d, 0, 'strong'));
    expect(next.doc.child(0).attrs.style).toBe('strong');
  });

  it('does nothing to a block that is not a divider', () => {
    const state = stateWith(['甲']);
    expect(() => run(state, (d) => setDividerStyle(state, d, 0, 'light'))).toThrow(
      'the action dispatched nothing',
    );
  });
});

describe('addContentBelow', () => {
  it('inserts a slash block directly after the addressed one, caret after the slash', () => {
    const state = stateWith(['甲', '乙']);
    const next = runState(state, (d) => applyBlockAction(state, d, 0, 'add-content'));
    expect(next.doc.child(1).textContent).toBe('/');
    expect(next.doc.child(0).textContent).toBe('甲');
    expect(next.selection.$from.parent).toBe(next.doc.child(1));
    expect(next.selection.$from.parentOffset).toBe(1);
  });
});

describe('toggleBlockOpen', () => {
  function toggleState(open: boolean) {
    const doc = schema.nodes.doc.create(null, [
      schema.nodes.toggleBlock.create({ open }, schema.nodes.paragraph.create(null, schema.text('甲'))),
    ]);
    return EditorState.create({ schema, doc });
  }

  it('opens a closed toggle and closes an open one', () => {
    const closed = toggleState(false);
    const opened = runState(closed, (d) => applyBlockAction(closed, d, 0, 'toggle-open'));
    expect(opened.doc.child(0).attrs.open).toBe(true);
    const shut = runState(opened, (d) => applyBlockAction(opened, d, 0, 'toggle-open'));
    expect(shut.doc.child(0).attrs.open).toBe(false);
  });

  it('does nothing to a block that is not a toggle', () => {
    const state = stateWith(['甲']);
    expect(() => run(state, (d) => applyBlockAction(state, d, 0, 'toggle-open'))).toThrow(
      'the action dispatched nothing',
    );
  });
});

describe('setBlockEmoji', () => {
  it('puts the emoji on the block', () => {
    const state = stateWith(['甲']);
    const next = runState(state, (d) => setBlockEmoji(state, d, 0, '👍'));
    expect(next.doc.child(0).attrs.emoji).toBe('👍');
  });

  it('clears the emoji when the same one is picked again', () => {
    const state = stateWith(['甲']);
    const once = runState(state, (d) => setBlockEmoji(state, d, 0, '👍'));
    const twice = runState(once, (d) => setBlockEmoji(once, d, 0, '👍'));
    expect(twice.doc.child(0).attrs.emoji).toBeNull();
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
      if (item.id === 'copy-link' || item.id === 'remind' || item.id === 'add-comment' || item.id === 'add-emoji' || item.id === 'divider-style' || item.id === 'callout-type') continue;
      expect(() => run(state, (d) => applyBlockAction(state, d, 1, item.id))).not.toThrow();
    }
  });
});

describe('取消＝同一枚轴上的第三档（G52）', () => {
  const CANCEL_AT = new Date('2026-10-14T02:00:00.000Z');

  function flatTask(overrides: Record<string, unknown> = {}) {
    const doc = schema.nodes.doc.create(null, [
      schema.nodes.taskItem.create({ checked: false, ...overrides }, schema.text('买牛奶')),
    ]);
    return EditorState.create({ schema, doc });
  }

  /** 真实编辑器的那一形：`taskList > taskItem…`，光标默认落在文档开头，够不着任何一行。 */
  function nestedTasks(labels: string[], caretIn: number) {
    const list = schema.nodes.taskList.create(
      null,
      labels.map((label) => schema.nodes.taskItem.create(null, schema.text(label))),
    );
    const doc = schema.nodes.doc.create(null, [
      schema.nodes.paragraph.create(null, schema.text('前言')),
      list,
    ]);
    let seen = -1;
    let pos = -1;
    doc.descendants((node, at) => {
      if (node.type.name !== 'taskItem') return true;
      seen += 1;
      if (seen === caretIn) {
        pos = at + 1;
        return false;
      }
      return true;
    });
    return EditorState.create({
      schema,
      doc,
      selection: TextSelection.near(doc.resolve(pos)),
    });
  }

  it('扁平任务行：置取消同时把勾让出来，并记一次时间戳', () => {
    const state = flatTask({ checked: true });
    const next = runState(state, (d) => setTaskCancelled(state, d, 0, CANCEL_AT));
    expect(next.doc.child(0).attrs).toMatchObject({
      checked: false,
      cancelled: true,
      cancelledAt: '2026-10-14T02:00:00.000Z',
    });
  });

  it('再点一次＝取消标记：清掉整档，不留下上一次的日期', () => {
    const state = flatTask();
    const cancelled = runState(state, (d) => setTaskCancelled(state, d, 0, CANCEL_AT));
    const back = runState(cancelled, (d) => setTaskCancelled(cancelled, d, 0, new Date('2026-11-01T00:00:00Z')));
    expect(back.doc.child(0).attrs).toMatchObject({ cancelled: false, cancelledAt: null });
  });

  it('菜单那一枚 id 与直接调用同一处（applyBlockAction 不许另开一条写属性的路）', () => {
    const state = flatTask();
    const viaMenu = runState(state, (d) => applyBlockAction(state, d, 0, 'set-cancelled'));
    expect(viaMenu.doc.child(0).attrs.cancelled).toBe(true);
    expect(typeof viaMenu.doc.child(0).attrs.cancelledAt).toBe('string');
  });

  it('嵌套形里菜单作用在光标那一行，不是整个列表的第一行', () => {
    // ★ 这一枚就是旧代码在真浏览器里静默失灵的地方：顶层块是 taskList，`child(index).type.name`
    //   永远不等于 taskItem，于是提醒与取消两枚菜单项一枚都点不到。
    const state = nestedTasks(['甲', '乙', '丙'], 1);
    const target = taskItemTarget(state, 1);
    expect(target?.node.textContent).toBe('乙');
    const next = runState(state, (d) => setTaskCancelled(state, d, 1, CANCEL_AT));
    const texts: string[] = [];
    next.doc.child(1).forEach((item) => texts.push(`${item.textContent}:${item.attrs.cancelled === true}`));
    expect(texts).toEqual(['甲:false', '乙:true', '丙:false']);
  });

  it('嵌套形里没光标时退回该块第一行，而不是什么都不做', () => {
    const state = nestedTasks(['甲', '乙'], 0);
    const noCaret = EditorState.create({ schema, doc: state.doc });
    const target = taskItemTarget(noCaret, 1);
    expect(target?.node.textContent).toBe('甲');
  });

  it('键盘那一路：作用在光标行，非任务行返回 false 让键继续冒泡', () => {
    const nested = nestedTasks(['甲', '乙'], 1);
    const next = runState(nested, (d) => {
      if (!toggleTaskCancelledAtSelection(nested, d, CANCEL_AT)) throw new Error('键被吃掉了');
    });
    expect(next.doc.child(1).child(1).attrs.cancelled).toBe(true);
    expect(next.doc.child(1).child(0).attrs.cancelled).toBe(false);

    const prose = stateWith(['甲']);
    const dispatched: Transaction[] = [];
    expect(toggleTaskCancelledAtSelection(prose, (tr) => dispatched.push(tr), CANCEL_AT)).toBe(false);
    expect(dispatched).toEqual([]);
  });

  it('文档里有两个任务列表时，键盘那一路取光标所在的那个列表，不是文档里第一个', () => {
    // taskItem 的 content 是 'text*'（TipTap 默认），真嵌套在这一形里造不出来；能踩到的是"整篇
    // 文档扫 taskItem，第一枚说了算"这类错——所以用两个并列列表把"前一列表的干扰行"摆出来。
    const doc = schema.nodes.doc.create(null, [
      schema.nodes.taskList.create(
        null,
        ['甲', '乙'].map((label) => schema.nodes.taskItem.create({ checked: true }, schema.text(label))),
      ),
      schema.nodes.taskList.create(
        null,
        ['丙', '丁'].map((label) => schema.nodes.taskItem.create(null, schema.text(label))),
      ),
    ]);
    let caretPos = -1;
    doc.descendants((node, at) => {
      if (node.type.name === 'taskItem' && node.child(0)?.text === '丁') {
        caretPos = at + 1;
        return false;
      }
      return true;
    });
    const state = EditorState.create({ schema, doc, selection: TextSelection.near(doc.resolve(caretPos)) });

    const next = runState(state, (d) => {
      if (!toggleTaskCancelledAtSelection(state, d, CANCEL_AT)) throw new Error('键被吃掉了');
    });
    const rows: [string, boolean][] = [];
    next.doc.forEach((list) =>
      list.forEach((item) => rows.push([item.textContent, item.attrs.cancelled === true])),
    );
    expect(rows).toEqual([
      ['甲', false],
      ['乙', false],
      ['丙', false],
      ['丁', true],
    ]);
  });

  it('菜单：任务块两枚齐全，普通块一枚都没有，已取消时标签翻成「取消标记」', () => {
    const plain = blockMenuItems({ canDelete: true }).map((item) => item.id);
    expect(plain).not.toContain('set-cancelled');
    expect(plain).not.toContain('remind');

    const ids = blockMenuItems({ canDelete: true, isTask: true }).map((item) => item.id);
    expect(ids).toContain('remind');
    expect(ids).toContain('set-cancelled');

    const labels = blockMenuItems({ canDelete: true, isTask: true, taskCancelled: true });
    expect(labels.find((item) => item.id === 'set-cancelled')?.label).toBe('取消标记');
    expect(
      blockMenuItems({ canDelete: true, isTask: true }).find((item) => item.id === 'set-cancelled')?.label,
    ).toBe('将任务标记为已取消');
  });

  it('非任务块上这枚菜单项不发事务（不许把段落改出属性）', () => {
    const state = stateWith(['甲']);
    expect(() => run(state, (d) => setTaskCancelled(state, d, 0, CANCEL_AT))).toThrow(
      'the action dispatched nothing',
    );
  });

  it('提醒那一路也一样两形通用（同一处寻址，不许只修取消那一半）', () => {
    const state = nestedTasks(['甲', '乙'], 1);
    const next = runState(state, (d) => setTaskReminder(state, d, 1, 'in1hour', new Date('2026-10-14T10:00:00Z')));
    expect(next.doc.child(1).child(1).attrs.remindAt).toBe('2026-10-14T11:00:00.000Z');
    expect(next.doc.child(1).child(0).attrs.remindAt).toBeNull();

    const cleared = runState(next, (d) => clearTaskReminder(next, d, 1));
    expect(cleared.doc.child(1).child(1).attrs.remindAt).toBeNull();
  });
});
