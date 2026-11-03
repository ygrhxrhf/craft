import { describe, expect, it } from 'vitest';
import { blockLinkHref, serializeDocument } from './index';
import { dividerStyleFromMarkup } from '@/lib/editor/divider-styles';
import { parseMarkdown } from '@/lib/import/markdown';

const document = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '标题' }] },
    { type: 'paragraph', content: [{ type: 'text', text: '正文' }] },
    { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: '完成任务' }] }] }] },
  ],
};

describe('serializeDocument', () => {
  it('serializes core nodes to markdown', () => {
    expect(serializeDocument(document, 'markdown')).toBe('# 标题\n\n正文\n\n- [X] 完成任务');
  });

  it('writes a highlight as ::text:: in markdown (G1200)', () => {
    const highlighted = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '重点', marks: [{ type: 'highlight' }] }],
        },
      ],
    };
    expect(serializeDocument(highlighted, 'markdown')).toBe('::重点::');
  });

  it('serializes core nodes to plain text', () => {
    expect(serializeDocument(document, 'text')).toBe('标题\n正文\n完成任务');
  });

  it('serializes core nodes to html', () => {
    expect(serializeDocument(document, 'html')).toContain('<h1>标题</h1>');
    expect(serializeDocument(document, 'html')).toContain('<input type="checkbox" checked disabled>');
  });
});

const mathDoc = {
  type: 'doc',
  content: [
    { type: 'mathBlock', attrs: { latex: '\\frac{a}{b}' } },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: '能量 ' },
        { type: 'inlineMath', attrs: { latex: 'E=mc^2' } },
      ],
    },
  ],
};

const columnsDoc = {
  type: 'doc',
  content: [
    {
      type: 'columns',
      content: [
        { type: 'column', content: [{ type: 'paragraph', content: [{ type: 'text', text: '左栏' }] }] },
        { type: 'column', content: [{ type: 'paragraph', content: [{ type: 'text', text: '右栏' }] }] },
      ],
    },
  ],
};

describe('math and columns', () => {
  it('keeps math sources out of the markdown delimiters', () => {
    const md = serializeDocument(mathDoc, 'markdown');
    expect(md).toContain('$$\n\\frac{a}{b}\n$$');
    expect(md).toContain('$E=mc^2$');
  });

  it('renders math as tagged elements in html', () => {
    const html = serializeDocument(mathDoc, 'html');
    expect(html).toContain('data-type="math-block"');
    expect(html).toContain('data-type="inline-math"');
  });

  it('does not drop column contents', () => {
    const html = serializeDocument(columnsDoc, 'html');
    expect(html).toContain('<div data-type="columns">');
    expect(html).toContain('左栏');
    expect(html).toContain('右栏');
    const md = serializeDocument(columnsDoc, 'markdown');
    expect(md).toContain('左栏');
    expect(md).toContain('右栏');
  });
});

/** Every block that used to fall through to `textContent` and lose its payload. */
const richDoc = {
  type: 'doc',
  content: [
    { type: 'callout', attrs: { type: 'warning' }, content: [{ type: 'paragraph', content: [{ type: 'text', text: '注意电量' }] }] },
    { type: 'cardBlock', content: [{ type: 'paragraph', content: [{ type: 'text', text: '卡片内文' }] }] },
    {
      type: 'table',
      content: [
        { type: 'tableRow', content: [{ type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: '名称' }] }] }, { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: '数量' }] }] }] },
        { type: 'tableRow', content: [{ type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '苹果' }] }] }, { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '3' }] }] }] },
      ],
    },
    { type: 'attachment', attrs: { url: '/uploads/a.pdf', name: '手册.pdf', size: 12 } },
    { type: 'linkPreview', attrs: { url: 'https://example.com', title: '示例站' } },
    { type: 'whiteboardLink', attrs: { whiteboardId: 'wb-1', title: '规划板' } },
    { type: 'paragraph', content: [{ type: 'mention', attrs: { documentId: 'd-1', title: '另一篇' } }] },
  ],
};

