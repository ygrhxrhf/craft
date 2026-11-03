import { describe, expect, it } from 'vitest';
import { serializeDocument } from '../document-codec';
import { parseMarkdown, pickTextBundleEntry, titleFromMarkdown } from './markdown';

const blocks = (source: string): any[] => parseMarkdown(source).content ?? [];

describe('parseMarkdown blocks', () => {
  it('turns plain lines into one paragraph', () => {
    const [first] = blocks('第一行\n第二行');
    expect(first).toEqual({
      type: 'paragraph',
      content: [{ type: 'text', text: '第一行 第二行' }],
    });
  });

  it('reads heading levels', () => {
    const result = blocks('## 二级\n###### 六级');
    expect(result.map((node) => node.attrs?.level)).toEqual([2, 6]);
    expect(result[0].type).toBe('heading');
  });

  it('separates blocks by blank lines', () => {
    expect(blocks('甲\n\n乙')).toHaveLength(2);
  });

  it('builds a nested bullet list from indentation', () => {
    const [list] = blocks('- 一\n  - 二\n- 三');
    expect(list.type).toBe('bulletList');
    expect(list.content).toHaveLength(2);
    expect(list.content[0].content[0].content).toEqual([{ type: 'text', text: '一' }]);
    expect(list.content[0].content[1]?.type).toBe('bulletList');
  });

  it('builds an ordered list', () => {
    const [list] = blocks('1. 甲\n2. 乙');
    expect(list.type).toBe('orderedList');
    expect(list.content).toHaveLength(2);
  });

  it('keeps task checkboxes', () => {
    const [list] = blocks('- [x] 已完成\n- [ ] 未完成');
    expect(list.type).toBe('taskList');
    expect(list.content.map((item: any) => item.attrs?.checked)).toEqual([true, false]);
  });

  it('wraps a blockquote around its paragraphs', () => {
    const [quote] = blocks('> 引用一\n> 引用二');
    expect(quote.type).toBe('blockquote');
    expect(quote.content[0].content[0].text).toBe('引用一 引用二');
  });

  it('normalizes the fence language to the code Craft stores', () => {
    const [code] = blocks('```ts\nconst a = 1;\n```');
    expect(code).toEqual({
      type: 'codeBlock',
      attrs: { language: 'typescript' },
      content: [{ type: 'text', text: 'const a = 1;' }],
    });
  });

  it('drops exactly one trailing space from a code block body (G1232)', () => {
    const body = (source: string) => blocks(source)[0].content[0].text;
    // One trailing space is removed.
    expect(body('```\nconst a = 1; \n```')).toBe('const a = 1;');
    // Two trailing spaces lose exactly one — the official test only looks at the last character.
    expect(body('```\nconst a = 1;  \n```')).toBe('const a = 1; ');
    // A body that does not end in a space is untouched.
    expect(body('```\nconst a = 1;\n```')).toBe('const a = 1;');
  });

  it('reads a pipe table into the table node shape (G1240)', () => {
    const [table] = blocks('| 名称 | 数量 |\n| --- | --- |\n| 苹果 | 3 |');
    expect(table.type).toBe('table');
    expect(table.content).toHaveLength(2); // the alignment row is dropped
    expect(table.content[0].type).toBe('tableRow');
    expect(table.content[0].content).toHaveLength(2);
    expect(table.content[0].content[0].type).toBe('tableCell');
    expect(table.content[0].content[0].content[0].content[0].text).toBe('名称');
    expect(table.content[1].content[0].content[0].content[0].text).toBe('苹果');
  });

  it('does not swallow a lone pipe line as a table', () => {
    // A single pipe row with no alignment row under it is not a table.
    expect(blocks('| 只是一行 |')[0].type).not.toBe('table');
  });

  it('folds extension aliases the way Craft names a language', () => {
    const langs = (source: string) => blocks(source).map((node) => node.attrs?.language);
    expect(langs('```py\nx\n```')).toEqual(['python']);
    expect(langs('```tsx\nx\n```')).toEqual(['typescript']);
    expect(langs('```tex\nx\n```')).toEqual(['math_formula']);
    expect(langs('```hbs\nx\n```')).toEqual(['html']);
  });

  it('takes only the first word of the fence info string', () => {
    expect(blocks('```ts title="a.ts"\nx\n```')[0].attrs?.language).toBe('typescript');
  });

  it('keeps mermaid even though it is not an alias', () => {
    expect(blocks('```mermaid\ngraph TD\n```')[0].attrs?.language).toBe('mermaid');
  });

  it('falls back to other for a language Craft does not name', () => {
    expect(blocks('```qqqlang\nx\n```')[0].attrs?.language).toBe('other');
  });

  it('leaves an info-less fence without a language', () => {
    // Characterization: the official importer is not measured for this shape yet.
    expect(blocks('```\nx\n```')[0].attrs?.language).toBeNull();
  });

  it('emits a divider for a rule line', () => {
    expect(blocks('---')[0].type).toBe('divider');
    expect(blocks('***')[0].type).toBe('divider');
  });

  it('reads the divider weight out of the sigil characters (G1229)', () => {
    const style = (source: string) => blocks(source)[0].attrs?.style;
    // `---` is the default regular, not the heaviest; the table lives in divider-styles.
    expect(style('---')).toBe('regular');
    expect(style('=--')).toBe('strong');
    expect(style('===')).toBe('pageSeparator');
    // An unnamed rule still lands on the default.
    expect(style('*****')).toBe('regular');
  });

  it('lifts a lone image into an image block', () => {
    expect(blocks('![封面](https://example.com/a.png)')[0]).toMatchObject({
      type: 'imageBlock',
      attrs: {
        src: 'https://example.com/a.png',
        alt: '封面',
        uploaded: true,
        url: 'https://example.com/a.png',
        rawUrl: 'https://example.com/a.png',
        fileName: 'https://example.com/a.png',
        aspectRatio: 1.5,
      },
    });
  });

  it('always returns a document with at least one block', () => {
    expect(parseMarkdown('').content).toEqual([{ type: 'paragraph' }]);
  });
});

