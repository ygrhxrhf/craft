import { describe, expect, it } from 'vitest';

import {
  COLLAPSE_ROW_TEXT_LEFT_OFFSET,
  INBOX_COLLAPSE_THRESHOLD,
  SECTION_COLLAPSE_THRESHOLD,
  SHOW_LESS_LABEL,
  collapseSection,
  showMoreRowsLabel,
} from './section-collapse';

const rows = (count: number) => Array.from({ length: count }, (_, i) => i);

describe('G391 — sidebar sections collapse at a hard-coded threshold', () => {
  it('keeps the two official thresholds and the row offset', () => {
    // `RBt = 20, nP = 25`（tags-browse.md §10.4），折叠行 `textLeftOffset: 22`
    expect(SECTION_COLLAPSE_THRESHOLD).toBe(20);
    expect(INBOX_COLLAPSE_THRESHOLD).toBe(25);
    expect(COLLAPSE_ROW_TEXT_LEFT_OFFSET).toBe(22);
  });

  it('leaves a section alone at or below the threshold', () => {
    const result = collapseSection(rows(20), 20, false);
    expect(result.visible).toHaveLength(20);
    expect(result.remainingCount).toBe(0);
    expect(result.collapsible).toBe(false);
  });

  it('cuts above the threshold and counts what is hidden', () => {
    const result = collapseSection(rows(26), 20, false);
    expect(result.visible).toHaveLength(20);
    expect(result.remainingCount).toBe(6);
    expect(result.collapsible).toBe(true);
    expect(result.visible[19]).toBe(19);
  });

  it('shows every row once the collapse row is expanded', () => {
    const result = collapseSection(rows(26), 20, true);
    expect(result.visible).toHaveLength(26);
    expect(result.remainingCount).toBe(6);
    expect(result.collapsible).toBe(true);
  });

  it('gives the collapse row the official labels from two different namespaces', () => {
    // 收起取自 tasks.show.less，展开取自 browse.show.x.more —— 官方自己跨了两个命名空间。
    expect(SHOW_LESS_LABEL).toBe('显示较少');
    expect(showMoreRowsLabel(6)).toBe('再显示 6 项');
    expect(showMoreRowsLabel(0)).toBe('再显示 0 项');
  });

  it('applies the 25 threshold to the inbox-shaped list', () => {
    expect(collapseSection(rows(25), INBOX_COLLAPSE_THRESHOLD, false).collapsible).toBe(false);
    expect(collapseSection(rows(26), INBOX_COLLAPSE_THRESHOLD, false).collapsible).toBe(true);
  });
});