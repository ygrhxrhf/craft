import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { selectionChromeRanges } from './block-selection-chrome';

const doc = (sizes: number[]) => ({
  childCount: sizes.length,
  child: (index: number) => ({ nodeSize: sizes[index] }),
});

/** G618: chrome ranges are per block, and a stale index must never land outside the document. */
describe('block selection chrome ranges', () => {
  it('maps a selected index to its document range', () => {
    expect(selectionChromeRanges(doc([10, 20, 10]), [1])).toEqual([{ index: 1, from: 10, to: 30 }]);
  });

  it('keeps several blocks in document order', () => {
    expect(selectionChromeRanges(doc([10, 20, 10]), [2, 0])).toEqual([
      { index: 0, from: 0, to: 10 },
      { index: 2, from: 30, to: 40 },
    ]);
  });

  it('drops out-of-range, negative and duplicate indices', () => {
    expect(selectionChromeRanges(doc([10, 10]), [0, 0, 2, -1])).toEqual([
      { index: 0, from: 0, to: 10 },
    ]);
  });

  it('renders nothing for an empty selection', () => {
    expect(selectionChromeRanges(doc([10]), [])).toEqual([]);
  });

  it('is wired into the editor and adds a node per selected block, not just a class', () => {
    const chrome = readFileSync(
      new URL('../../components/editor/extensions/block-selection-chrome.tsx', import.meta.url),
      'utf8',
    );
    expect(chrome).toContain('Decoration.node(');
    expect(chrome).toContain('Decoration.widget(');
    expect(chrome).toContain('data-block-selection-chrome');
    const editor = readFileSync(
      new URL('../../components/editor/Editor.tsx', import.meta.url),
      'utf8',
    );
    expect(editor).toContain('BlockSelectionChrome');
  });
});