describe('rich blocks survive export', () => {
  it('keeps callout and card text in markdown', () => {
    const md = serializeDocument(richDoc, 'markdown');
    // G1403：callout 走 `<callout>` 包裹，不是 `> ` 引用。
    expect(md).toContain('<callout type="warning">注意电量</callout>');
    expect(md).toContain('卡片内文');
  });

  it('writes the official inline callout shape verbatim (G1403)', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'callout',
          attrs: { type: 'info' },
          content: [
            {
              type: 'heading',
              attrs: { level: 4 },
              content: [{ type: 'text', text: 'On iOS :' }],
            },
          ],
        },
      ],
    };
    expect(serializeDocument(doc, 'markdown')).toBe('<callout>#### On iOS :</callout>');
  });

  it('renders a real markdown table', () => {
    const md = serializeDocument(richDoc, 'markdown');
    expect(md).toContain('| 名称 | 数量 |');
    expect(md).toContain('| --- | --- |');
    expect(md).toContain('| 苹果 | 3 |');
  });

  it('keeps attachment, link and board targets', () => {
    const md = serializeDocument(richDoc, 'markdown');
    expect(md).toContain('[📎 手册.pdf](/uploads/a.pdf)');
    expect(md).toContain('[示例站](https://example.com)');
    expect(md).toContain('[白板：规划板](/whiteboards/wb-1)');
    expect(md).toContain('[另一篇](/documents/d-1)');
  });

  it('emits structured html rather than bare text', () => {
    const html = serializeDocument(richDoc, 'html');
    expect(html).toContain('<table>');
    expect(html).toContain('<th><p>名称</p></th>');
    expect(html).toContain('<td><p>苹果</p></td>');
    expect(html).toContain('data-type="callout"');
    expect(html).toContain('data-type="attachment"');
  });

  it('names atom nodes in the plain-text export', () => {
    const text = serializeDocument(richDoc, 'text');
    expect(text).toContain('手册.pdf');
    expect(text).toContain('规划板');
  });
});

const anchorDoc = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        {
          type: 'blockLink',
          attrs: { documentId: 'd-2', title: '目标段落', blockId: '3f2a6b1c-9d0e-4f5a-8b7c-1d2e3f4a5b6c' },
        },
      ],
    },
  ],
};

describe('block anchors', () => {
  it('keeps the block hash in both exports', () => {
    const md = serializeDocument(anchorDoc, 'markdown');
    expect(md).toContain('[目标段落](/documents/d-2#b-3f2a6b1c-9d0e-4f5a-8b7c-1d2e3f4a5b6c)');
    const html = serializeDocument(anchorDoc, 'html');
    expect(html).toContain('href="/documents/d-2#b-3f2a6b1c-9d0e-4f5a-8b7c-1d2e3f4a5b6c"');
  });

  it('omits the hash when only a document is linked', () => {
    const plain = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'blockLink', attrs: { documentId: 'd-3', title: '整篇' } }] }],
    };
    expect(serializeDocument(plain, 'markdown')).toContain('[整篇](/documents/d-3)');
  });

  it('falls back to the positional hash while no id exists yet', () => {
    const hinted = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'blockLink', attrs: { documentId: 'd-4', title: '段落', blockId: null, blockIndex: 2 } }],
        },
      ],
    };
    expect(serializeDocument(hinted, 'markdown')).toContain('[段落](/documents/d-4#i-2)');
    expect(serializeDocument(hinted, 'html')).toContain('href="/documents/d-4#i-2"');
  });
});

const mirrorDoc = {
  type: 'doc',
  content: [
    {
      type: 'mirrorBlock',
      attrs: {
        sourceDocumentId: 'd-5',
        sourceBlockId: '3f2a6b1c-9d0e-4f5a-8b7c-1d2e3f4a5b6c',
        sourceBlockIndex: null,
        title: '被镜像的段落',
      },
    },
  ],
};

describe('mirror blocks', () => {
  it('exports a mirror as a pointer to its source', () => {
    expect(serializeDocument(mirrorDoc, 'markdown')).toContain(
      '> 镜像：[被镜像的段落](/documents/d-5#b-3f2a6b1c-9d0e-4f5a-8b7c-1d2e3f4a5b6c)'
    );
    expect(serializeDocument(mirrorDoc, 'html')).toContain('data-type="mirrorBlock"');
    expect(serializeDocument(mirrorDoc, 'text')).toContain('被镜像的段落');
  });
});

const embedDoc = {
  type: 'doc',
  content: [
    { type: 'whiteboardEmbed', attrs: { whiteboardId: 'wb-2', title: '评审板', icon: '🎯' } },
  ],
};

