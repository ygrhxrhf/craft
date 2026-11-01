import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  ONBOARDING_DESC,
  ONBOARDING_DESC2,
  ONBOARDING_DESC2_KEY,
  ONBOARDING_DESC_KEY,
  ONBOARDING_WELCOME,
  ONBOARDING_WELCOME_KEY,
} from './onboarding-copy';
import { parseEmbeddedTags } from './embedded-tags';

const HARVEST = readFileSync(
  join(process.cwd(), 'docs', 'craft-ref', 'features', '_harvest', 'i18n-zh.tsv'),
  'utf8',
);

/**
 * G320: the onboarding copy carries a self-closing `<br/>`, so it renders through the tag parser
 * rather than being printed raw.
 */
describe('the onboarding copy (G320)', () => {
  it('matches the harvest verbatim', () => {
    for (const [key, text] of [
      [ONBOARDING_WELCOME_KEY, ONBOARDING_WELCOME],
      [ONBOARDING_DESC_KEY, ONBOARDING_DESC],
      [ONBOARDING_DESC2_KEY, ONBOARDING_DESC2],
    ] as const) {
      const line = HARVEST.split(/\r?\n/).find((l) => l.startsWith(`${key}\t`));
      expect(line, key).toBeTruthy();
      expect(line!.split('\t')[1]).toBe(text);
    }
  });

  it('parses its <br/> into a break segment, not a leaked tag', () => {
    const segments = parseEmbeddedTags(ONBOARDING_DESC);
    expect(segments.some((s) => s.kind === 'break')).toBe(true);
    expect(segments.every((s) => s.kind === 'break' || !s.text.includes('<'))).toBe(true);
  });
});
