import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * base-ui 的 `Menu.GroupLabel` 必须在 `<Menu.Group>`／`<Menu.RadioGroup>` 里渲染，否则菜单一开就抛
 * 「MenuGroupContext is missing」，任务页整屏落进错误边界（第 550 批真面核验抓到的）。
 * 类型和源码串断言都挡不住这一点，只能按结构扫：每个 `<DropdownMenuLabel` 之前，
 * `<DropdownMenuGroup` 的开标签数必须多于闭标签数。
 */
function tsxFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) tsxFiles(full, out);
    else if (entry.endsWith('.tsx')) out.push(full);
  }
  return out;
}

function ungroupedLabels(source: string): number {
  const tags = source.match(/<DropdownMenuGroup[\s>]|<\/DropdownMenuGroup>|<DropdownMenuLabel[\s>]/g) ?? [];
  let depth = 0;
  let bad = 0;
  for (const tag of tags) {
    if (tag.startsWith('<DropdownMenuGroup')) depth += 1;
    else if (tag.startsWith('</DropdownMenuGroup')) depth -= 1;
    else if (depth <= 0) bad += 1;
  }
  return bad;
}

describe('DropdownMenuLabel always renders inside a DropdownMenuGroup', () => {
  it('has no ungrouped labels anywhere under src', () => {
    const offenders: string[] = [];
    for (const file of tsxFiles(join(process.cwd(), 'src'))) {
      const source = readFileSync(file, 'utf8');
      if (!source.includes('<DropdownMenuLabel')) continue;
      if (ungroupedLabels(source) > 0) offenders.push(file.replace(process.cwd(), ''));
    }
    expect(offenders).toEqual([]);
  });

  it('catches the shape that crashed the tasks screen', () => {
    expect(ungroupedLabels('<DropdownMenuLabel>x</DropdownMenuLabel>')).toBe(1);
    expect(
      ungroupedLabels(
        '<DropdownMenuGroup><DropdownMenuLabel>x</DropdownMenuLabel></DropdownMenuGroup>',
      ),
    ).toBe(0);
    expect(
      ungroupedLabels(
        '<DropdownMenuLabel>a</DropdownMenuLabel><DropdownMenuGroup><DropdownMenuLabel>b</DropdownMenuLabel></DropdownMenuGroup>',
      ),
    ).toBe(1);
  });
});
