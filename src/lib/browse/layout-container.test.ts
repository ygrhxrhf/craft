import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import { describe, expect, it } from 'vitest';

/**
 * The layout container (G1079 / G1124). The official main wrapper is a *named* inline-size
 * container, so the list's column thresholds key off the content width rather than the viewport:
 * a wide window with the sidebar open still counts as narrow. A named query matches across an
 * unnamed container in between, which is why the name matters.
 */
const cssPath = fileURLToPath(new URL('../../app/globals.css', import.meta.url));
const css = readFileSync(cssPath, 'utf8');
const layout = readFileSync(
  fileURLToPath(new URL('../../app/(app)/layout.tsx', import.meta.url)),
  'utf8',
);

describe('the named layout container', () => {
  it('makes the main wrapper an inline-size container with the official name', () => {
    expect(css).toContain('container-type: inline-size;');
    expect(css).toContain('container-name: web-shared-layout-main-wrapper;');
  });

  it('hangs the class on the main element', () => {
    expect(layout).toContain('app-main-wrapper');
  });

  it('declares the two content-width thresholds verbatim', () => {
    expect(css).toContain('@container web-shared-layout-main-wrapper (width >= 768px)');
    expect(css).toContain('@container web-shared-layout-main-wrapper (width >= 1024px)');
  });

  it('keys the columns on the container, not on a viewport media query', () => {
    // The 更新/创建 columns belong to the 768 threshold and 最后查看 to the 1024 one.
    const at768 = css.indexOf('@container web-shared-layout-main-wrapper (width >= 768px)');
    const block768 = css.slice(at768, css.indexOf('}', at768));
    expect(block768).toContain('.app-col-updated');
    expect(block768).toContain('.app-col-created');

    const at1024 = css.indexOf('@container web-shared-layout-main-wrapper (width >= 1024px)');
    const block1024 = css.slice(at1024, css.indexOf('}', at1024));
    expect(block1024).toContain('.app-col-last-viewed');
  });

  it('compiles, so the container query is accepted by the pipeline', async () => {
    const out = await postcss([tailwind()]).process(css, { from: 'src/app/globals.css' });
    expect(out.css).toContain('container-name: web-shared-layout-main-wrapper');
  });
});
