import { describe, expect, it } from 'vitest';
import { Schema, type Node } from '@tiptap/pm/model';
import { EditorState, TextSelection, type Transaction } from '@tiptap/pm/state';

import {
  alignPresence,
  alignValues,
  clearListFormat,
  inlineMarkState,
  listKindsIn,
  listPresence,
  markPresence,
  markTriState,
  ALIGNABLE_TYPES,
} from './format-presence';

// 与线上编辑器同形：可对齐的是 heading/paragraph，列表三族各有包装节点，折叠块自己就是容器。
const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'text*', attrs: { textAlign: { default: null } } },
    heading: { group: 'block', content: 'text*', attrs: { level: { default: 1 }, textAlign: { default: null } } },
    codeBlock: { group: 'block', content: 'text*' },
    bulletList: { group: 'block', content: 'listItem+' },
    orderedList: { group: 'block', content: 'listItem+' },
    taskList: { group: 'block', content: 'taskItem+' },
    listItem: { group: 'block', content: 'paragraph block*' },
    taskItem: { group: 'block', content: 'paragraph block*' },
    toggleBlock: { group: 'block', content: 'block+', defining: true },
    text: { marks: 'bold italic strike code' },
  },
  marks: { bold: {}, italic: {}, strike: {}, code: {} },
});

const n = schema.nodes;

function doc(...children: Node[]) {
  return n.doc.create(null, children);
}
function p(text: string, attrs: Record<string, unknown> = {}) {
  return n.paragraph.create(attrs, text ? schema.text(text) : null);
}
function marked(...runs: [string, string[]][]) {
  return n.paragraph.create(
    null,
    runs.map(([text, marks]) => schema.text(text, marks.map((name) => schema.marks[name].create()))),
  );
}
function list(kind: 'bullet' | 'ordered' | 'task', ...items: string[]) {
  const listNode = kind === 'bullet' ? n.bulletList : kind === 'ordered' ? n.orderedList : n.taskList;
  const item = kind === 'task' ? n.taskItem : n.listItem;
  return listNode.create(null, items.map((text) => item.create(null, p(text))));
}
function bulletOf(...children: Node[]) {
  return n.bulletList.create(null, n.listItem.create(null, children));
}

function shape(document: Node) {
  const names: string[] = [];
  document.forEach((child) => names.push(child.type.name));
  return names;
}

/** 按正文里的字面串定位，返回覆盖该串的绝对选区（`last` 省略＝只盖住 `first`）。 */
function span(document: Node, first: string, last = first): [number, number] {
  let found: [number, number] | null = null;
  document.descendants((node, pos) => {
    if (found || !node.isText) return;
    const index = node.text?.indexOf(first) ?? -1;
    if (index >= 0) found = [pos + index, pos + index + first.length];
  });
  if (!found) throw new Error(`fixture text missing: ${first}`);
  if (last === first) return found;
  let end: number | null = null;
  document.descendants((node, pos) => {
    if (end !== null || !node.isText) return;
    const index = node.text?.indexOf(last) ?? -1;
    if (index >= 0) end = pos + index + last.length;
  });
  if (end === null) throw new Error(`fixture text missing: ${last}`);
  return [found[0], end];
}
/** 光标停在串首字符之前。 */
function caret(document: Node, text: string, offset = 0) {
  return span(document, text)[0] + offset;
}

function stateOf(document: Node, from: number, to = from) {
  return EditorState.create({ doc: document, selection: TextSelection.create(document, from, to) });
}

/** 跑一遍写侧：返回是否改动、派发了几条事务、以及新文档。 */
function applyClear(document: Node, from: number, to = from) {
  const dispatched: Transaction[] = [];
  const changed = clearListFormat(stateOf(document, from, to), (tr) => {
    dispatched.push(tr);
  });
  return { changed, dispatched, result: dispatched[0]?.doc };
}

describe('markTriState（G154 三态指示的行内格式半）', () => {
  const sample = doc(marked(['all bold', ['bold']], ['gap ', []], ['tail', ['italic']]));

  it('counts characters, not nodes', () => {
    expect(markPresence(sample, ...span(sample, 'all bold'), 'bold')).toEqual({ marked: 8, total: 8 });
    expect(markTriState(sample, ...span(sample, 'all bold'), 'bold')).toBe('on');
  });

  it('is off when nothing in the selection carries the mark', () => {
    expect(markTriState(sample, ...span(sample, 'gap '), 'bold')).toBe('off');
  });

  it('is mixed when only part of the selection carries it', () => {
    expect(markTriState(sample, ...span(sample, 'tail'), 'italic')).toBe('on');
    expect(markTriState(sample, ...span(sample, 'gap ', 'tail'), 'italic')).toBe('mixed');
  });

  it('has no mixed claim for an empty selection', () => {
    expect(markTriState(sample, caret(sample, 'all bold'), caret(sample, 'all bold'), 'bold')).toBe('off');
  });

  it('reads the caret position from the marks under it', () => {
    const bold = doc(marked(['inside', ['bold']]));
    expect(inlineMarkState(stateOf(bold, caret(bold, 'inside', 2)), 'bold')).toBe('on');
    expect(inlineMarkState(stateOf(bold, caret(bold, 'inside', 2)), 'italic')).toBe('off');
    const plain = doc(p('plain'));
    expect(inlineMarkState(stateOf(plain, caret(plain, 'plain', 1)), 'bold')).toBe('off');
  });
});

