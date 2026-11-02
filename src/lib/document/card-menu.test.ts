import { describe, expect, it } from 'vitest';
import {
  DOCUMENT_CARD_MENU,
  DOCUMENT_CARD_MENU_SIZE,
  documentCardMenuSlots,
  favoriteLabel,
} from './card-menu';

describe('DOCUMENT_CARD_MENU (G384/G1439: the seven card entries)', () => {
  it('lists the six entries with one separator slot = seven, as the official counts it', () => {
    expect(DOCUMENT_CARD_MENU).toHaveLength(6);
    expect(documentCardMenuSlots()).toHaveLength(DOCUMENT_CARD_MENU_SIZE);
  });

  it('carries the labels verbatim and in order', () => {
    expect(DOCUMENT_CARD_MENU.map((item) => item.label)).toEqual([
      '在新标签页中打开',
      '复制链接',
      '收藏',
      '创建副本',
      '移至',
      '删除',
    ]);
  });

  it('puts a separator right before 删除, and marks it danger', () => {
    const del = DOCUMENT_CARD_MENU.find((item) => item.id === 'delete');
    expect(del?.separatedBefore).toBe(true);
    expect(del?.danger).toBe(true);
  });

  it('no other entry carries a separator', () => {
    expect(DOCUMENT_CARD_MENU.filter((item) => item.separatedBefore).map((i) => i.id)).toEqual(['delete']);
  });

  it('is a card-only roster — it does not reuse the block or document menus', () => {
    const ids = DOCUMENT_CARD_MENU.map((item) => item.id);
    // 块菜单那套的项（转换为卡片 / 添加表情 / 提醒我）不该出现在卡片菜单里。
    expect(ids).not.toContain('convert-card');
    expect(ids).not.toContain('add-emoji');
  });
});

describe('favoriteLabel', () => {
  it('flips with the current state', () => {
    expect(favoriteLabel(false)).toBe('收藏');
    expect(favoriteLabel(true)).toBe('取消收藏');
  });
});
