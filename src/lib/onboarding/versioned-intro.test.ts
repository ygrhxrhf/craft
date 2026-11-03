import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  INTRO_SEEN_KEY,
  INTRO_VERSIONS,
  introVersionNumber,
  pendingIntroPages,
} from './versioned-intro';

describe('the versioned update carousel data (G305)', () => {
  it('orders the versions chronologically', () => {
    expect(INTRO_VERSIONS.map((entry) => entry.version)).toEqual([
      'v3',
      'v319',
      'v326',
      'v330',
      'v350',
    ]);
    expect(introVersionNumber('v330')).toBe(330);
    expect(introVersionNumber('nope')).toBe(0);
  });

  it('carries the four v3 pages verbatim', () => {
    const v3 = INTRO_VERSIONS.find((entry) => entry.version === 'v3');
    expect(v3?.pages.map((page) => page.title)).toEqual([
      '为你焕新',
      '完成你的任务',
      '创造你的风格',
      '建立你的合集',
    ]);
    expect(v3?.pages[2].content).toContain('100 多种预设样式');
  });

  it('shows only versions newer than the one this device has seen', () => {
    expect(pendingIntroPages(null).map((entry) => entry.version)).toEqual([
      'v3',
      'v319',
      'v326',
      'v330',
      'v350',
    ]);
    expect(pendingIntroPages('v319').map((entry) => entry.version)).toEqual([
      'v326',
      'v330',
      'v350',
    ]);
    expect(pendingIntroPages('v350')).toEqual([]);
  });

  it('is mounted once in the app shell and remembers the newest version', () => {
    const providers = readFileSync(
      new URL('../../components/providers/Providers.tsx', import.meta.url),
      'utf8',
    );
    const carousel = readFileSync(
      new URL('../../components/onboarding/VersionIntroCarousel.tsx', import.meta.url),
      'utf8',
    );
    expect(providers).toContain('<VersionIntroCarousel />');
    expect(carousel).toContain('localStorage.setItem(INTRO_SEEN_KEY, newestVersion)');
    expect(INTRO_SEEN_KEY).toBe('craft.intro.seen.version');
    expect(carousel).toContain("'开始使用'");
  });
});
