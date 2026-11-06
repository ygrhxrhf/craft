import { describe, expect, it } from 'vitest';

import { PREVIEW_SIZE_DIMS, renderDocumentPreview } from './document-preview';

const para = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const doc = (...blocks: unknown[]) => ({ type: 'doc', content: blocks });

describe('文档预览 SVG 渲染（G216）', () => {
  it('draws the title line (icon first) and escapes XML', () => {
    const svg = renderDocumentPreview({ title: 'A&B <c>', icon: '🔥', content: doc(para('正文')) });
    expect(svg).toContain('🔥 A&amp;B &lt;c&gt;');
    expect(svg).not.toContain('<c>');
  });

  it('falls back to 无标题文档 for an empty title', () => {
    expect(renderDocumentPreview({ title: '  ', content: doc() })).toContain('无标题文档');
  });

  it('honours the three size tiers', () => {
    for (const size of ['s', 'm', 'l'] as const) {
      const svg = renderDocumentPreview({ title: 't', content: doc() }, { size });
      expect(svg).toContain(`width="${PREVIEW_SIZE_DIMS[size].width}"`);
      expect(svg).toContain(`height="${PREVIEW_SIZE_DIMS[size].height}"`);
    }
  });

  it('flips the background with the theme parameter', () => {
    const light = renderDocumentPreview({ title: 't', content: doc() }, { theme: 'light' });
    const dark = renderDocumentPreview({ title: 't', content: doc() }, { theme: 'dark' });
    expect(light).toContain('fill="#ffffff"');
    expect(dark).toContain('fill="#1e1e20"');
  });

  it('wraps a long paragraph into several text lines', () => {
    const long = '这是一段很长的中文内容用来验证换行'.repeat(6);
    const svg = renderDocumentPreview({ title: 't', content: doc(para(long)) }, { size: 'm' });
    const textNodes = svg.match(/<text /g) ?? [];
    expect(textNodes.length).toBeGreaterThan(3);
  });

  it('renders list markers and dividers and media placeholders', () => {
    const list = {
      type: 'bulletList',
      content: [{ type: 'listItem', content: [para('第一项')] }],
    };
    const svg = renderDocumentPreview(
      { title: 't', content: doc(list, { type: 'divider' }, { type: 'image', attrs: { src: 'x' } }) },
      { size: 'l' },
    );
    expect(svg).toContain('• 第一项');
    expect(svg).toContain('<line ');
    expect(svg).toContain('图片');
  });

  it('is deterministic for the same input', () => {
    const input = { title: 't', icon: null, content: doc(para('甲')) };
    expect(renderDocumentPreview(input)).toBe(renderDocumentPreview(input));
  });

  it('survives a missing or malformed content', () => {
    expect(renderDocumentPreview({ title: 't' })).toContain('t');
    expect(renderDocumentPreview({ title: 't', content: 'nope' })).toContain('<svg');
  });
});
// G250 —— 卡片是"真实内容预览"：表格连单元格、彩色正文保配色、子集合出缩略图。
describe('真实内容预览（G250）', () => {
  const cell = (...texts: string[]) => ({
    type: 'tableHeader',
    content: [{ type: 'paragraph', content: texts.map((text) => ({ type: 'text', text })) }],
  });
  const table = {
    type: 'table',
    content: [
      { type: 'tableRow', content: [cell('名称'), cell('数量')] },
      {
        type: 'tableRow',
        content: [
          { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '甲' }] }] },
          { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '3' }] }] },
        ],
      },
    ],
  };

  it('表格逐格画文字，并有表头底色与网格线', () => {
    const svg = renderDocumentPreview({ title: '表', content: doc(table) }, { size: 'm' });
    for (const text of ['名称', '数量', '甲', '3']) expect(svg).toContain(text);
    expect(svg).toContain('fill-opacity="0.5"');
    expect((svg.match(/<line /g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it('彩色正文保留颜色（tspan），普通文本仍走纯文本', () => {
    const colored = {
      type: 'paragraph',
      content: [
        { type: 'text', text: '红字', marks: [{ type: 'textStyle', attrs: { color: '#cc0000' } }] },
        { type: 'text', text: '普通' },
      ],
    };
    const svg = renderDocumentPreview({ title: '色', content: doc(colored) }, { size: 'm' });
    expect(svg).toContain('<tspan fill="#cc0000">红字</tspan>');
    expect(svg).toContain('普通');
    expect(svg).not.toContain('<tspan fill="&quot;');
  });

  it('子集合出缩略图（标题 + 三条行条）', () => {
    const svg = renderDocumentPreview(
      { title: '集', content: doc({ type: 'collectionBlock', attrs: { title: '任务清单' } }) },
      { size: 'm' },
    );
    expect(svg).toContain('任务清单');
    expect((svg.match(/height="2.5"/g) ?? []).length).toBe(3);
  });
});