describe('parseMarkdown inline marks', () => {
  const inline = (source: string) => (blocks(source)[0].content ?? []);

  it('marks bold, italic, code and strike', () => {
    expect(inline('**粗**')).toEqual([{ type: 'text', text: '粗', marks: [{ type: 'bold' }] }]);
    expect(inline('*斜*')).toEqual([{ type: 'text', text: '斜', marks: [{ type: 'italic' }] }]);
    expect(inline('`码`')).toEqual([{ type: 'text', text: '码', marks: [{ type: 'code' }] }]);
    expect(inline('~~删~~')).toEqual([{ type: 'text', text: '删', marks: [{ type: 'strike' }] }]);
  });

  it('marks a link and keeps its label', () => {
    expect(inline('[官网](https://craft.do)')).toEqual([
      { type: 'text', text: '官网', marks: [{ type: 'link', attrs: { href: 'https://craft.do' } }] },
    ]);
  });

  it('nests emphasis inside bold', () => {
    expect(inline('**粗 *斜***')).toEqual([
      { type: 'text', text: '粗 ', marks: [{ type: 'bold' }] },
      { type: 'text', text: '斜', marks: [{ type: 'bold' }, { type: 'italic' }] },
    ]);
  });

  it('leaves unbalanced punctuation as text', () => {
    expect(inline('2 * 3 * 4')).toEqual([{ type: 'text', text: '2 * 3 * 4' }]);
  });
});

describe('document title and text bundles', () => {
  it('uses the first heading, then the first line', () => {
    expect(titleFromMarkdown('# 标题\n正文')).toBe('标题');
    expect(titleFromMarkdown('只有正文')).toBe('只有正文');
    expect(titleFromMarkdown('')).toBe('导入的笔记');
  });

  it('finds text.md inside the shallowest bundle folder', () => {
    expect(
      pickTextBundleEntry([
        'note.textbundle/text.md',
        'note.textbundle/assets/a.png',
        'deep/nested.textbundle/text.md',
      ])
    ).toBe('note.textbundle/text.md');
  });

  it('returns null when no bundle entry exists', () => {
    expect(pickTextBundleEntry(['a.md', 'b.txt'])).toBeNull();
  });
});

