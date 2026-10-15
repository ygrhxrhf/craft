import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * `gap.md` G1502 剩余敞口 (b) —— 全仓 e2e 里"按**可及名**寻址侧栏行"的写法要一次扫干净。
 *
 * 背景：侧栏文档/文件夹行的可及名现在是「`<名> N 个文档`」，所以
 * `page.locator('aside').getByRole('button', { name: 名, exact: true })` **必然 0 命中**——
 * 一条正常功能会被这条陈旧选择器读成"坏的"。G1502 当初只扫了 `sync.spec.ts` 一份，这里把
 * 判据立成机器闸：**任何一份 spec 里，`locator('aside')` 那句都不许同时出现 `exact: true`**。
 * ☆ 文本寻址（`getByText(名, { exact: true })`）不受影响：可及名变了，文本节点没变。
 */
const E2E = join(process.cwd(), 'e2e');

function specFiles(): string[] {
  return readdirSync(E2E).filter((f) => f.endsWith('.spec.ts'));
}

describe('e2e 选择器闸：侧栏行不许按可及名 + exact 寻址（G1502）', () => {
  const files = specFiles();

  it('扫描面非空（判据没在空转）', () => {
    expect(files.length, '一份 spec 都没扫到＝这条闸在空转').toBeGreaterThanOrEqual(30);
    const withExact = files.filter((f) => readFileSync(join(E2E, f), 'utf8').includes('exact: true'));
    expect(withExact.length, '含 exact: true 的 spec 太少＝扫描面可疑').toBeGreaterThanOrEqual(20);
  });

  it('没有一处 `aside` 作用域的**按角色/可及名**选择器带 `exact: true`', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const lines = readFileSync(join(E2E, f), 'utf8').split(/\r?\n/);
      lines.forEach((line, i) => {
        // 只禁 role 寻址：`getByText(名, {exact:true})` 走的是文本节点、不受可及名变化影响。
        if (line.includes("locator('aside')") && line.includes('getByRole(') && line.includes('exact: true')) {
          offenders.push(`${f}:${i + 1}`);
        }
      });
    }
    expect(offenders, `侧栏行按可及名+exact 寻址必然 0 命中（可及名带"N 个文档"）⇒ ${offenders.join('、')}`).toEqual([]);
  });

  it('sync.spec 的侧栏行助手里没有 exact: true（单源就落在这里）', () => {
    const s = readFileSync(join(E2E, 'sync.spec.ts'), 'utf8');
    const helper = /function folderRow[\s\S]*?\n\}/.exec(s)?.[0] ?? '';
    expect(helper, '找不到 folderRow 助手＝判据失效').toContain("locator('aside')");
    expect(helper, 'folderRow 又带上了 exact: true＝它是个"必然 0 命中"的助手').not.toContain('exact: true');
  });
});
