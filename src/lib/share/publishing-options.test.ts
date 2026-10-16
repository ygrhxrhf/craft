import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_ENABLE_SEO,
  EXPIRE_NEVER,
  SEO_DESC,
  expiryLabel,
  isExpired,
  seoEffective,
} from './publishing-options';

/**
 * Share publishing options (G143): indexing off by default and defeated by a passcode, and expiry
 * as its own axis.
 */
describe('search-engine indexing', () => {
  it('is off by default', () => {
    expect(DEFAULT_ENABLE_SEO).toBe(false);
  });

  it('takes effect only when on and no passcode is set', () => {
    expect(seoEffective({ enableSeo: true, passcode: null })).toBe(true);
    expect(seoEffective({ enableSeo: true, passcode: 'secret' })).toBe(false);
    expect(seoEffective({ enableSeo: false, passcode: null })).toBe(false);
  });

  it('keeps the description sentence verbatim', () => {
    expect(SEO_DESC).toBe('启用后，此页面将显示在搜索引擎结果中，例如 Google。只有在没有提供密码的情况下才有效。');
  });

  it('is actually consulted by the published page metadata', () => {
    // G143：这条规则此前只活在纯函数里——`/p/[slug]` 的 generateMetadata 无条件输出
    // 标题/描述/OG，开关在服务端完全无效。钉住接线。
    const source = readFileSync(
      join(process.cwd(), 'src/app/p/[slug]/page.tsx'),
      'utf8',
    );
    expect(source).toContain('seoEffective');
    expect(source).toMatch(/robots:\s*\{\s*index:\s*false/);
  });
});

describe('expiry', () => {
  it('prints 永不过期 when there is no date', () => {
    expect(expiryLabel(null)).toBe(EXPIRE_NEVER);
  });

  it('fills the date into the expire.on sentence', () => {
    expect(expiryLabel('2026-12-31')).toBe('于 2026-12-31 过期');
  });

  it('never expires without a date', () => {
    expect(isExpired(null)).toBe(false);
  });

  it('expires once the moment has passed', () => {
    const now = Date.parse('2026-10-14T00:00:00.000Z');
    expect(isExpired('2026-10-13T00:00:00.000Z', now)).toBe(true);
    expect(isExpired('2026-10-15T00:00:00.000Z', now)).toBe(false);
  });
});
