import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * G320: the renderer exists and the account panel actually uses it. A source-level check because
 * the component is a thin JSX shell over `parseEmbeddedTags`, whose behaviour is covered by
 * `embedded-tags.test.ts` — what this pins is the **wiring**: the tagged key must not be printed raw.
 */
const richText = readFileSync(fileURLToPath(new URL('./rich-text.tsx', import.meta.url)), 'utf8');
const panels = readFileSync(
  fileURLToPath(new URL('../settings/SettingsPanels.tsx', import.meta.url)),
  'utf8',
);

describe('the embedded-tag renderer (G320)', () => {
  it('parses through the shared tag parser rather than string-replacing', () => {
    expect(richText).toContain('parseEmbeddedTags');
    expect(richText).not.toMatch(/\.replace\(\/<strong>/);
  });

  it('renders a break segment as <br /> and link segments as anchors', () => {
    expect(richText).toContain('<br />');
    expect(richText).toContain('hrefFor');
  });

  it('is wired into the account panel for the tagged login line', () => {
    expect(panels).toContain('loggedInAsText');
    expect(panels).toContain('<RichText');
  });
});
