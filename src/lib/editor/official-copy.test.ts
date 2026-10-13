import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { TOC_PLACEHOLDER, TOC_PLACEHOLDER_KEY } from './official-copy';

const catalog = readFileSync(join(process.cwd(), 'docs/craft-ref/features/feature-catalog.md'), 'utf8');

function ledgerValue(key: string): string | null {
  const line = catalog.split('\n').find((row) => row.includes(` \`${key}\``));
  if (!line) return null;
  const match = /^-\s+(.+?)\s+`/.exec(line.trim());
  return match ? match[1] : null;
}

describe('TOC placeholder copy', () => {
  it('matches toolbar.toc.placeholder in the ledger', () => {
    expect(ledgerValue(TOC_PLACEHOLDER_KEY)).toBe(TOC_PLACEHOLDER);
  });

  it('reads a missing key as null', () => {
    expect(ledgerValue('toolbar.toc.definitely.not.a.key')).toBeNull();
  });
});

describe('the TOC view actually consumes the shared constant', () => {
  const view = readFileSync(
    join(process.cwd(), 'src/components/editor/extensions/toc-view.tsx'),
    'utf8',
  );

  it('imports TOC_PLACEHOLDER from the single-sourced module', () => {
    expect(view).toContain(`TOC_PLACEHOLDER } from '@/lib/editor/official-copy'`);
  });

  it('no longer carries the local sentence the build used to guess', () => {
    expect(view).not.toContain('给标题加上层级后会自动出现在这里');
  });
});