describe('alignPresence（G153 对齐五档的判档）', () => {
  it('reports the single value every alignable block shares', () => {
    const sample = doc(p('one', { textAlign: 'center' }), p('two', { textAlign: 'center' }));
    expect(alignValues(sample, ...span(sample, 'one', 'two'))).toEqual(['center']);
    expect(alignPresence(sample, ...span(sample, 'one', 'two'))).toEqual({ value: 'center', mixed: false, empty: false });
  });

  it('treats the missing attribute as the 默认 value, distinct from an explicit left', () => {
    const sample = doc(p('default'), p('left', { textAlign: 'left' }));
    expect(alignValues(sample, ...span(sample, 'default', 'left'))).toEqual([null, 'left']);
    expect(alignPresence(sample, ...span(sample, 'default', 'left'))).toEqual({
      value: null,
      mixed: true,
      empty: false,
    });
  });

  it('goes mixed across justify and center', () => {
    const sample = doc(p('jus', { textAlign: 'justify' }), p('cen', { textAlign: 'center' }));
    expect(alignPresence(sample, ...span(sample, 'jus', 'cen')).mixed).toBe(true);
  });

  it('counts a heading and a paragraph with the same alignment as one value', () => {
    const sample = doc(
      n.heading.create({ level: 2, textAlign: 'right' }, schema.text('head')),
      p('body', { textAlign: 'right' }),
    );
    expect(alignPresence(sample, ...span(sample, 'head', 'body'))).toEqual({ value: 'right', mixed: false, empty: false });
  });

  it('uses the caret block alone for an empty selection', () => {
    const sample = doc(p('cen', { textAlign: 'center' }), p('plain'));
    expect(alignPresence(sample, caret(sample, 'plain'), caret(sample, 'plain'))).toEqual({
      value: null,
      mixed: false,
      empty: false,
    });
    expect(alignPresence(sample, caret(sample, 'cen'), caret(sample, 'cen'))).toEqual({
      value: 'center',
      mixed: false,
      empty: false,
    });
  });

  it('declares the selection empty of alignable blocks in a code block', () => {
    const sample = doc(n.codeBlock.create(null, schema.text('code')));
    expect(alignPresence(sample, ...span(sample, 'code'))).toEqual({ value: null, mixed: false, empty: true });
  });

  it('only asks the types TextAlign actually writes', () => {
    expect(ALIGNABLE_TYPES).toEqual(['heading', 'paragraph']);
  });
});

describe('listPresence（G155 列表五档的判档）', () => {
  it('names the wrapping list', () => {
    const sample = doc(list('bullet', 'a', 'b'));
    expect(listKindsIn(sample, ...span(sample, 'a', 'b'))).toEqual(['bullet']);
    expect(listPresence(sample, ...span(sample, 'a', 'b'))).toEqual({ kind: 'bullet', mixed: false, empty: false });
  });

  it('distinguishes the three list families and the toggle', () => {
    const task = doc(list('task', 'a'));
    expect(listPresence(task, ...span(task, 'a')).kind).toBe('todo');
    const ordered = doc(list('ordered', 'a'));
    expect(listPresence(ordered, ...span(ordered, 'a')).kind).toBe('numbered');
    const toggle = doc(n.toggleBlock.create(null, p('a')));
    expect(listPresence(toggle, ...span(toggle, 'a')).kind).toBe('toggle');
  });

  it('reports none for a block that is not in any list', () => {
    const sample = doc(p('free'));
    expect(listPresence(sample, ...span(sample, 'free'))).toEqual({ kind: 'none', mixed: false, empty: false });
  });

  it('goes mixed when the selection crosses a list and plain text', () => {
    const sample = doc(list('bullet', 'in list'), p('out of list'));
    expect(listKindsIn(sample, ...span(sample, 'in list', 'out of list'))).toEqual(['bullet', 'none']);
    expect(listPresence(sample, ...span(sample, 'in list', 'out of list')).mixed).toBe(true);
  });

  it('reads the nearest wrapper for a nested list', () => {
    const sample = doc(bulletOf(p('outer'), list('ordered', 'deep')));
    expect(listPresence(sample, caret(sample, 'deep'), caret(sample, 'deep')).kind).toBe('numbered');
  });

  it('uses the caret block for an empty selection', () => {
    const sample = doc(list('bullet', 'a'), p('b'));
    expect(listPresence(sample, caret(sample, 'a', 1), caret(sample, 'a', 1)).kind).toBe('bullet');
    expect(listPresence(sample, caret(sample, 'b'), caret(sample, 'b')).kind).toBe('none');
  });

  it('has no kind outside any text block', () => {
    expect(listKindsIn(doc(p('a')), 0, 0)).toEqual([]);
  });
});

