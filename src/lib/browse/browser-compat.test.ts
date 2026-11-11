import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  BEST_EXPERIENCE,
  BROWSER_COMPAT_DISMISS_KEY,
  BROWSER_NOT_COMPATIBLE,
  DONT_SHOW_AGAIN,
  USE_ANYWAYS,
  dismissCompat,
  isCompatDismissed,
  isSafariBrowser,
  isSupportedBrowser,
  shouldShowCompatNotice,
} from './browser-compat';

describe('the browser-compat copy is the official four (G346)', () => {
  it('keeps every sentence verbatim', () => {
    expect(BROWSER_NOT_COMPATIBLE).toBe('你的浏览器似乎不兼容');
    expect(BEST_EXPERIENCE).toBe('为了获得最佳体验，我们建议你使用支持的浏览器之一。');
    expect(USE_ANYWAYS).toBe('仍然使用 Craft');
    expect(DONT_SHOW_AGAIN).toBe('不再显示此内容');
  });
});

describe('the UA gate', () => {
  it('refuses IE and the old EdgeHTML engine', () => {
    expect(isSupportedBrowser('Mozilla/5.0 (Windows NT 10.0; Trident/7.0; rv:11.0) like Gecko')).toBe(false);
    expect(isSupportedBrowser('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Edge/18.19041')).toBe(false);
    expect(isSupportedBrowser('')).toBe(false);
    expect(isSupportedBrowser(null)).toBe(false);
  });

  it('accepts the browsers Craft supports', () => {
    expect(
      isSupportedBrowser(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      ),
    ).toBe(true);
    expect(
      isSupportedBrowser(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      ),
    ).toBe(true);
    expect(isSupportedBrowser('Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0')).toBe(true);
    expect(
      isSupportedBrowser(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
      ),
    ).toBe(true);
  });
});

/**
 * G746：官方「快速开启」在 Safari 上主键换成 ⌘⇧O（`Hd` 分支）。判据必须把 Chrome 那类
 * 「带 `Safari/` 的 Chromium UA」与 iOS 上的第三方壳一起排除，只认真 Safari／iOS Safari。
 */
describe('the Safari gate (G746)', () => {
  it('accepts Safari and iOS Safari', () => {
    expect(
      isSafariBrowser(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      ),
    ).toBe(true);
    expect(
      isSafariBrowser(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      ),
    ).toBe(true);
  });

  it('rejects Chromium shells that still carry a Safari token', () => {
    expect(
      isSafariBrowser(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      ),
    ).toBe(false);
    expect(
      isSafariBrowser(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
      ),
    ).toBe(false);
    expect(
      isSafariBrowser(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.0.0 Mobile/15E148 Safari/604.1',
      ),
    ).toBe(false);
    expect(
      isSafariBrowser(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/131.0 Mobile/15E148 Safari/605.1.15',
      ),
    ).toBe(false);
    expect(isSafariBrowser('')).toBe(false);
    expect(isSafariBrowser(null)).toBe(false);
  });
});

describe('the persistent dismiss flag (not.show.this.again)', () => {  const store = () => {
    const map = new Map<string, string>();
    return {
      map,
      storage: {
        getItem: (key: string) => map.get(key) ?? null,
        setItem: (key: string, value: string) => void map.set(key, value),
      },
    };
  };

  it('writes the flag under its own key', () => {
    const { map, storage } = store();
    dismissCompat(storage);
    expect(map.get(BROWSER_COMPAT_DISMISS_KEY)).toBe('1');
    expect(isCompatDismissed(storage)).toBe(true);
  });

  it('treats a missing/broken storage as "not dismissed" and never throws', () => {
    expect(isCompatDismissed(undefined)).toBe(false);
    expect(
      isCompatDismissed({
        getItem: () => {
          throw new Error('blocked');
        },
      }),
    ).toBe(false);
    expect(() => dismissCompat(undefined)).not.toThrow();
  });

  it('hides the notice once dismissed, even on an unsupported browser', () => {
    const ie = 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1)';
    expect(shouldShowCompatNotice(ie, false)).toBe(true);
    expect(shouldShowCompatNotice(ie, true)).toBe(false);
    expect(shouldShowCompatNotice('Mozilla/5.0 Chrome/131.0.0.0 Safari/537.36', false)).toBe(false);
  });
});

describe('the notice is mounted from the root layout', () => {
  const read = (relative: string) =>
    readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');

  it('renders all four sentences in the component', () => {
    const source = read('../../components/app/BrowserCompatNotice.tsx');
    expect(source).toContain('BROWSER_NOT_COMPATIBLE');
    expect(source).toContain('BEST_EXPERIENCE_PREFIX');
    expect(source).toContain('USE_ANYWAYS');
    expect(source).toContain('DONT_SHOW_AGAIN');
    expect(source).toContain('dismissCompat');
  });

  it('sits in layout.tsx next to the update banner', () => {
    const layout = read('../../app/layout.tsx');
    expect(layout).toContain('BrowserCompatNotice');
    expect(layout).toContain('<BrowserCompatNotice />');
  });
});