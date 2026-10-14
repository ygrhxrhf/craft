import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Schema, type Node } from '@tiptap/pm/model';
import { EditorState, type Plugin } from '@tiptap/pm/state';
import { TrailingNode } from '@tiptap/extensions';

/**
 * `gap.md` G1485：对文档尾部的块执行"列表档"切换后，正文末尾多出一段空 `paragraph`。
 * 根因不在我们的包装代码，也不在 TipTap 的 list 命令，而在 StarterKit 默认带的
 * `TrailingNode`——它的规则是"文档最后一个子节点不是段落就补一段"，于是尾部包装成
 * 列表时在同一批 dispatch 里被追了一枚游离空块（`@tiptap/extensions/dist/index.js:609-653`）。
 * 列表项自己就含段落，光标本来就够得着 ⇒ 这一类节点该进 `notAfter`。
 *
 * 这里测的是**那条规则本身**（不是我们的调用代码）：夹具 schema 与线上同形
 * （承 `format-presence.test.ts` 那份），插件直接从 `TrailingNode` 取。
 * 摘掉 `Editor.tsx` 的配置会红在下面那道接线闸上，规则改坏则红在这里。
 */

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'text*' },
    heading: { group: 'block', content: 'text*', attrs: { level: { default: 1 } } },
    bulletList: { group: 'block', content: 'listItem+' },
    orderedList: { group: 'block', content: 'listItem+' },
    taskList: { group: 'block', content: 'taskItem+' },
    listItem: { group: 'block', content: 'paragraph block*' },
    taskItem: { group: 'block', content: 'paragraph block*' },
    text: {},
  },
  marks: {},
});

const n = schema.nodes;
const para = (text: string) => n.paragraph.create(null, text ? schema.text(text) : null);

/** 线上那份配置（三族列表）；传别的值是为了验"规则被改宽/改窄"。 */
const NOT_AFTER = ['bulletList', 'orderedList', 'taskList'];

function trailingPlugins(notAfter: string[]): Plugin[] {
  const ctx = { options: { node: undefined, notAfter }, editor: { schema, isEditable: true } };
  // addProseMirrorPlugins 只读 this.options 与 this.editor.schema，纯 node 环境里够用
  return (TrailingNode.config.addProseMirrorPlugins as (this: unknown) => Plugin[]).call(ctx);
}

/**
 * 从"两段正文"整篇换成"一个尾部列表"＝格式面板那一枪落下来的文档形状
 * （`bulletList[listItem[列表项一]]` 之后紧跟的就是列表本身）。
 */
function wrapTail(list: 'bulletList' | 'orderedList' | 'taskList', notAfter: string[]) {
  const item = list === 'taskList' ? n.taskItem : n.listItem;
  const start = n.doc.create(null, [para('列表项一'), para('列表项二')]);
  const state = EditorState.create({ doc: start, plugins: trailingPlugins(notAfter) });
  const wrapped = n[list].create(null, [item.create(null, para('列表项一')), item.create(null, para('列表项二'))]);
  return state.applyTransaction(state.tr.replaceWith(0, state.doc.content.size, wrapped));
}

function names(document: Node): string[] {
  const out: string[] = [];
  document.forEach((child) => out.push(child.type.name));
  return out;
}

describe('TrailingNode 与列表档切换（G1485）', () => {
  it('默认配置（notAfter 为空）就是那枚游离空块的来源', () => {
    const result = wrapTail('bulletList', []);
    expect(result.transactions.length, '同一次 dispatch 里被追了第二笔＝正是屏上那枚空块').toBe(2);
    expect(names(result.state.doc)).toEqual(['bulletList', 'paragraph']);
  });

  it('三族列表包在篇尾都不再追加空块', () => {
    for (const list of ['bulletList', 'orderedList', 'taskList'] as const) {
      const result = wrapTail(list, NOT_AFTER);
      expect(result.transactions.length, `${list} 收尾时又被追了一笔`).toBe(1);
      expect(names(result.state.doc), `${list} 篇尾留下了游离块`).toEqual([list]);
    }
  });

  it('非列表块收尾时该补的还是得补＝豁免没有改宽成全局关掉', () => {
    const start = n.doc.create(null, [para('正文'), para('待改')]);
    const state = EditorState.create({ doc: start, plugins: trailingPlugins(NOT_AFTER) });
    const heading = n.heading.create({ level: 1 }, schema.text('尾标题'));
    const result = state.applyTransaction(state.tr.replaceWith(0, state.doc.content.size, heading));
    expect(names(result.state.doc), '标题不在 notAfter 里＝尾后仍应补一枚可打字的空段').toEqual(['heading', 'paragraph']);
  });

  it('豁免只看"最后一个子节点"，不是"文档里有没有列表"', () => {
    const headingThenList = n.doc.create(null, [n.heading.create({ level: 1 }, schema.text('标题')), n.bulletList.create(null, n.listItem.create(null, para('项')))]);
    const listThenHeading = n.doc.create(null, [n.bulletList.create(null, n.listItem.create(null, para('项'))), n.heading.create({ level: 1 }, schema.text('标题'))]);
    for (const [doc, label, expected] of [
      [headingThenList, '列表收尾＝不补', ['heading', 'bulletList']],
      [listThenHeading, '中间有列表也一样补不出豁免', ['bulletList', 'heading', 'paragraph']],
    ] as [Node, string, string[]][]) {
      const state = EditorState.create({ doc, plugins: trailingPlugins(NOT_AFTER) });
      // 同一份配置下按一次"无操作"事务，让 appendTransaction 跑一遍
      const result = state.applyTransaction(state.tr.setNodeMarkup(0, undefined, state.doc.child(0).attrs));
      expect(names(result.state.doc), label).toEqual(expected);
    }
  });
});

describe('Editor.tsx 里的接线（G1485）', () => {
  const src = readFileSync(join(process.cwd(), 'src', 'components', 'editor', 'Editor.tsx'), 'utf8');

  /** 取 `StarterKit.configure(` 后面那对平衡括号里的体，并去掉行注释。 */
  function starterKitBody(): string {
    const start = src.indexOf('StarterKit.configure(');
    if (start < 0) throw new Error('找不到 StarterKit.configure＝判据失效，请复核这条闸');
    let i = src.indexOf('(', start), depth = 0;
    for (; i < src.length; i++) {
      if (src[i] === '(') depth++;
      else if (src[i] === ')') { depth--; if (depth === 0) break; }
    }
    return src.slice(start, i + 1).replace(/\/\/[^\n]*/g, '');
  }

  it('trailingNode 的 notAfter 里三族列表都在，且没有整档关掉', () => {
    const body = starterKitBody();
    expect(body, 'trailingNode: false＝尾块再也补不出可打字的位置，不许这么写').not.toMatch(/trailingNode:\s*false/);
    const opt = /trailingNode:\s*\{[^}]*notAfter:\s*\[([^\]]*)\]/.exec(body);
    expect(opt, 'StarterKit.configure 里没有 trailingNode.notAfter＝G1485 会当场复发').toBeTruthy();
    const listed = opt![1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
    for (const name of NOT_AFTER) expect(listed, `${name} 不在 notAfter 里`).toContain(name);
  });
});
