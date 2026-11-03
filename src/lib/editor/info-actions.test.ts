import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const source = readFileSync(
  new URL('../../components/editor/tabs/InfoTab.tsx', import.meta.url),
  'utf8',
);

/**
 * G225：信息页「动作」子页签的 12 项，其中 5 项印键位字形。
 */
describe('the info-panel action roster (G225)', () => {
  it('carries all twelve collected actions', () => {
    for (const label of [
      '在页面中查找',
      '快速开启',
      '添加评论',
      '上移',
      '下移',
      '移至顶部',
      '移至底部',
      '组合',
      '取消组合',
      '重命名',
      '创建副本',
      '删除',
    ]) {
      expect(source, label).toContain(label);
    }
  });

  it('wires rename to the document title request', () => {
    expect(source).toContain('useTitleRequestStore.getState().ask()');
    expect(source).toContain('<span>重命名</span>');
  });

  it('prints the five key glyphs from the binding table', () => {
    expect(source).toContain("shortcutGlyph('FIND_IN_PAGE')");
    for (const id of [
      'MOVE_BLOCK_UP',
      'MOVE_BLOCK_DOWN',
      'MOVE_BLOCK_TOP',
      'MOVE_BLOCK_BOTTOM',
    ]) {
      expect(source, id).toContain(`'${id}'`);
    }
    expect(source).toContain('shortcutGlyph(bindingId)');
    expect(source).toContain('displayFor(binding, detectPlatform())');
  });
});
