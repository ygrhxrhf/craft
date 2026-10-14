import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { LOADING, MOVE_TO } from './official-copy';

const source = (rel: string) => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');

/**
 * Two official strings end in the single `…` glyph, and both were previously typed with three
 * ASCII dots on every surface that shows them. The constants exist so the wording cannot drift
 * per file, and these checks exist so a new surface cannot quietly retype it.
 */
const LOADING_SURFACES = [
  'components/editor/tabs/RightPanel.tsx',
  'components/sidebar/CollectionTree.tsx',
  'components/sidebar/DocumentTree.tsx',
  'components/sidebar/FolderTree.tsx',
  'components/sidebar/WhiteboardTree.tsx',
];

describe('the ellipsis copy reaches every screen', () => {
  it.each(LOADING_SURFACES)('%s renders the collected loading line', (file) => {
    const src = source(file);
    expect(src).toContain('{LOADING}');
    expect(src).not.toContain('加载中...');
  });

  it('the info panel names its archive control 移动到…', () => {
    const src = source('components/editor/tabs/InfoTab.tsx');
    expect(src).toContain('{MOVE_TO}');
    expect(src).not.toContain('移动到...');
  });

  it('keeps the glyphs distinct in the constants themselves', () => {
    expect(LOADING).toBe('加载中…');
    expect(MOVE_TO).toBe('移动到…');
  });
});
