import { describe, expect, it } from 'vitest';

import {
  UPDATED_PREFIX,
  cardHead,
  cardSubtitle,
  cardTitle,
  cardUpdatedLabel,
  isUntitled,
} from './card-head';

/**
 * G250: the grid card head is the title over one subtitle line — `breadcrumb • 已更新 14小时前` —
 * and an untitled document's placeholder is italic grey.
 */
const NOW = Date.parse('2026-10-15T12:00:00.000Z');
const hoursAgo = (n: number) => new Date(NOW - n * 60 * 60 * 1000).toISOString();

describe('the title line', () => {
  it('shows the stored title when there is one', () => {
    expect(cardTitle('周报')).toEqual({ text: '周报', placeholder: false });
  });

  it('falls to the collected placeholder and flags it', () => {
    expect(cardTitle('')).toEqual({ text: '无标题文档', placeholder: true });
    expect(cardTitle('   ')).toEqual({ text: '无标题文档', placeholder: true });
  });

  it('agrees with isUntitled', () => {
    expect(isUntitled('')).toBe(true);
    expect(isUntitled('  ')).toBe(true);
    expect(isUntitled('a')).toBe(false);
  });
});

describe('the breadcrumb line', () => {
  it('passes a pre-joined label through unchanged', () => {
    // The join and the fallback chain live in `location-path.ts`; this module only decides
    // whether the line shows, so a label is passed through verbatim.
    expect(cardHead({ title: 'a', updatedAt: hoursAgo(1), breadcrumb: '📁 日记 • 十月' }, NOW).breadcrumb)
      .toBe('📁 日记 • 十月');
  });

  it('is null when there is no ancestry', () => {
    expect(cardHead({ title: 'a', updatedAt: hoursAgo(1) }, NOW).breadcrumb).toBeNull();
    expect(cardHead({ title: 'a', updatedAt: hoursAgo(1), breadcrumb: '   ' }, NOW).breadcrumb).toBeNull();
  });
});

describe('the update line', () => {
  it('prefixes the relative time with the collected verb', () => {
    expect(UPDATED_PREFIX).toBe('已更新');
    expect(cardUpdatedLabel(hoursAgo(14), NOW)).toBe('已更新 14小时前');
  });

  it('is empty for an unparsable timestamp rather than printing a bare verb', () => {
    expect(cardUpdatedLabel('不是时间', NOW)).toBe('');
  });
});

describe('the subtitle line', () => {
  it('joins the location and the update time with one bullet', () => {
    expect(cardSubtitle({ breadcrumb: '📁 日记', updated: '已更新 14小时前' })).toBe('📁 日记 • 已更新 14小时前');
  });

  it('shows a lone part without a dangling separator', () => {
    expect(cardSubtitle({ breadcrumb: null, updated: '已更新 5天前' })).toBe('已更新 5天前');
    expect(cardSubtitle({ breadcrumb: '📁 日记', updated: '' })).toBe('📁 日记');
  });

  it('is empty when neither part exists', () => {
    expect(cardSubtitle({ breadcrumb: null, updated: '' })).toBe('');
  });
});

describe('the whole head', () => {
  it('assembles the parts', () => {
    expect(
      cardHead(
        {
          title: '',
          updatedAt: hoursAgo(14),
          breadcrumb: '📁 日记',
        },
        NOW,
      ),
    ).toEqual({
      title: '无标题文档',
      placeholder: true,
      breadcrumb: '📁 日记',
      updated: '已更新 14小时前',
      subtitle: '📁 日记 • 已更新 14小时前',
    });
  });

  it('drops the separator when the card has no location', () => {
    expect(cardHead({ title: 'a', updatedAt: hoursAgo(5) }, NOW).subtitle).toBe('已更新 5小时前');
  });
});
