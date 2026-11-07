import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { BLOCK_LINK_READ_ERROR, BLOCK_LINK_READ_ERROR_KEY } from './error-copy';

/** G330: the sentence is the collected one, and the block link view actually reports it. */
describe('the blocklink read error (G330)', () => {
  it('carries the collected key and sentence', () => {
    expect(BLOCK_LINK_READ_ERROR_KEY).toBe('error.reading.blocklink');
    expect(BLOCK_LINK_READ_ERROR).toBe('读取 blocklink 时出错');
  });

  it('is surfaced by the block link view instead of a silent return', () => {
    const view = readFileSync(
      new URL('../../components/editor/extensions/block-link-view.tsx', import.meta.url),
      'utf8',
    );
    expect(view).toContain('BLOCK_LINK_READ_ERROR');
    expect(view).toContain('toast.add({');
    // The old path: a target-less link consumed the click and did nothing.
    expect(view).not.toContain('if (!documentId) return;');
  });
});