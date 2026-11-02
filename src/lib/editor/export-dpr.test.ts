import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** G485: image export uses the screen's DPR, not a fixed 2×. */
describe('export resolution (G485)', () => {
  const source = readFileSync(
    join(process.cwd(), 'src', 'components', 'editor', 'tabs', 'InfoTab.tsx'),
    'utf8',
  );

  it('uses devicePixelRatio for the image export', () => {
    expect(source).toContain('window.devicePixelRatio');
    // The option block also carries the G64 canvas width/height now, so the closing brace is
    // no longer on the same line as `pixelRatio`.
    expect(source).toMatch(/pixelRatio[,\s]/);
    expect(source).not.toContain('pixelRatio: 2');
  });
});
