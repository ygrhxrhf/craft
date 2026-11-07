import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (...parts: string[]) => readFileSync(join(process.cwd(), ...parts), 'utf8');

/**
 * G69 —— 官方**没有保存快捷键**（自动保存）；`⌘K` 按上下文分派：浏览面是「快速开启」，编辑器
 * 内是插入链接。本地这两半必须接在同一条链上：编辑器的 keydown 先吃下 `⌘K` 并
 * `preventDefault`，命令面板看到 `defaultPrevented` 就让路。
 */
describe('⌘S and ⌘K (G69)', () => {
  const editor = read('src', 'components', 'editor', 'Editor.tsx');
  const keymap = read('src', 'components', 'editor', 'extensions', 'craft-keymap.ts');
  const palette = read('src', 'components', 'search', 'CommandPalette.tsx');
  const shell = read('src', 'components', 'editor', 'shell-shortcuts.tsx');

  it('has no self-made save chord left', () => {
    for (const source of [editor, keymap, shell]) {
      expect(source).not.toContain('KeyS');
      expect(source).not.toMatch(/key === 's'/i);
    }
  });

  it('the editor claims ⌘K for the link picker', () => {
    expect(keymap).toContain('requestLink()');
    const branch = keymap.slice(keymap.indexOf('requestLink()') - 400, keymap.indexOf('requestLink()'));
    expect(branch).toContain("event.key === 'k'");
    expect(branch).toContain('event.preventDefault()');
  });

  it('the palette yields a chord the editor already handled', () => {
    const handler = palette.slice(palette.indexOf('G69:'));
    expect(handler).toContain('if (e.defaultPrevented) return;');
    // …and the yield check comes before the palette claims ⌘K itself.
    expect(handler.indexOf('e.defaultPrevented')).toBeLessThan(handler.indexOf("toLowerCase() === 'k'"));
  });
});