describe('re-importing what the Craft-shaped exporter writes', () => {
  it('re-imports Craft three-space indentation as a nested list', () => {
    // Guard for the exporter, which emits `indentationCharacters` = three spaces.
    const [list] = blocks('- 父项\n   - 子项');
    expect(list.type).toBe('bulletList');
    const parent = list.content[0];
    expect(parent.content[0].content[0].text).toBe('父项');
    expect(parent.content[1]?.type).toBe('bulletList');
    expect(parent.content[1]?.content[0].content[0].content[0].text).toBe('子项');
  });

  it('accepts the uppercase checked marker Craft exports', () => {
    const [list] = blocks('- [X] 已完成');
    expect(list.type).toBe('taskList');
    expect(list.content[0].attrs?.checked).toBe(true);
  });

  it('drops a fenced block whose body starts with an HTML comment (G1245)', () => {
    // The document falls back to an empty paragraph, so the assertion is that no code block
    // survives rather than that the array is empty.
    expect(blocks('```\n<!-- 注释\n```').some((node: { type: string }) => node.type === 'codeBlock')).toBe(false);
    // A comment that is not at the start is ordinary body text.
    const [code] = blocks('```\nconst a = 1; // 注释\n```');
    expect(code.type).toBe('codeBlock');
  });

  it('reads a display-math fence as a math block', () => {
    const [math] = blocks('$$\n\\frac{a}{b}\n$$');
    expect(math).toEqual({ type: 'mathBlock', attrs: { latex: '\\frac{a}{b}' } });
  });

  it('reads a single-line display-math fence', () => {
    const [math] = blocks('$$x^2$$');
    expect(math.type).toBe('mathBlock');
    expect(math.attrs?.latex).toBe('x^2');
  });

  it('reads inline math inside a paragraph as an inlineMath node (G1238)', () => {
    const [para] = blocks('面积是 $\\pi r^2$ 的结果');
    expect(para.type).toBe('paragraph');
    const math = para.content?.find((node: { type: string }) => node.type === 'inlineMath');
    expect(math?.attrs?.latex).toBe('\\pi r^2');
  });

  it('reads the double-dollar inline form too', () => {
    const [para] = blocks('结果是 $$a+b$$ 的值');
    const math = para.content?.find((node: { type: string }) => node.type === 'inlineMath');
    expect(math?.attrs?.latex).toBe('a+b');
  });

  it('ends a paragraph where a display-math fence opens', () => {
    expect(blocks('正文\n$$\nx\n$$').map((node) => node.type)).toEqual(['paragraph', 'mathBlock']);
  });

  it('round-trips a math block through the markdown exporter', () => {
    const markdown = serializeDocument(
      { type: 'doc', content: [{ type: 'mathBlock', attrs: { latex: 'a^2 + b^2' } }] },
      'markdown'
    );
    expect(blocks(markdown)[0]).toEqual({ type: 'mathBlock', attrs: { latex: 'a^2 + b^2' } });
  });

  it('reads back the capital [X] the exporter writes for a checked task (G1239)', () => {
    // The exporter writes `- [X]` with a capital X; the importer must read that back as checked.
    const markdown = serializeDocument(
      {
        type: 'doc',
        content: [
          {
            type: 'taskList',
            content: [
              {
                type: 'taskItem',
                attrs: { checked: true },
                content: [{ type: 'paragraph', content: [{ type: 'text', text: '完成任务' }] }],
              },
              {
                type: 'taskItem',
                attrs: { checked: false },
                content: [{ type: 'paragraph', content: [{ type: 'text', text: '待办' }] }],
              },
            ],
          },
        ],
      },
      'markdown'
    );
    expect(markdown).toContain('- [X] 完成任务');
    const [list] = blocks(markdown);
    expect(list.type).toBe('taskList');
    expect(list.content[0].attrs?.checked).toBe(true);
    expect(list.content[1].attrs?.checked).toBe(false);
  });
});

