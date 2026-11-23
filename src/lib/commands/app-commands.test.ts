import { describe, expect, it, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { APP_COMMANDS } from './app-commands';
import { OFFICIAL_COMMANDS } from './official-catalog';
import { commandEnabled, mergePaletteCommands } from './registry';
import { useActiveEditorStore } from '@/lib/store/use-active-editor-store';

const officialIds = new Set(OFFICIAL_COMMANDS.map((command) => command.id));

/**
 * 这一层是「官方 189 条里已经接上的那几条」。判据不是"命令存在"，而是三件一起成立：
 * 认领的 id 在官方名册里（否则面板吞不掉灰行、还多出一条永远点不动的假命令）、每个 id 只被
 * 一条认领（两条认领会各显示一次）、每条都有真正的 handler。
 */
describe('the wired official commands (G33 / G16)', () => {
  it('only claims ids the official catalog knows', () => {
    for (const command of APP_COMMANDS) {
      expect(officialIds.has(command.id), `${command.id} 不在官方名册里`).toBe(true);
      for (const alias of command.aliases ?? []) {
        expect(officialIds.has(alias), `${command.id} 的别名 ${alias} 不在官方名册里`).toBe(true);
      }
    }
  });

  it('claims each official id exactly once', () => {
    const claimed = APP_COMMANDS.flatMap((command) => [command.id, ...(command.aliases ?? [])]);
    expect(claimed.length).toBe(new Set(claimed).size);
  });

  it('gives every entry a handler, a Chinese title and keywords', () => {
    for (const command of APP_COMMANDS) {
      expect(typeof command.run, `${command.id} 没有 handler`).toBe('function');
      expect(command.title.trim().length).toBeGreaterThan(0);
      expect(/[\u4e00-\u9fff]/.test(command.title), `${command.title} 不是中文文案`).toBe(true);
      expect(command.keywords.length).toBeGreaterThan(0);
    }
  });

  it('swallows the alias rows in the merged palette', () => {
    const merged = mergePaletteCommands(APP_COMMANDS, OFFICIAL_COMMANDS);
    const greyed = new Set(merged.filter((command) => !command.run).map((command) => command.id));
    for (const command of APP_COMMANDS) {
      expect(greyed.has(command.id), `${command.id} 仍以灰行出现`).toBe(false);
      for (const alias of command.aliases ?? []) {
        expect(greyed.has(alias), `别名 ${alias} 仍以灰行出现`).toBe(false);
      }
    }
    // 仍有未接的官方条目，占位层没有因为接入而消失。
    expect(greyed.size).toBeGreaterThan(0);
  });
});

describe('context-bound commands', () => {
  beforeEach(() => {
    useActiveEditorStore.setState({ editor: null });
  });

  it('greys out 展开全部 without an open document', () => {
    const command = APP_COMMANDS.find((entry) => entry.id === 'commands.toggle.all.toggles');
    expect(command).toBeDefined();
    expect(commandEnabled(command!)).toBe(false);
  });

  it('keeps the shell-level commands usable from any screen', () => {
    for (const id of ['commands.toggle.focus.mode', 'commands.toggle.left.sidebar', 'commands.open.shortcuts']) {
      const command = APP_COMMANDS.find((entry) => entry.id === id);
      expect(commandEnabled(command!), id).toBe(true);
    }
  });
});

/**
 * 接线闸：命令写好了、面板没接＝用户在面板里搜不到，而单测仍全绿。这条读面板源码，
 * 三件事同时成立才算接上：合并（而不是直接拼官方名册）、可用性判定（渲染与执行两处）、
 * 以及 `APP_COMMANDS` 真的进了已接入清单。
 */
describe('the palette actually offers them', () => {
  const palette = readFileSync(
    join(process.cwd(), 'src', 'components', 'search', 'CommandPalette.tsx'),
    'utf8',
  );

  it('merges instead of concatenating the official roster', () => {
    expect(palette).toContain('mergePaletteCommands(implementedCommands, OFFICIAL_COMMANDS)');
    expect(palette).not.toContain('...OFFICIAL_COMMANDS.map');
  });

  it('carries the wired list and gates both the render and the run', () => {
    expect(palette).toContain('...APP_COMMANDS');
    expect(palette).toContain('disabled={!commandEnabled(command)}');
    expect(palette).toContain('if (!commandEnabled(command)) return;');
  });
});
