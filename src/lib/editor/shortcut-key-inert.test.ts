import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

/**
 * G1592：`Ctrl-Shift-,` 在官方 web 编辑器里没有反应。键位仍留在表里供面板展示，
 * 但 shell 不再接管它；设置/快捷键面板仍可从帮助菜单与命令面板进入。
 */
describe('the shortcuts-panel key stays inert (G1592)', () => {
  it('is no longer handled by the shell dispatcher', () => {
    const shell = read('../../components/editor/shell-shortcuts.tsx');
    expect(shell).not.toContain("'TOGGLE_KEY_SHORTCUTS'");
  });

  it('is still listed in the binding table', () => {
    const keymap = read('../editor/keymap.ts');
    expect(keymap).toContain("id: 'TOGGLE_KEY_SHORTCUTS'");
    expect(keymap).toContain("win: chord({ ctrlKey: true, shiftKey: true }, ',', 'Comma')");
  });

  it('keeps the panel reachable from the help menu and the palette', () => {
    expect(read('../../components/app/HelpMenu.tsx')).toContain("openSettings('shortcuts')");
    expect(read('../../components/search/CommandPalette.tsx')).toContain("openSettings('shortcuts')");
  });
});
