import { describe, expect, it } from 'vitest';

import { SPACE_MARK_RULES, matchSpaceMarkRule } from './markdown-mark-rules';

/**
 * G1558: the six inline marks are the same on both sides, the *timing* is not — official converts
 * when the space after the closing marker is typed (`runs/wave1-24-*`, six strings each followed by
 * a space) and leaves a marker that is not at line end alone (`a **X** b` stays literal).
 */
describe('the space-triggered mark rules', () => {
  it.each([
    ['**X** ', 'bold', 'X'],
    ['__X__ ', 'bold', 'X'],
    ['*Y* ', 'italic', 'Y'],
    ['_Y_ ', 'italic', 'Y'],
    ['`C` ', 'code', 'C'],
    ['~~Z~~ ', 'strike', 'Z'],
    ['==W== ', 'highlight', 'W'],
  ])('%s marks %s as %s', (typed, mark, text) => {
    const hit = matchSpaceMarkRule(typed);
    expect(hit, `no rule matched ${typed}`).not.toBeNull();
    expect(hit!.rule.mark).toBe(mark);
    expect(hit!.text).toBe(text);
  });

  it('links take the url out of the parentheses', () => {
    const hit = matchSpaceMarkRule('[T](https://craft.do) ');
    expect(hit?.rule.mark).toBe('link');
    expect(hit?.text).toBe('T');
    expect(hit?.href).toBe('https://craft.do');
  });

  it('waits for the trailing space, as the official table does', () => {
    for (const typed of ['**X**', '~~Z~~', '==W==', '`C`', '[T](https://a)']) {
      expect(matchSpaceMarkRule(typed), `${typed} converted without a space`).toBeNull();
    }
  });

  it('leaves a marker that is not at line end alone', () => {
    expect(matchSpaceMarkRule('a **X** b')).toBeNull();
    // The same marker with a space before it is at the start of a run, so it does convert.
    expect(matchSpaceMarkRule('a **X** ')?.rule.mark).toBe('bold');
  });

  it('prefers the two-character form over the one-character form', () => {
    expect(matchSpaceMarkRule('**X** ')?.rule.mark).toBe('bold');
    expect(matchSpaceMarkRule('**X** ')?.text).toBe('X');
  });

  it('replaces the markers and keeps the typed space', () => {
    const hit = matchSpaceMarkRule('**X** ');
    // The match starts at the first marker (the lookbehind is not part of it) and covers the space.
    expect(hit?.start).toBe(0);
    expect(hit?.length).toBe('**X** '.length);
  });

  it('covers the six marks named in the ledger row', () => {
    const marks = new Set(SPACE_MARK_RULES.map((rule) => rule.mark));
    expect([...marks].sort()).toEqual(['bold', 'code', 'highlight', 'italic', 'link', 'strike']);
  });
});
