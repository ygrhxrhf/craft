import { describe, expect, it } from 'vitest';

import {
  craftHrefTarget,
  craftSchemeOf,
  dayNoteHref,
  isCraftScheme,
  parseDayNoteHref,
} from './craft-schemes';

// G565: four schemes, and only these four are ours.
describe('the craft scheme vocabulary', () => {
  it('recognizes the four schemes', () => {
    expect(craftSchemeOf('tex://x^2')).toBe('tex');
    expect(craftSchemeOf('day://2026.09.27')).toBe('day');
    expect(craftSchemeOf('craftdocs://users/abc')).toBe('craftdocs');
    expect(craftSchemeOf('craft://credit')).toBe('craft');
  });

  it('ignores ordinary web links', () => {
    expect(craftSchemeOf('https://example.com')).toBeNull();
    expect(craftSchemeOf('mailto:a@b.c')).toBeNull();
    expect(isCraftScheme('http')).toBe(false);
  });
});

// G558: the day link is dot-separated and zero-padded.
describe('the daily-note deep link', () => {
  it('builds day://YYYY.MM.DD', () => {
    expect(dayNoteHref(new Date(2026, 8, 27))).toBe('day://2026.09.27');
    expect(dayNoteHref(new Date(2026, 11, 5))).toBe('day://2026.12.05');
  });

  it('round-trips to the same local day', () => {
    const day = parseDayNoteHref('day://2026.09.27');
    expect(day?.getFullYear()).toBe(2026);
    expect(day?.getMonth()).toBe(8);
    expect(day?.getDate()).toBe(27);
    expect(day?.getHours()).toBe(0);

    // G661: accepts dash as well as dot
    const dashDay = parseDayNoteHref('day://2026-09-27');
    expect(dashDay?.getFullYear()).toBe(2026);
    expect(dashDay?.getMonth()).toBe(8);
    expect(dashDay?.getDate()).toBe(27);
  });

  it('rejects a malformed or impossible day', () => {
    expect(parseDayNoteHref('day://2026.9.27')).toBeNull();
    expect(parseDayNoteHref('day://2026.02.30')).toBeNull();
    expect(parseDayNoteHref('https://x')).toBeNull();
  });

  it('maps a day link onto the local daily-notes route', () => {
    expect(craftHrefTarget('day://2026.09.27')).toBe('/daily-notes?date=2026-09-27');
    // Other schemes have no local route yet, so they stay inert.
    expect(craftHrefTarget('tex://x')).toBeNull();
    expect(craftHrefTarget('craft://credit')).toBeNull();
  });
});
