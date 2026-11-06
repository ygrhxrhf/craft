import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { detectPlatform } from './keymap';
import { SERVER_PLATFORM } from './use-platform';

/**
 * `gap.md` G1486：键位提示（`专注模式 • ⌘ .`）是渲染期读出来的文案，而
 * `detectPlatform()` 在渲染期读 `navigator`。服务端没有 `navigator`，客户端首帧有，
 * 两端一猜不一致，React 就在 hydration 时报错——手机视口下整页红角标。
 * 判据因此不是"提示对不对"，而是"首帧必须与服务端逐字相同"。
 */
describe('首帧的平台判定（G1486）', () => {
  it('SERVER_PLATFORM 就是本环境（＝服务端那一侧）`detectPlatform()` 的答案', () => {
    expect(detectPlatform()).toBe(SERVER_PLATFORM);
  });

  it('真机的判定仍然按 UA 走 mac 分支（否则"挂载后修正"是句空话）', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    const iphone = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', platform: 'iPhone' };
    Object.defineProperty(globalThis, 'navigator', { value: iphone, configurable: true, writable: true });
    try {
      expect(detectPlatform()).toBe('mac');
      expect(detectPlatform()).not.toBe(SERVER_PLATFORM);
    } finally {
      if (original) Object.defineProperty(globalThis, 'navigator', original);
      else delete (globalThis as { navigator?: unknown }).navigator;
    }
  });
});

const source = (rel: string) => readFileSync(join(process.cwd(), 'src', rel), 'utf8');
const aliveLines = (src: string, code: string) =>
  src.split('\n').filter((line) => line.includes(code) && !/^\s*(\/\/|\*|\/\*)/.test(line));

describe('渲染期不再猜平台（三处调用点全部改走钩子）', () => {
  // ☆ 对照实验换来的那条教训：判的必须是"活着的那一行"，注释里的代码不算。
  const hook = source('lib/editor/use-platform.ts');

  it('钩子先答服务端那一侧，挂载后才换成真机的', () => {
    // 用 useSyncExternalStore 表达「服务端快照 = SERVER_PLATFORM、客户端快照 = detectPlatform()」。
    // 判据不变：服务端快照必须逐字是 SERVER_PLATFORM，客户端快照才按真机猜。
    expect(aliveLines(hook, 'function getServerSnapshot()')).toHaveLength(1);
    expect(aliveLines(hook, 'return SERVER_PLATFORM;')).toHaveLength(1);
    expect(aliveLines(hook, 'return detectPlatform();')).toHaveLength(1);
    expect(aliveLines(hook, 'useSyncExternalStore(')).toHaveLength(1);
    // 初值不许直接读真机：那正是本行要拦的事。
    expect(aliveLines(hook, 'useState(() => detectPlatform())')).toHaveLength(0);
    // 也不许再用 effect + setState 在挂载后猜平台。
    expect(aliveLines(hook, 'setPlatform(')).toHaveLength(0);
  });

  // 键位显示层的两个出口都吃钩子的平台值：整串提示用 `displayFor`，
  // 快捷键面板用 `panelRoster(platform)`（键帽在名册装配里按平台逐枚算，面板自身不再调 capParts）。
  for (const [file, helper, count] of [
    ['components/editor/DocumentEditor.tsx', 'displayFor(', 2],
    ['components/settings/ShortcutsPanel.tsx', 'panelRoster(platform)', 1],
  ] as const) {
    const src = source(file);
    it(`${file} 的 ${count} 处键位提示都吃钩子，不吃裸判定`, () => {
      expect(aliveLines(src, 'usePlatform()'), `${file} 没挂上钩子`).toHaveLength(1);
      expect(aliveLines(src, 'detectPlatform()'), `${file} 还在渲染期猜平台`).toHaveLength(0);
      expect(aliveLines(src, helper), `${file} 的 ${helper} 调用数变了`).toHaveLength(count);
    });
  }

  it('事件期的调用仍按真机判定（那里没有首帧可言，钩子反而是错的）', () => {
    // craft-keymap 有两处事件期判定：主键位分派＋G1599 的「选择到顶/底」捕获拦截。
    for (const [file, count] of [
      ['components/editor/extensions/craft-keymap.ts', 2],
      ['components/editor/shell-shortcuts.tsx', 1],
    ] as const) {
      expect(aliveLines(source(file), 'detectPlatform()'), file).toHaveLength(count);
    }
  });
});
