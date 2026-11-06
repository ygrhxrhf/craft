import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';
import { Schema } from '@tiptap/pm/model';
import { EditorState, TextSelection } from '@tiptap/pm/state';

import { applyToggleList } from './toggle-list';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'text*', group: 'block' },
    toggleBlock: { content: 'block+', group: 'block' },
    bulletList: { content: 'listItem+', group: 'block' },
    listItem: { content: 'paragraph block*' },
    text: {},
  },
  marks: {},
});

function hostWith(doc: ReturnType<typeof schema.nodes.doc.create>, selectionPos: number) {
  const state = EditorState.create({ schema, doc, selection: TextSelection.create(doc, selectionPos) });
  const applied: EditorState[] = [];
  const calls: string[] = [];
  const chain = {
    focus: () => ({
      setToggleBlock: () => ({
        run: () => {
          calls.push('setToggleBlock');
          return true;
        },
      }),
    }),
  };
  return {
    host: {
      state,
      dispatch: (tr: Parameters<typeof state.apply>[0]) => applied.push(state.apply(tr)),
      chain: () => chain,
    },
    applied,
    calls,
  };
}

describe('G517 折叠列表＝列表样式切换', () => {
  it('顶层段落就地换成折叠块（正文跟着走，不再插一个空块）', () => {
    const doc = schema.nodes.doc.create(null, [schema.nodes.paragraph.create(null, schema.text('alpha'))]);
    const { host, applied, calls } = hostWith(doc, 3);
    expect(applyToggleList(host)).toBe(true);
    expect(calls).toEqual([]);
    expect(applied).toHaveLength(1);
    const block = applied[0].doc.child(0);
    expect(block.type.name).toBe('toggleBlock');
    expect(block.textContent).toBe('alpha');
  });

  it('已经在折叠块里则拆回普通段落', () => {
    const doc = schema.nodes.doc.create(null, [
      schema.nodes.toggleBlock.create(null, [schema.nodes.paragraph.create(null, schema.text('alpha'))]),
    ]);
    const { host, applied } = hostWith(doc, 3);
    expect(applyToggleList(host)).toBe(true);
    expect(applied).toHaveLength(1);
    expect(applied[0].doc.child(0).type.name).toBe('paragraph');
    expect(applied[0].doc.child(0).textContent).toBe('alpha');
  });

  it('列表项里没有可换的顶层段落，退回插入新折叠块', () => {
    const doc = schema.nodes.doc.create(null, [
      schema.nodes.bulletList.create(null, [
        schema.nodes.listItem.create(null, [schema.nodes.paragraph.create(null, schema.text('alpha'))]),
      ]),
    ]);
    const { host, applied, calls } = hostWith(doc, 4);
    expect(applyToggleList(host)).toBe(true);
    expect(applied).toHaveLength(0);
    expect(calls).toEqual(['setToggleBlock']);
  });
});

describe('两条入口都接到这支切换上', () => {
  it('快捷键与格式面板共用 applyToggleList', () => {
    const keymap = readFileSync('src/components/editor/extensions/craft-keymap.ts', 'utf8');
    expect(keymap).toContain('applyToggleList({');
    // TipTap 内置的 Mod-Shift-7 会抢这枚弦，必须在捕获阶段截下。
    expect(keymap).toContain("event.code === 'Digit7'");
    const controls = readFileSync('src/lib/editor/format-commands.ts', 'utf8');
    expect(controls).toContain('apply: (h) => void applyToggleList(h)');
  });
});