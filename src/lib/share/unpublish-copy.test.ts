import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { UNPUBLISH, UNPUBLISH_KEY } from './unpublish-copy';

describe('the unpublish copy (G1445)', () => {
  it('uses the collected value verbatim', () => {
    expect(UNPUBLISH).toBe('取消发布');
    expect(UNPUBLISH_KEY).toBe('unpublish');
  });

  it('gives the publish switch a second, danger-styled entry', () => {
    const dialog = readFileSync(
      join(process.cwd(), 'src/components/share/ShareDialog.tsx'),
      'utf8',
    );
    expect(dialog).toContain('data-testid="share-unpublish"');
    expect(dialog).toContain('text-destructive');
    expect(dialog).toContain('{UNPUBLISH}');
    expect(dialog).toContain('handlePublishedChange(false)');
  });
});