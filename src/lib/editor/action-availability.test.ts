import { describe, expect, it } from 'vitest';
import {
  ACTION_ITEMS,
  actionEnabled,
  enabledActionCount,
} from './action-availability';

describe('ACTION_ITEMS (G1455: the twelve entries, verbatim order)', () => {
  it('has exactly twelve entries', () => {
    expect(ACTION_ITEMS).toHaveLength(12);
  });

  it('starts with the two selection-free entries', () => {
    expect(ACTION_ITEMS.slice(0, 2).map((item) => item.label)).toEqual(['在页面中查找', '快速开启']);
  });

  it('carries the four move entries in the official order', () => {
    expect(ACTION_ITEMS.slice(3, 7).map((item) => item.label)).toEqual([
      '向上移动',
      '向下移动',
      '移至顶部',
      '移至底部',
    ]);
  });
});

describe('actionEnabled (G1455: disabled without a block selection)', () => {
  it('only the two selection-free entries stay clickable with no selection', () => {
    expect(enabledActionCount(false)).toBe(2);
    expect(actionEnabled('findInPage', false)).toBe(true);
    expect(actionEnabled('quickOpen', false)).toBe(true);
  });

  it('the other ten are disabled with no selection', () => {
    for (const item of ACTION_ITEMS) {
      if (item.id === 'findInPage' || item.id === 'quickOpen') continue;
      expect(actionEnabled(item.id, false), `${item.label} 无选区时应禁用`).toBe(false);
    }
  });

  it('every one of the twelve is enabled once a block is selected', () => {
    expect(enabledActionCount(true)).toBe(12);
  });
});
