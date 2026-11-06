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