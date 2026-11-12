import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('../../', import.meta.url));

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry) ? [path] : [];
  });
}

/**
 * 菜单项来自 Base UI（`@base-ui/react/menu`），不是 Radix：`Menu.Item` 的动作口只有 `onClick`。
 * `onSelect` 悄悄落在 React 原生的**文本选中**属性上，类型不报错、运行期也不报错，
 * 后果是菜单看着开着、点了什么都不发生。所以它在这里是禁用写法。
 */
describe('Base UI menu items do not carry onSelect', () => {
  it('never binds a dropdown menu item to onSelect', () => {
    const offenders = sources(SRC)
      .filter((path) => /<DropdownMenu\w+[^<]*onSelect=/.test(readFileSync(path, 'utf8')))
      .map((path) => path.slice(SRC.length + 1));
    expect(offenders).toEqual([]);
  });
});
