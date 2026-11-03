import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

/** G1596：官方斜线菜单含「提醒我…」；本地入口在「高级块」并交给唯一的提醒选择器。 */
describe('the slash-menu reminder entry (G1596)', () => {
  it('adds the entry under 高级块 and asks the chooser', () => {
    const slash = read('../../components/editor/slash-menu/slash-commands.ts');
    expect(slash).toContain("name: '提醒我…'");
    expect(slash).toContain("category: '高级块'");
    expect(slash).toContain('useRemindRequestStore.getState().ask()');
  });

  it('renders the seven collected presets and disables the two without a local surface', () => {
    const host = read('../../components/editor/RemindMenuHost.tsx');
    expect(host).toContain('REMIND_MENU.map');
    expect(host).toContain('disabled={!enabled}');
    expect(host).toContain('isInstantPreset(preset.id)');
    expect(host).toContain('data-testid="remind-menu"');
  });

  it('is mounted once by the editor', () => {
    expect(read('../../components/editor/Editor.tsx')).toContain('<RemindMenuHost editor={editor} />');
  });
});
