import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { NodeViewProps } from '@tiptap/react';
import { CodeBlockView } from './code-block-view';

function render(language: string | null, themeId = 'auto', text = 'var a = 1') {
  const props = {
    node: { attrs: { language, themeId }, textContent: text },
    updateAttributes: () => {},
  } as unknown as NodeViewProps;
  return renderToStaticMarkup(<CodeBlockView {...props} />);
}

/** The closed picker shows its current value as the button text. */
function pickerText(html: string, label: string): string {
  const at = html.indexOf(`aria-label="${label}"`);
  const start = html.lastIndexOf('<button', at);
  const end = html.indexOf('</button>', at);
  return html.slice(start, end);
}

describe('代码块的语言与主题选择器＝带搜索框的菜单，展示值＝存储值', () => {
  it('代码块带全屏模式，Escape 退出', () => {
    const source = readFileSync(fileURLToPath(new URL('./code-block-view.tsx', import.meta.url)), 'utf8');
    expect(source).toContain('aria-label="全屏模式"');
    expect(source).toContain("event.key === 'Escape'");
    expect(source).toContain('fixed inset-4');
  });

  it('只有带预览的块才有拆分视图与关闭预览（G148）', () => {
    const mermaid = render('mermaid', 'auto', 'graph TD; A-->B');
    expect(mermaid).toContain('aria-label="拆分视图"');
    expect(mermaid).toContain('aria-label="关闭预览"');
    const python = render('python');
    expect(python).not.toContain('aria-label="拆分视图"');
    expect(python).not.toContain('aria-label="关闭预览"');
  });

  it('两个选择器都带官方搜索占位（搜索语言／搜索主题）', () => {
    // The search box renders only while the menu is open, so the closed markup cannot show it.
    const source = readFileSync(fileURLToPath(new URL('./code-block-view.tsx', import.meta.url)), 'utf8');
    expect(source).toContain('placeholder="搜索语言"');
    expect(source).toContain('placeholder="搜索主题"');
  });

  it('块上没有 language 时语言按钮不编造一个语言名', () => {
    expect(pickerText(render(null), '代码语言')).not.toContain('Plain text');
  });

  it('块上有 language 时按钮显示该语言的标签', () => {
    expect(pickerText(render('python'), '代码语言')).toContain('Python');
  });

  it('语言菜单仍排除 mermaid，除非当前块就是它', () => {
    const source = readFileSync(fileURLToPath(new URL('./code-block-view.tsx', import.meta.url)), 'utf8');
    expect(source).toContain('appearsInLanguageMenu(item.storedLangCode) || item.storedLangCode === language');
  });

  it('行号槽与代码行数一致，空块也有一行', () => {
    const gutter = (html: string) => {
      const start = html.indexOf('code-gutter');
      return html.slice(start, html.indexOf('</pre>', start));
    };
    expect(gutter(render('python', 'auto', 'a\nb\nc')).match(/>\d+<\//g)).toEqual(['>1</', '>2</', '>3</']);
    expect(gutter(render('python', 'auto', ''))).toContain('>1</');
  });

  it('主题按钮默认显示 Auto，与语言是否为空无关', () => {
    expect(pickerText(render(null), '代码主题')).toContain('Auto');
  });
});
