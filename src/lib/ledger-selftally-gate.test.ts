import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * `gap.md` 第 9 行「现共 N 条、最大 Gxxxx」的**自述数闸**（第 209 批）。
 *
 * 这行被当作"规模"到处引用，而本台账历史上**三次**漏回填（第 179／181／184 批各有一记"本行自述数
 * 漏回填"）——每次都是人肉 grep 才发现。⇒ 把它变成可跑的：**自述的两个数必须等于现跑的两个数**。
 *
 * ☆ 口径与既有自述逐字同源：条数＝`^\| G<数字> \|` 的行数；最大号＝这些行里最大的数字。
 */
const LEDGER = join(process.cwd(), 'docs', 'craft-ref', 'features', 'gap.md');

function actual(text: string): { count: number; max: number } {
  let count = 0;
  let max = 0;
  for (const line of text.split(/\r?\n/)) {
    // ☆ 必须是 `[0-9]+` 而不是 `\d{3,4}`：本台账前 100 批的号是 **G1…G99 两位**，
    //   第 209 批首跑就是被这个下界坑了（自述 1516 vs 我数出 1425＝漏掉 91 行）。
    const m = /^\|\s*G(\d+)\s*\|/.exec(line);
    if (!m) continue;
    count += 1;
    const n = Number(m[1]);
    if (n > max) max = n;
  }
  return { count, max };
}

describe('gap.md 第 9 行自述数闸', () => {
  const text = readFileSync(LEDGER, 'utf8');

  it('第 9 行的「现共 N 条、最大 Gxxxx」与现跑一致', () => {
    const line = text.split(/\r?\n/)[8] ?? '';
    const claim = /现共 \*\*(\d+) 条、最大 (G\d+)\*\*/.exec(line);
    expect(claim, '第 9 行找不到「现共 N 条、最大 Gxxxx」＝判据失效（那行的写法变了）').toBeTruthy();
    const { count, max } = actual(text);
    expect(count, '一行 G 行都没数到＝判据在空转').toBeGreaterThan(1400);
    expect(claim![1], `自述条数 ${claim![1]} ≠ 现跑 ${count}（漏回填）`).toBe(String(count));
    expect(claim![2], `自述最大号 ${claim![2]} ≠ 现跑 G${max}（漏回填）`).toBe(`G${max}`);
  });
});
