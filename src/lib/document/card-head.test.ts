import { describe, expect, it } from 'vitest';

import {
  CARD_CRUMB_SEPARATOR,
  UPDATED_PREFIX,
  cardBreadcrumb,
  cardHead,
  cardTitle,
  cardUpdatedLabel,
  isUntitled,
} from './card-head';

/**
 * G250: the grid card head is title / location breadcrumb / 「已更新 14小时前」, and an untitled
 * document's placeholder is italic grey.
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
  it('joins nodes with the middle dot, icon first', () => {
    expect(cardBreadcrumb([{ icon: '📁', title: '日记' }, { title: '十月' }])).toBe(
      `📁 日记 ${CARD_CRUMB_SEPARATOR} 十月`,
    );
  });

  it('is null when there is no ancestry', () => {
    expect(cardBreadcrumb(undefined)).toBeNull();
    expect(cardBreadcrumb([])).toBeNull();
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

describe('the whole head', () => {
  it('assembles the three parts', () => {
    expect(
      cardHead(
        {
          title: '',
          updatedAt: hoursAgo(14),
          breadcrumb: [{ icon: '📁', title: '日记' }],
        },
        NOW,
      ),
    ).toEqual({
      title: '无标题文档',
      placeholder: true,
      breadcrumb: '📁 日记',
      updated: '已更新 14小时前',
    });
  });
});