// G1236: inline HTML maps onto the same marks the punctuation forms produce.
describe('inline HTML tags', () => {
  const first = (md: string) => {
    const doc = parseMarkdown(md);
    return (doc.content?.[0]?.content ?? []) as any[];
  };

  it('maps strong/em/s onto bold/italic/strike', () => {
    expect(first('<strong>a</strong>')[0].marks?.[0].type).toBe('bold');
    expect(first('<em>b</em>')[0].marks?.[0].type).toBe('italic');
    expect(first('<s>c</s>')[0].marks?.[0].type).toBe('strike');
  });

  it('maps a link and reads its href', () => {
    const node = first('<a href="https://example.com">x</a>')[0];
    expect(node.marks?.[0]).toMatchObject({ type: 'link', attrs: { href: 'https://example.com' } });
  });

  it('gives a highlight its dual light/dark literal', () => {
    expect(first('<mark>h</mark>')[0].marks?.[0]).toMatchObject({
      type: 'highlight',
      attrs: { color: '#fff100 #fff432' },
    });
  });

  it('keeps a span\'s text but decorates nothing', () => {
    const nodes = first('<span>plain</span>');
    expect(nodes[0].marks ?? []).toEqual([]);
    expect(nodes[0].text).toBe('plain');
  });
});

describe('inline math as a tex:// link run (G1238)', () => {
  it('reads a tex:// link back as inline math', () => {
    const [para] = blocks('前 [x^2](tex://x^2) 后');
    const math = para.content.find((n: any) => n.type === 'inlineMath');
    expect(math?.attrs?.latex).toBe('x^2');
  });

  it('leaves an ordinary link alone', () => {
    const [para] = blocks('[站点](https://example.com)');
    expect(para.content[0].marks?.[0]).toMatchObject({ type: 'link', attrs: { href: 'https://example.com' } });
  });
});

describe('imported table rows and cells carry stable ids (G439)', () => {
  it('mints a rowId per row and a cellId per cell', () => {
    const [table] = blocks('| 名称 | 数量 |\n| --- | --- |\n| 苹果 | 3 |');
    const row = table.content[0];
    expect(typeof row.attrs?.rowId).toBe('string');
    expect(row.attrs.rowId).toBeTruthy();
    expect(typeof row.content[0].attrs?.cellId).toBe('string');
    expect(row.content[0].attrs.cellId).toBeTruthy();
    // Distinct ids per cell.
    expect(row.content[0].attrs.cellId).not.toBe(row.content[1].attrs.cellId);
  });
});

// G674: Craft's three custom Markdown extensions.
describe('Craft-specific Markdown extensions (G674)', () => {
  it('turns <callout> into a callout block carrying its type', () => {
    const [block] = blocks('<callout type="warning">\n小心\n</callout>');
    expect(block.type).toBe('callout');
    expect(block.attrs.type).toBe('warning');
  });

  it('falls back to the info callout for an unknown type', () => {
    const [block] = blocks('<callout type="nope">\n内容\n</callout>');
    expect(block.type).toBe('callout');
    expect(block.attrs.type).toBe('info');
  });

  it('turns a line starting with + into a toggle block', () => {
    const [block] = blocks('+ 折叠内容');
    expect(block.type).toBe('toggleBlock');
    expect(block.attrs.open).toBe(false);
    expect(block.content[0].content[0].text).toBe('折叠内容');
  });

  it('nests indented child rows inside the toggle', () => {
    const [block] = blocks('+ Packing list\n  - Passport');
    expect(block.type).toBe('toggleBlock');
    expect(block.content).toHaveLength(2);
    expect(block.content[1].type).toBe('bulletList');
  });

  it('leaves > as a blockquote', () => {
    const [block] = blocks('> 引用');
    expect(block.type).toBe('blockquote');
  });
});
