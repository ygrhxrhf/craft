import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  CHARACTER_LIMIT,
  CHARACTER_LIMIT_SUBTITLE,
  CHARACTER_LIMIT_TITLE,
  clampToCharacterLimit,
  exceedsCharacterLimit,
} from './character-limit';

/**
 * `gap.md` G89 / G1532 —— 单字段 10000 字符上限。官方逐字（`i18n-zh.tsv:52-53`／`dialogs.md:9`）。
 */
describe('单字段字符上限（G89）', () => {
  it('官方两句逐字，上限是 10000', () => {
    expect(CHARACTER_LIMIT).toBe(10000);
    expect(CHARACTER_LIMIT_TITLE).toBe('已达到字符限制');
    expect(CHARACTER_LIMIT_SUBTITLE).toBe('最多只能输入 10000 个字符');
  });

  it('未超限原样返回、不报超限', () => {
    expect(clampToCharacterLimit('abc')).toBe('abc');
    expect(exceedsCharacterLimit('abc')).toBe(false);
    expect(exceedsCharacterLimit('a'.repeat(10000))).toBe(false);
  });

  it('超限截到 10000 且报超限', () => {
    const long = 'a'.repeat(10001);
    expect(clampToCharacterLimit(long).length).toBe(10000);
    expect(exceedsCharacterLimit(long)).toBe(true);
  });

  it('按 UTF-16 码元计长（与 String.length 同口径，官方那句不区分字素）', () => {
    // 一个中文 1 个码元、一个 emoji 2 个码元 —— 与官方"字符数"同源（本地不做字素切分）。
    expect(exceedsCharacterLimit('中'.repeat(10001))).toBe(true);
    expect(exceedsCharacterLimit('😀'.repeat(5000))).toBe(false);
  });

  it('接线：合集文本格的 onChange 确实过判据并给官方两句（不是只定义了常量）', () => {
    const src = readFileSync(
      path.resolve('src/components/collection/PropertyCell.tsx'),
      'utf8',
    );
    expect(src, 'TextCell 没接上限判据').toContain('exceedsCharacterLimit(next)');
    expect(src, '触限没截住').toContain('clampToCharacterLimit(next)');
    expect(src, '没把官方两句挂到可及名上').toContain('CHARACTER_LIMIT_TITLE');
    expect(src, '没把官方副句挂上').toContain('CHARACTER_LIMIT_SUBTITLE');
  });
});
