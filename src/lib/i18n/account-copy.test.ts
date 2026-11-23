import { describe, expect, it } from 'vitest';

import { LOGGED_IN_AS_KEY, LOGGED_IN_AS_TEMPLATE, loggedInAsText } from './account-copy';
import { parseEmbeddedTags } from './embedded-tags';
import { hasHarvest, readHarvest } from '@/lib/craft-ref/harvest';

/**
 * G320: the account panel's login line is one of the 53 tagged keys. The template has to keep the
 * `<strong>` tag (it is what the renderer turns into bold) and the key has to match the harvest
 * verbatim.
 */
describe.skipIf(!hasHarvest())('the logged-in-as copy (G320)', () => {
  const harvest = () => readHarvest();

  it('carries the harvested key and text verbatim', () => {
    const line = harvest().split(/\r?\n/).find((l) => l.startsWith(`${LOGGED_IN_AS_KEY}\t`));
    expect(line, `harvest has no ${LOGGED_IN_AS_KEY}`).toBeTruthy();
    expect(line!.split('\t')[1]).toBe(LOGGED_IN_AS_TEMPLATE);
  });

  it('fills [0] with the email and leaves the tag for the renderer', () => {
    expect(loggedInAsText('a@b.com')).toBe('你已以<strong>a@b.com</strong>的身份登录');
  });

  it('parses into a bold segment, not a leaked tag', () => {
    const segments = parseEmbeddedTags(loggedInAsText('a@b.com'));
    expect(segments).toEqual([
      { kind: 'text', text: '你已以', styles: [] },
      { kind: 'text', text: 'a@b.com', styles: ['bold'] },
      { kind: 'text', text: '的身份登录', styles: [] },
    ]);
  });
});
