import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

/**
 * G1592：`Ctrl-Shift-,` 在官方 web 编辑器里没有反应。键位仍留在表里供面板展示，
 * 但 shell 不再接管它；设置/快捷键面板仍可从帮助菜单与设置页进入
 * （第 1 批：Ctrl-K 只做「跳转到」，不再承担设置入口）。
 */
describe('the shortcuts-panel key stays inert (G1592)', () => {
  it('is no longer handled by the shell dispatcher', () => {
    const shell = read('../../components/editor/shell-shortcuts.tsx');
    expect(shell).not.toContain("'TOGGLE_KEY_SHORTCUTS'");
    // G1585/G1587: the web build measures these as inert as well.
    expect(shell).not.toContain("'TOGGLE_LEFT_SIDEBAR'");
    expect(shell).not.toContain("'OPEN_DAILY_NOTE'");
    expect(shell).toContain("HANDLED = new Set(['TOGGLE_FOCUS_MODE'])");
  });

  it('is still listed in the binding table', () => {
    const keymap = read('../editor/keymap.ts');
    expect(keymap).toContain("id: 'TOGGLE_KEY_SHORTCUTS'");
    expect(keymap).toContain("win: chord({ ctrlKey: true, shiftKey: true }, ',', 'Comma')");
  });

  it('keeps the panel reachable from the help menu and the settings page', () => {
    expect(read('../../components/app/HelpMenu.tsx')).toContain("openSettings('shortcuts')");
    expect(read('../../components/settings/SettingsPanels.tsx')).toContain('ShortcutsPanel');
    // Ctrl-K 面板只做「跳转到」，不再有打开设置的动作项。
    expect(read('../../components/search/CommandPalette.tsx')).not.toContain("openSettings('shortcuts')");
  });
});
