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
 * G1560 取代了 G31 的「四档粗细」模型：官方五档是**图案＋分页**——
 * 极细＝三点省略号、细＝点线、常规＝细实线、粗＝粗实线、pageSeparator＝真分页。
 * 旧测试按宽度递增断言（1/2/3/6）已作废。
 */
describe('五档在渲染层画出各自的形态（G1560）', () => {
  const ruleFor = (style: string) => {
    const rule = css.match(new RegExp(`hr\\[data-style="${style}"\\][^{]*\\{([^}]*)\\}`));
    return rule?.[1] ?? '';
  };

  it('极细是三点省略号，不是实线', () => {
    expect(ruleFor('extraLight')).toContain('radial-gradient');
    expect(dividerWidth('extraLight')).toBeNull();
  });

  it('细是点线', () => {
    expect(ruleFor('light')).toContain('dotted');
    expect(dividerWidth('light')).toBeNull();
  });

  it('常规与粗是实线且粗更宽', () => {
    expect(dividerWidth('regular')).toBe(1);
    expect(dividerWidth('strong')).toBe(3);
  });

  it('pageSeparator 是真分页', () => {
    expect(ruleFor('pageSeparator')).toContain('page-break-after: always');
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
