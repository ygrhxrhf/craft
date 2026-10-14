import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';
import { Schema } from '@tiptap/pm/model';
import { EditorState, TextSelection } from '@tiptap/pm/state';

import {
  ALIGNMENT_CONTROLS,
  GROUP_KEYS,
  INDENT_CONTROLS,
  INLINE_MARK_CONTROLS,
  LIST_CONTROLS,
  alignMixed,
  alignState,
  listMixed,
  listState,
  type FormatCommands,
  type FormatHost,
} from './format-commands';
import { MIXED_LABEL } from './format-presence';

const catalog = readFileSync(join(process.cwd(), 'docs/craft-ref/features/feature-catalog.md'), 'utf8');

/** 台账行的中文列可作逐字出处（英文兜底那一族在源头就坏了，不作数）。 */
function ledgerValue(key: string): string | null {
  const line = catalog.split('\n').find((row) => row.includes(` \`${key}\``));
  if (!line) return null;
  const match = /^-\s+(.+?)\s+`/.exec(line.trim());
  return match ? match[1] : null;
}

const everyControl = [
  ...ALIGNMENT_CONTROLS.map((c) => [c.key, c.label] as const),
  ...LIST_CONTROLS.map((c) => [c.key, c.label] as const),
  ...INDENT_CONTROLS.map((c) => [c.key, c.label] as const),
  ...INLINE_MARK_CONTROLS.map((c) => [c.key, c.label] as const),
  [GROUP_KEYS.align, GROUP_KEYS.alignLabel] as const,
  [GROUP_KEYS.indent, GROUP_KEYS.indentLabel] as const,
];

describe('the control labels are the ledger’s own sentences', () => {
  it('matches feature-catalog.md verbatim, one row per control', () => {
    for (const [key, label] of everyControl) {
      if (!key) continue;
      expect(ledgerValue(key), key).toBe(label);
    }
  });

  it('carries a ledger key for every档位 except the alignment 默认', () => {
    const missing = everyControl.filter(([key]) => key === null).map(([, label]) => label);
    expect(missing).toEqual(['默认']);
  });

  it('names the mixed indicator after style.mixed', () => {
    expect(ledgerValue('style.mixed')).toBe(MIXED_LABEL);
  });

  it('lists the five alignment and five list档位 the ledger counts', () => {
    expect(ALIGNMENT_CONTROLS).toHaveLength(5);
    expect(LIST_CONTROLS).toHaveLength(5);
    expect(LIST_CONTROLS.map((c) => c.kind)).toEqual(['todo', 'toggle', 'bullet', 'numbered', 'none']);
    expect(ALIGNMENT_CONTROLS.map((c) => c.value)).toEqual(['left', 'center', 'right', 'justify', null]);
  });
});

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'text*', attrs: { textAlign: { default: null } } },
    bulletList: { group: 'block', content: 'listItem+' },
    listItem: { group: 'block', content: 'paragraph block*' },
    text: { marks: 'bold' },
  },
  marks: { bold: {} },
});

function textState(...texts: string[]) {
  const doc = schema.nodes.doc.create(
    null,
    texts.map((text) => schema.nodes.paragraph.create(null, text ? schema.text(text) : null)),
  );
  return EditorState.create({ doc, selection: TextSelection.create(doc, 1, 1) });
}

/** 只记账命令名的假 chain：控件表调了哪条命令、按什么顺序，这里逐枚留痕。 */
function fakeHost(state = textState('alpha')) {
  const calls: string[] = [];
  const chain: FormatCommands = {
    focus: () => {
      calls.push('focus');
      return chain;
    },
    run: () => {
      calls.push('run');
      return true;
    },
    setTextAlign: (value: string) => {
      calls.push(`setTextAlign(${value})`);
      return chain;
    },
    unsetTextAlign: () => {
      calls.push('unsetTextAlign');
      return chain;
    },
    toggleBold: () => {
      calls.push('toggleBold');
      return chain;
    },
    toggleItalic: () => {
      calls.push('toggleItalic');
      return chain;
    },
    toggleStrike: () => {
      calls.push('toggleStrike');
      return chain;
    },
    toggleCode: () => {
      calls.push('toggleCode');
      return chain;
    },
    toggleTaskList: () => {
      calls.push('toggleTaskList');
      return chain;
    },
    setToggleBlock: () => {
      calls.push('setToggleBlock');
      return chain;
    },
    toggleBulletList: () => {
      calls.push('toggleBulletList');
      return chain;
    },
    toggleOrderedList: () => {
      calls.push('toggleOrderedList');
      return chain;
    },
    liftListItem: (type: string) => {
      calls.push(`liftListItem(${type})`);
      return chain;
    },
    sinkListItem: (type: string) => {
      calls.push(`sinkListItem(${type})`);
      return chain;
    },
  } as FormatCommands;
  const dispatched: number[] = [];
  const host: FormatHost = { chain: () => chain, state, dispatch: (tr) => dispatched.push(tr.steps.length) };
  return { host, calls, dispatched };
}

function bulletDoc(text: string) {
  return schema.nodes.doc.create(null, [
    schema.nodes.bulletList.create(
      null,
      schema.nodes.listItem.create(null, schema.nodes.paragraph.create(null, schema.text(text))),
    ),
  ]);
}

describe('every control fires the command its label promises', () => {
  it('writes the alignment value, and clears the attribute for 默认', () => {
    for (const control of ALIGNMENT_CONTROLS) {
      const { host, calls } = fakeHost();
      control.apply(host);
      expect(calls, control.label).toEqual(
        control.value === null ? ['focus', 'unsetTextAlign', 'run'] : ['focus', `setTextAlign(${control.value})`, 'run'],
      );
    }
  });

  it('reaches the list family through the four toggles and one explicit clear', () => {
    const expected: Record<string, string[]> = {
      待办列表: ['focus', 'toggleTaskList', 'run'],
      折叠列表: ['focus', 'setToggleBlock', 'run'],
      无序列表: ['focus', 'toggleBulletList', 'run'],
      编号列表: ['focus', 'toggleOrderedList', 'run'],
    };
    for (const control of LIST_CONTROLS) {
      const { host, calls } = fakeHost();
      control.apply(host);
      if (control.kind === 'none') {
        // 取消列表格式走 PM 自己的 lift，不需要 chain 命令；无列表时它应当一事务都不发。
        expect(calls).toEqual([]);
        continue;
      }
      expect(calls, control.label).toEqual(expected[control.label]);
    }
  });

  it('dispatches a real transaction for 取消列表格式 when the selection is in a list', () => {
    const doc = bulletDoc('alpha');
    const state = EditorState.create({ doc, selection: TextSelection.create(doc, 3, 3) });
    const { host, calls, dispatched } = fakeHost(state);
    LIST_CONTROLS.find((c) => c.kind === 'none')!.apply(host);
    expect(dispatched).toHaveLength(1);
    expect(calls).toEqual(['focus', 'run']);
  });

  it('keeps indentation and alignment in separate groups', () => {
    const out = fakeHost();
    INDENT_CONTROLS[0].apply(out.host);
    expect(out.calls).toEqual(['focus', 'liftListItem(listItem)', 'run']);
    const inHost = fakeHost();
    INDENT_CONTROLS[1].apply(inHost.host);
    expect(inHost.calls).toEqual(['focus', 'sinkListItem(listItem)', 'run']);
  });
});

describe('the mixed indicator lights no segment', () => {
  const centered = schema.nodes.paragraph.create({ textAlign: 'center' }, schema.text('one'));
  const plain = schema.nodes.paragraph.create(null, schema.text('two'));
  const mixedDoc = schema.nodes.doc.create(null, [centered, plain]);
  const mixedState = EditorState.create({
    doc: mixedDoc,
    selection: TextSelection.create(mixedDoc, 1, mixedDoc.content.size - 1),
  });

  it('suppresses every alignment value while the selection is mixed', () => {
    expect(alignMixed(mixedState)).toBe(true);
    for (const control of ALIGNMENT_CONTROLS) {
      expect(alignState(mixedState, control.value), control.label).toBe(false);
    }
  });

  it('lights exactly one alignment value otherwise', () => {
    const doc = schema.nodes.doc.create(null, [centered]);
    const single = EditorState.create({ doc, selection: TextSelection.create(doc, 1, 4) });
    expect(alignMixed(single)).toBe(false);
    expect(alignState(single, 'center')).toBe(true);
    expect(alignState(single, null)).toBe(false);
  });

  it('suppresses every list value while the selection crosses families', () => {
    const listed = schema.nodes.bulletList.create(
      null,
      schema.nodes.listItem.create(null, schema.nodes.paragraph.create(null, schema.text('in list'))),
    );
    const doc = schema.nodes.doc.create(null, [listed, plain]);
    const state = EditorState.create({ doc, selection: TextSelection.create(doc, 3, doc.content.size - 1) });
    expect(listMixed(state)).toBe(true);
    for (const control of LIST_CONTROLS) expect(listState(state, control.kind), control.label).toBe(false);
  });

  it('lights 取消列表格式 only when nothing is in a list', () => {
    const state = textState('alpha');
    expect(listState(state, 'none')).toBe(true);
    expect(listState(state, 'bullet')).toBe(false);
  });
});

describe('面板接线（屏上的字必须来自这张表）', () => {
  const source = (rel: string) => readFileSync(join(process.cwd(), 'src', rel), 'utf8');
  const panel = source('components/editor/tabs/FormatTab.tsx');
  const editor = source('components/editor/Editor.tsx');

  // ☆ 对照实验换来的教训：把 `editor.on('selectionUpdate', …)` 整行注释掉，`toContain` 仍然绿。
  //   接线判的必须是"活着的那一行"，注释里的代码不算接线。
  const aliveLines = (src: string, code: string) =>
    src.split('\n').filter((line) => line.includes(code) && !/^\s*(\/\/|\*|\/\*)/.test(line));
  const wired = (src: string, code: string, count = 1) => {
    expect(aliveLines(src, code), `${code} 没有作为可执行代码出现 ${count} 次`).toHaveLength(count);
  };

  const officialLabels = [
    ...ALIGNMENT_CONTROLS.map((c) => c.label),
    ...LIST_CONTROLS.map((c) => c.label),
    ...INDENT_CONTROLS.map((c) => c.label),
    ...INLINE_MARK_CONTROLS.map((c) => c.label),
    GROUP_KEYS.alignLabel,
    GROUP_KEYS.indentLabel,
    MIXED_LABEL,
  ];

  // 面板里再手打一遍中文，台账就断了：这张表是唯一出处。
  it.each(officialLabels)('%s 不在 FormatTab 里重新打字', (label) => {
    expect(panel).not.toContain(`'${label}'`);
    expect(panel).not.toContain(`"${label}"`);
    expect(panel).not.toContain(`\`${label}\``);
  });

  it('drives its segments off the shared tables and the tri-state helper', () => {
    for (const name of ['ALIGNMENT_CONTROLS', 'LIST_CONTROLS', 'INDENT_CONTROLS', 'INLINE_MARK_CONTROLS']) {
      // 一次进 import、一次进渲染，缺一个都点不出这一档。
      wired(panel, name, 2);
    }
    for (const helper of ['alignState', 'listState', 'markState']) wired(panel, helper, 2);
    wired(panel, 'control.apply(host)', 4);
  });

  it('redraws on selection changes, or the档位 would be read off a stale selection', () => {
    wired(panel, "editor.on('selectionUpdate'");
    wired(panel, "editor.off('selectionUpdate'");
  });

  it('aligns the same block types the editor actually gave the attribute to', () => {
    wired(editor, 'ALIGNABLE_TYPES', 2);
    expect(editor).not.toContain("types: ['heading', 'paragraph']");
  });
});
