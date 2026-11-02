import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * G1608: offline the New Document / New Folder buttons do nothing observable — no navigation, no
 * disabled state, no toast. The gate is a silent early return.
 */
describe('offline create gate (G1608)', () => {
  const source = readFileSync(
    join(process.cwd(), 'src', 'components', 'document', 'QuickActions.tsx'),
    'utf8',
  );

  it('returns silently when offline in both handlers', () => {
    expect(source).toMatch(/handleNewDoc\(\)\s*\{[\s\S]{0,200}!navigator\.onLine\) return;/);
    expect(source).toMatch(/handleNewFolder\(\)\s*\{[\s\S]{0,200}!navigator\.onLine\) return;/);
  });
});