describe('embedded whiteboards', () => {
  it('exports the embed as a board link in every format', () => {
    expect(serializeDocument(embedDoc, 'markdown')).toContain('[白板：评审板](/whiteboards/wb-2)');
    expect(serializeDocument(embedDoc, 'text')).toContain('评审板');
    const html = serializeDocument(embedDoc, 'html');
    expect(html).toContain('data-type="whiteboard-embed"');
    expect(html).toContain('data-whiteboard-id="wb-2"');
  });
});

/**
 * Official escapes a table cell in three ordered steps (MarkdownExportApi `g()`):
 * double every backslash, then escape every pipe, then flatten newlines.
 * Skipping the first step lets a backslash eat the following delimiter.
 */
function tableWithBodyCells(cells: string[]) {
  const paragraph = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] });
  return {
    type: 'doc',
    content: [
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              { type: 'tableHeader', content: [paragraph('名称')] },
              { type: 'tableHeader', content: [paragraph('数量')] },
            ],
          },
          {
            type: 'tableRow',
            content: [
              { type: 'tableCell', content: [paragraph(cells[0])] },
              { type: 'tableCell', content: [paragraph(cells[1])] },
            ],
          },
        ],
      },
    ],
  };
}

describe('markdown table cell escaping', () => {
  it('doubles a backslash that precedes a pipe instead of creating an extra column', () => {
    const md = serializeDocument(tableWithBodyCells(['a\\|b', 'c']), 'markdown');
    expect(md).toContain(String.raw`| a\\\|b | c |`);
  });

  it('doubles a trailing backslash so the cell ends literally', () => {
    const md = serializeDocument(tableWithBodyCells(['end\\', 'c']), 'markdown');
    expect(md).toContain(String.raw`| end\\ | c |`);
  });
});

/** Craft's flavour indents one level with three spaces (`indentationCharacters`). */
describe('nested lists', () => {
  it('indents a nested list by three spaces', () => {
    const nested = {
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                { type: 'paragraph', content: [{ type: 'text', text: '父项' }] },
                {
                  type: 'bulletList',
                  content: [
                    { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '子项' }] }] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(serializeDocument(nested, 'markdown')).toBe('- 父项\n   - 子项');
  });
});

/**
 * A person mention carries a userId and no documentId, so unlike the page
 * mention at `richDoc` it has no document to point at.
 */
const personMentionDoc = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: '请 ' },
        { type: 'mention', attrs: { documentId: null, userId: 'u-1', title: '张三' } },
        { type: 'text', text: ' 复核' },
      ],
    },
  ],
};

describe('a person mention exports without a page link', () => {
  it('writes @name in markdown instead of a link to a document', () => {
    const md = serializeDocument(personMentionDoc, 'markdown');
    expect(md).toContain('@张三');
    expect(md).not.toContain('/documents/');
  });

  it('renders a span rather than an anchor in html', () => {
    const html = serializeDocument(personMentionDoc, 'html');
    expect(html).toContain('data-type="mention"');
    expect(html).toContain('张三');
    expect(html).not.toContain('<a href');
  });

  it('keeps the name in the plain-text export', () => {
    expect(serializeDocument(personMentionDoc, 'text')).toContain('张三');
  });
});

describe('a divider keeps its weight through a markdown round trip (G1561)', () => {
  const docOf = (style: string) => ({
    type: 'doc',
    content: [{ type: 'divider', attrs: { style } }],
  });

  it('writes each official style as its own asterisk run, not a bare ---', () => {
    // The official importer reads a line block's weight off its own markup: 3 + index asterisks.
    expect(serializeDocument(docOf('extraLight'), 'markdown')).toBe('***');
    expect(serializeDocument(docOf('light'), 'markdown')).toBe('****');
    expect(serializeDocument(docOf('regular'), 'markdown')).toBe('*****');
    expect(serializeDocument(docOf('strong'), 'markdown')).toBe('******');
  });

  it('round-trips every style back to the same weight', () => {
    for (const style of ['extraLight', 'light', 'regular', 'strong']) {
      const markup = serializeDocument(docOf(style), 'markdown');
      expect(dividerStyleFromMarkup(markup), `${style} -> ${markup}`).toBe(style);
    }
  });

  it('keeps a bare hr (no style attribute) on the default rule', () => {
    expect(serializeDocument({ type: 'doc', content: [{ type: 'horizontalRule' }] }, 'markdown')).toBe('---');
    expect(serializeDocument({ type: 'doc', content: [{ type: 'divider' }] }, 'markdown')).toBe('---');
  });
});

