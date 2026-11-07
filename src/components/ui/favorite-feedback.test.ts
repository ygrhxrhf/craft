import { describe, expect, it } from 'vitest';

import {
  FAVORITE_FEEDBACK_DURATION_MS,
  FAVORITE_FEEDBACK_TITLES,
  favoriteFeedback,
} from './favorite-feedback';

/**
 * G1446 —— 官方的取词位是三元实参：`title:i(o?"starred":"unstarred")`，
 * 所以成对文案、`info` 档、1500ms 这三件要一起断言。
 */
describe('the favourite toast (G1446)', () => {
  it('says 已收藏 / 未收藏 as one pair', () => {
    expect(FAVORITE_FEEDBACK_TITLES.starred).toBe('已收藏');
    expect(FAVORITE_FEEDBACK_TITLES.unstarred).toBe('未收藏');
    expect(favoriteFeedback(true).title).toBe('已收藏');
    expect(favoriteFeedback(false).title).toBe('未收藏');
  });

  it('uses the info type, not success', () => {
    expect(favoriteFeedback(true).type).toBe('info');
    expect(favoriteFeedback(false).type).toBe('info');
  });

  it('stays on screen 1500 ms', () => {
    expect(FAVORITE_FEEDBACK_DURATION_MS).toBe(1500);
    expect(favoriteFeedback(true).timeout).toBe(1500);
    expect(favoriteFeedback(false).timeout).toBe(1500);
  });

  it('carries no subtitle, because the official subTitle argument is optional', () => {
    expect(favoriteFeedback(true)).not.toHaveProperty('subTitle');
    expect(Object.keys(favoriteFeedback(false)).sort()).toEqual(['timeout', 'title', 'type']);
  });
});