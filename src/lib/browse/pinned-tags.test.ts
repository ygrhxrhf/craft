import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  MANAGE_PINNED,
  PINNED_ERROR,
  PINNED_LIMIT_REACHED,
  PINNED_TAG_LIMIT,
  PIN_KEY_TAGS_HINT,
  PIN_SHOW_CHILDREN_LABEL,
  PIN_TAG_LABEL,
  UNPIN_TAG_LABEL,
  pinDecision,
  pinToggleLabel,
  pinnedManagingHint,
} from './pinned-tags';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

/**
 * G173：固定标签——「固定并显示所有子项」、上限句、管理入口、失败句，文案逐字取自
 * `_harvest/i18n-zh.tsv`（`tags.*`）。
 */
describe('the pinned-tag copy (G173)', () => {
  it('uses the harvested sentences verbatim', () => {
    expect(PIN_TAG_LABEL).toBe('固定标签');
    expect(UNPIN_TAG_LABEL).toBe('取消固定标签');
    expect(PIN_SHOW_CHILDREN_LABEL).toBe('固定并显示所有子项');
    expect(PIN_KEY_TAGS_HINT).toBe('固定关键标签以便快速访问');
    expect(PINNED_LIMIT_REACHED).toBe('你已达到固定标签数的上限');
    expect(PINNED_ERROR).toBe('无法固定标签');
    expect(MANAGE_PINNED).toBe('管理固定标签');
  });

  it('toggles between the two verbatim labels', () => {
    expect(pinToggleLabel(false)).toEqual({ label: '固定标签', key: 'tags.pin.tag' });
    expect(pinToggleLabel(true)).toEqual({ label: '取消固定标签', key: 'tags.unpin.tag' });
  });

  it('switches the manage hint at the limit', () => {
    expect(pinnedManagingHint(0)).toBe(PIN_KEY_TAGS_HINT);
    expect(pinnedManagingHint(PINNED_TAG_LIMIT - 1)).toBe(PIN_KEY_TAGS_HINT);
    expect(pinnedManagingHint(PINNED_TAG_LIMIT)).toBe(PINNED_LIMIT_REACHED);
    expect(pinnedManagingHint(3, 3)).toBe(PINNED_LIMIT_REACHED);
  });
});

describe('the pin decision (G173)', () => {
  const tree: Record<string, string[]> = {
    root: ['child-a', 'child-b'],
    'child-a': ['grandchild'],
    'child-b': [],
    grandchild: [],
  };
  const childrenOf = (id: string) => tree[id] ?? [];

  it('pins just the tag when children are not requested', () => {
    const decision = pinDecision({ pinnedCount: 0, withChildren: false, tagId: 'root', childrenOf });
    expect(decision.allowed).toBe(true);
    expect(decision.ids).toEqual(['root']);
  });

  it('pins every descendant when 「固定并显示所有子项」 is on', () => {
    const decision = pinDecision({ pinnedCount: 0, withChildren: true, tagId: 'root', childrenOf });
    expect(decision.allowed).toBe(true);
    expect(decision.ids.slice().sort()).toEqual(['child-a', 'child-b', 'grandchild', 'root']);
    // 不重复（带环也不会死循环）。
    expect(new Set(decision.ids).size).toBe(decision.ids.length);
  });

  it('refuses at the limit with the official sentence', () => {
    const decision = pinDecision({ pinnedCount: PINNED_TAG_LIMIT, withChildren: true, tagId: 'root', childrenOf });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe(PINNED_LIMIT_REACHED);
    expect(decision.ids).toEqual([]);
  });
});

describe('the pinned-tag wiring (G173)', () => {
  it('gates the pin on the limit, offers children, and reports failure', () => {
    const list = read('src/components/browse/TagTreeList.tsx');
    expect(list).toContain('pinDecision({ pinnedCount, withChildren, tagId: group.id, childrenOf })');
    expect(list).toContain('PIN_SHOW_CHILDREN_LABEL');
    expect(list).toContain('setPinError(PINNED_ERROR)');
    expect(list).toContain('{pinError}');
    expect(list).toContain('pinToggleLabel(Boolean(group.pinned)).label');
  });

  it('has a manage entry with the hint in settings', () => {
    const settings = read('src/components/settings/SettingsPanels.tsx');
    expect(settings).toContain('{MANAGE_PINNED}');
    expect(settings).toContain('pinnedCount >= PINNED_TAG_LIMIT ? PINNED_LIMIT_REACHED : PIN_KEY_TAGS_HINT');
    expect(settings).toContain('getTags()');
  });
});