describe('a legacy divider style still round-trips as a divider', () => {
  it('never writes markup the importer would read as plain text', () => {
    // `dashed` is a pre-official local style; its own markup (`=-`) is not one the importer
    // accepts, so exporting it verbatim would turn the block into a paragraph on the way back.
    const md = serializeDocument({ type: 'doc', content: [{ type: 'divider', attrs: { style: 'dashed' } }] }, 'markdown');
    const parsed: any = parseMarkdown(md);
    expect(parsed.content?.[0]?.type, `dashed -> ${md}`).toBe('divider');
  });

  it('keeps the legacy weight names as dividers too', () => {
    for (const style of ['thin', 'medium', 'thick']) {
      const md = serializeDocument({ type: 'doc', content: [{ type: 'divider', attrs: { style } }] }, 'markdown');
      const parsed: any = parseMarkdown(md);
      expect(parsed.content?.[0]?.type, `${style} -> ${md}`).toBe('divider');
    }
  });
});

describe('the JSON export projects the four payload containers (G400)', () => {
  it('routes a table payload into pluginData and keeps text in content', () => {
    const json = serializeDocument(
      {
        type: 'doc',
        content: [
          {
            type: 'table',
            content: [{ type: 'tableRow', content: [{ type: 'tableCell', content: [{ type: 'paragraph' }] }] }],
          },
          { type: 'paragraph', content: [{ type: 'text', text: '正文' }] },
        ],
      },
      'json',
    );
    const parsed = JSON.parse(json);
    expect(parsed.content[0].pluginData).toBeTruthy();
    expect(parsed.content[0].objectData).toBeNull();
    expect(parsed.content[0].blob).toBeNull();
    // A text block has no structured payload anywhere.
    expect(parsed.content[1].pluginData).toBeNull();
    expect(parsed.content[1].content[0].text).toBe('正文');
  });

  it('routes a code body into blob', () => {
    const json = serializeDocument(
      { type: 'doc', content: [{ type: 'codeBlock', content: [{ type: 'text', text: 'let a = 1' }] }] },
      'json',
    );
    expect(JSON.parse(json).content[0].blob).toBe('let a = 1');
  });
});

describe('the markdown table round-trips the import criteria (G1240)', () => {
  it('writes an in-cell newline as <br>, which the importer turns back into a newline', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'table',
          content: [
            { type: 'tableRow', content: [{ type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'a\nb' }] }] }] },
            { type: 'tableRow', content: [{ type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '1' }] }] }] },
          ],
        },
      ],
    };
    const md = serializeDocument(doc, 'markdown');
    // No raw newline inside the row — the row stays one line.
    expect(md.split('\n')[0]).toContain('<br>');
    const parsed: any = parseMarkdown(md);
    expect(parsed.content?.[0]?.type).toBe('table');
  });

  it('writes a hyphens-only divider the alignment-row test recognises', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'table',
          content: [
            { type: 'tableRow', content: [{ type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '名称' }] }] }] },
            { type: 'tableRow', content: [{ type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '苹果' }] }] }] },
          ],
        },
      ],
    };
    const md = serializeDocument(doc, 'markdown');
    expect(md.split('\n')[1]).toBe('| --- |');
  });
});

describe('blockLinkStyle flavours (G1221)', () => {
  const link = { type: 'blockLink', attrs: { documentId: 'd-1', blockId: 'b-2', title: '目标' } };

  it('pageLink points at the document root, headerLink/blockLink keep the block anchor', () => {
    expect(blockLinkHref(link, 'blockLink')).toBe('/documents/d-1#b-b-2');
    expect(blockLinkHref(link, 'pageLink')).toBe('/documents/d-1');
    expect(blockLinkHref(link, 'headerLink')).toBe('/documents/d-1#b-b-2');
  });

  it('the default flavour leaves the anchor in place', () => {
    const md = serializeDocument(
      { type: 'doc', content: [{ type: 'paragraph', content: [link] }] },
      'markdown',
    );
    expect(md).toBe('[目标](/documents/d-1#b-b-2)');
  });
});
