import { describe, expect, it } from 'vitest';
import {
  PATH_EMPTY,
  PATH_NO_SPACES,
  PATH_TOO_SHORT,
  normalizeShareSlug,
  pathTooLong,
  slugifyTitle,
} from './slug';

describe('slugifyTitle', () => {
  it('turns a title into a readable slug', () => {
    expect(slugifyTitle('我的 计划 2026')).toBe('我的-计划-2026');
    expect(slugifyTitle('Hello, World!')).toBe('hello-world');
    expect(slugifyTitle('  a---b  ')).toBe('a-b');
  });

  it('gives up on titles with nothing writable in them', () => {
    expect(slugifyTitle('***')).toBe('');
    expect(slugifyTitle('')).toBe('');
  });
});

describe('normalizeShareSlug', () => {
  it('accepts a cleaned-up slug', () => {
    // ☆ G89 之后：中间空格是**报错**（官方那句），不再是静默转 `-`。
    expect(normalizeShareSlug('release-notes')).toEqual({ ok: true, slug: 'release-notes' });
    expect(normalizeShareSlug('  产品-说明 ')).toEqual({ ok: true, slug: '产品-说明' });
  });

  it('rejects empty, reserved and over-long values', () => {
    expect(normalizeShareSlug('   ').ok).toBe(false);
    expect(normalizeShareSlug('login').ok).toBe(false);
    expect(normalizeShareSlug('documents').ok).toBe(false);
    expect(normalizeShareSlug('a'.repeat(65)).ok).toBe(false);
  });

  it('rejects slugs that would break the route', () => {
    expect(normalizeShareSlug('-lead').ok).toBe(false);
    expect(normalizeShareSlug('trail-').ok).toBe(false);
    expect(normalizeShareSlug('a/b').ok).toBe(false);
    expect(normalizeShareSlug('a?b').ok).toBe(false);
  });
});

/**
 * `gap.md` G89 —— 自定义分享路径的官方规则：≥2 字符、<500 字符、不含空格。
 * 官方逐字在 `i18n-zh.tsv:128-132`。
 */
describe('自定义路径的官方规则（G89）', () => {
  it('官方四句逐字（too.long 的 500 换成本仓实际上限）', () => {
    expect(PATH_EMPTY).toBe('路径不能为空。');
    expect(PATH_NO_SPACES).toBe('路径不能包含空格');
    expect(PATH_TOO_SHORT).toBe('路径长度必须至少为 2 个字符');
    expect(pathTooLong(64)).toBe('路径长度必须少于 64 个字符。');
  });

  it('中间有空格 ⇒ 报官方那句（不再静默转成 -）', () => {
    const result = normalizeShareSlug('my page');
    expect(result).toEqual({ ok: false, error: PATH_NO_SPACES });
    // 首尾空白只是键入噪音，仍按 trim 处理、不算"含空格"
    expect(normalizeShareSlug('  my-page  ')).toEqual({ ok: true, slug: 'my-page' });
  });

  it('少于 2 个字符 ⇒ 报官方那句', () => {
    expect(normalizeShareSlug('a')).toEqual({ ok: false, error: PATH_TOO_SHORT });
    expect(normalizeShareSlug('ab').ok).toBe(true);
  });

  it('空值 ⇒ 官方那句（与"少于 2 个字符"分开）', () => {
    expect(normalizeShareSlug('   ')).toEqual({ ok: false, error: PATH_EMPTY });
  });
});
