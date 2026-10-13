import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { NodeViewProps } from '@tiptap/react';
import { CodeBlockView } from './code-block-view';

function render(language: string | null, themeId = 'auto') {
  const props = {
    node: { attrs: { language, themeId }, textContent: 'var a = 1' },
    updateAttributes: () => {},
  } as unknown as NodeViewProps;
  return renderToStaticMarkup(<CodeBlockView {...props} />);
}

/** The language dropdown only, so the theme dropdown's own default cannot answer for it. */
function languageSelect(html: string): string {
  const at = html.indexOf('aria-label="代码语言"');
  const start = html.lastIndexOf('<select', at);
  const end = html.indexOf('</select>', at);
  return html.slice(start, end);
}

describe('代码块语言下拉的展示值＝存储值，不替空值编造语言', () => {
  it('块上没有 language 时不出现任何选中项（官方＝无语言时不写 language 键）', () => {
    const html = render(null);
    expect(languageSelect(html)).not.toMatch(/<option[^>]*\bselected\b/);
  });

  it('块上有 language 时选中项就是该语言', () => {
    const html = render('python');
    expect(languageSelect(html)).toMatch(/<option value="python" selected/);
  });

  it('主题下拉默认选中 auto，与语言是否为空无关', () => {
    const html = render(null);
    expect(html).toMatch(/<option value="auto" selected/);
  });
});