describe('clearListFormat（G155 取消列表格式的写侧）', () => {
  it('lifts the block out of the list and drops the now-empty list', () => {
    const sample = doc(list('bullet', 'only'));
    const { changed, dispatched, result } = applyClear(sample, caret(sample, 'only', 1));
    expect(changed).toBe(true);
    expect(dispatched).toHaveLength(1);
    expect(shape(result!)).toEqual(['paragraph']);
    expect(result!.textContent).toBe('only');
  });

  it('keeps the untouched siblings in the list, split around the lifted block', () => {
    const sample = doc(list('bullet', 'keep 1', 'lift me', 'keep 2'));
    const { result } = applyClear(sample, caret(sample, 'lift me', 1));
    expect(shape(result!)).toEqual(['bulletList', 'paragraph', 'bulletList']);
    expect(result!.child(1).textContent).toBe('lift me');
    expect(result!.child(0).textContent).toBe('keep 1');
    expect(result!.child(2).textContent).toBe('keep 2');
  });

  it('lifts an edge item and leaves exactly the two rows the split needs', () => {
    const sample = doc(list('bullet', 'one', 'two'));
    expect(shape(applyClear(sample, caret(sample, 'two', 1)).result!)).toEqual(['bulletList', 'paragraph']);
    expect(shape(applyClear(sample, caret(sample, 'one', 1)).result!)).toEqual(['paragraph', 'bulletList']);
    const three = doc(list('bullet', 'a', 'b', 'c'));
    expect(shape(applyClear(three, caret(three, 'b', 1)).result!)).toEqual([
      'bulletList',
      'paragraph',
      'bulletList',
    ]);
  });

  it('lifts every item the selection touches', () => {
    const sample = doc(list('bullet', 'one', 'two'), p('three'));
    expect(shape(applyClear(sample, ...span(sample, 'one', 'three')).result!)).toEqual([
      'paragraph',
      'paragraph',
      'paragraph',
    ]);
  });

  it('unwraps a nested list all the way to the top level', () => {
    const sample = doc(bulletOf(p('outer'), list('ordered', 'deep')));
    const { result } = applyClear(sample, caret(sample, 'deep', 1));
    expect(result!.child(1).type.name).toBe('paragraph');
    expect(result!.child(1).textContent).toBe('deep');
    expect(listPresence(result!, caret(result!, 'deep'), caret(result!, 'deep')).kind).toBe('none');
  });

  it('unwraps a toggle block', () => {
    const sample = doc(n.toggleBlock.create(null, p('hidden')));
    const { result } = applyClear(sample, caret(sample, 'hidden', 1));
    expect(shape(result!)).toEqual(['paragraph']);
    expect(result!.textContent).toBe('hidden');
  });

  it('leaves a task item behind its list', () => {
    const sample = doc(list('task', 'do it'));
    const { result } = applyClear(sample, caret(sample, 'do it', 1));
    expect(shape(result!)).toEqual(['paragraph']);
    expect(result!.textContent).toBe('do it');
  });

  it('keeps the block content and its marks intact', () => {
    const sample = doc(bulletOf(marked(['strong ', ['bold']], ['word', []])));
    const { result } = applyClear(sample, caret(sample, 'strong', 1));
    const boldRuns: string[] = [];
    result!.descendants((node) => {
      if (node.isText && node.marks.some((mark) => mark.type.name === 'bold')) boldRuns.push(node.text!);
    });
    expect(shape(result!)).toEqual(['paragraph']);
    expect(boldRuns).toEqual(['strong ']);
  });

  it('declines when the selection is already plain blocks', () => {
    const sample = doc(p('plain one'), p('plain two'));
    const { changed, dispatched } = applyClear(sample, ...span(sample, 'plain one', 'plain two'));
    expect(changed).toBe(false);
    expect(dispatched).toHaveLength(0);
  });

  it('queries without writing when no dispatcher is given', () => {
    const sample = doc(list('bullet', 'only'));
    expect(clearListFormat(stateOf(sample, caret(sample, 'only', 1)))).toBe(true);
    expect(shape(sample)).toEqual(['bulletList']);
  });
});
