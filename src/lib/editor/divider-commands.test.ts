import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { OFFICIAL_DIVIDER_STYLES } from './divider-styles';
import { DEFAULT_DIVIDER_INSERT, DIVIDER_INSERT_COMMANDS } from './divider-commands';

const catalog = readFileSync(new URL('../../../docs/craft-ref/features/feature-catalog.md', import.meta.url), 'utf8');
const slashSource = readFileSync(
  new URL('../../components/editor/slash-menu/slash-commands.ts', import.meta.url),
  'utf8',
);
const insertTabSource = readFileSync(
  new URL('../../components/editor/tabs/InsertTab.tsx', import.meta.url),
  'utf8',
);
const css = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8');

/** 该档 `border-top` 的像素宽度；没有规则或不是实线时返回 null。 */
function dividerWidth(style: string): number | null {
  const rule = css.match(new RegExp(`hr\\[data-style="${style}"\\][^{]*\\{([^}]*)\\}`));
  if (!rule) return null;
  const px = /border-top:\s*(\d+(?:\.\d+)?)px\s+solid/.exec(rule[1]);
  return px ? Number(px[1]) : null;
}

describe('分隔线四档的官方串（G31）', () => {
  it.each(DIVIDER_INSERT_COMMANDS.map((c) => [c.label, c.key] as const))(
    '- %s  \\`%s\\` 逐字在台账里',
    (label, key) => {
      expect(catalog).toContain(`- ${label}  \`${key}\``);
    },
  );

  it('四档都是官方词汇，没有一个是本地旧名', () => {
    for (const c of DIVIDER_INSERT_COMMANDS) {
      expect(OFFICIAL_DIVIDER_STYLES).toContain(c.style);
    }
  });

  it('默认档是常规（`---`＝默认而不是最重，G1229）', () => {
    expect(DEFAULT_DIVIDER_INSERT.style).toBe('regular');
    expect(DEFAULT_DIVIDER_INSERT.label).toBe('分隔线 - 常规');
  });
});

describe('四档命令已接进 slash 与插入面板', () => {
  it.each(DIVIDER_INSERT_COMMANDS.map((c) => [c.label, c.style] as const))(
    'slash 有 %s 且写 %s 档',
    (label, style) => {
      expect(slashSource).toContain(`name: '${label}'`);
      expect(slashSource).toContain(`setDivider('${style}')`);
    },
  );

  it('插入面板的「插入 线」仍指向一个真实存在的 slash 命令名', () => {
    const target = insertTabSource.match(/label: '插入 线', command: '([^']+)'/)?.[1];
    expect(target).toBeDefined();
    expect(slashSource).toContain(`name: '${target}'`);
  });
});

/**
 * 词汇迁移过一次而渲染层没跟上，就是这条的存在理由：四档在 CSS 里各有规则、宽度严格递增，
 * 否则「分隔线 - 粗」与「极细」在屏上是同一条线（实屏截图实测到过一次）。
 */
describe('四档在渲染层真的画出四种宽度（G31 的另一半）', () => {
  it.each(DIVIDER_INSERT_COMMANDS.map((c) => [c.label, c.style] as const))(
    '%s 有实线规则',
    (_label, style) => {
      expect(dividerWidth(style)).not.toBeNull();
    },
  );

  it('宽度按 极细 < 细 < 常规 < 粗 严格递增', () => {
    const widths = DIVIDER_INSERT_COMMANDS.map((c) => dividerWidth(c.style));
    expect(widths).toEqual([1, 2, 3, 6]);
  });

  it('旧名保留且宽度不变（改名不能改旧文档的样子）', () => {
    expect(dividerWidth('thin')).toBe(1);
    expect(dividerWidth('medium')).toBe(3);
    expect(dividerWidth('thick')).toBe(6);
    // dashed 不是实线，宽度提取器读不出 px ⇒ 它必须仍然走虚线那条规则
    expect(dividerWidth('dashed')).toBeNull();
    expect(css).toContain('hr[data-style="dashed"]');
  });
});
