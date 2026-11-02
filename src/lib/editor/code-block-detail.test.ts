import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CODE_CLOSE_PREVIEW, CODE_SPLIT_VIEW, hasCodePreview } from './code-block-detail';

const catalog = readFileSync(join(process.cwd(), 'docs/craft-ref/features/feature-catalog.md'), 'utf8');

function ledgerValue(key: string): string | null {
  const line = catalog.split('\n').find((row) => row.includes(` \`${key}\``));
  if (!line) return null;
  const match = /^-\s+(.+?)\s+`/.exec(line.trim());
  return match ? match[1] : null;
}

describe('code block detail toggles (G148)', () => {
  it('takes both labels from the catalog', () => {
    expect(ledgerValue(CODE_SPLIT_VIEW.key)).toBe(CODE_SPLIT_VIEW.label);
    expect(ledgerValue(CODE_CLOSE_PREVIEW.key)).toBe(CODE_CLOSE_PREVIEW.label);
  });

  it('offers a preview only where one exists (mermaid)', () => {
    expect(hasCodePreview('mermaid')).toBe(true);
    expect(hasCodePreview('python')).toBe(false);
    expect(hasCodePreview(null)).toBe(false);
  });
});
