import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(join(process.cwd(), 'src', rel), 'utf8');

/** G1458：CJK 兜底是"四轴 × 四语区"的一张表，不是一条全局栈。 */
describe('the CJK fallback table (G1458)', () => {
  const css = read('app/globals.css');

  it('declares the four placeholder axes on :root', () => {
    for (const axis of ['--cjk-sans', '--cjk-serif', '--cjk-rounded', '--cjk-mono']) {
      expect(css).toContain(`${axis}: "CJK Fallback Placeholder";`);
    }
  });

  it('rewrites all four axes per language block', () => {
    for (const lang of ['ja', 'ko', 'zh-Hans', 'zh-Hant']) {
      const start = css.indexOf(`html[lang="${lang}"]`);
      expect(start, lang).toBeGreaterThan(-1);
      const block = css.slice(start, css.indexOf('}', start));
      for (const axis of ['--cjk-sans', '--cjk-serif', '--cjk-rounded', '--cjk-mono']) {
        expect(block, `${lang} ${axis}`).toContain(`${axis}:`);
      }
    }
  });

  it('hangs the page font packs off those axes and sets the official lang', () => {
    const packs = read('components/editor/themes/page-style.ts');
    expect(packs).toContain('var(--cjk-sans)');
    expect(packs).toContain('var(--cjk-serif)');
    expect(packs).toContain('var(--cjk-rounded)');
    expect(packs).toContain('var(--cjk-mono)');
    expect(read('app/layout.tsx')).toContain('lang="zh-Hans"');
  });
});
