import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * `gap.md` 一致面闸：**批表行也要回填判定**。
 *
 * 第 207 批发现的两枚实例：`G1491`／`G1492` 是第 187 批登记进它那张批表的待办，第 192 批把它们清掉了、
 * 却只在第 192 批的正文里写了"已清"，**两张行仍留着「未动」** ⇒ 台账读起来像"这两条还没做"。
 * 本闸把这条规矩变成可跑的检查：**凡在正文里出现过 `清 G<号>` 的条目，它的行判定里必须出现
 * `已清` 或 `不做`**（`不做`＝"明确记为不做"那一档，同样是终态）。
 *
 * ☆ 判据取**行的第 3 个数据格**（官方／本地对照／判定／分…），不取"倒数第二格"——
 *   本台账的行有 4 格与 5 格两种形状，倒数第二格在 5 格行上会落到"分"上（第 207 批首跑就踩过）。
 */
const LEDGER = join(process.cwd(), 'docs', 'craft-ref', 'features', 'gap.md');

/** 行号 → 该行第 3 个数据格（判定）。同一 G 号只取首次出现（主表优先）。 */
function verdicts(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    const m = /^\|\s*G(\d{3,4})\s*\|(.*)$/.exec(line);
    if (!m) continue;
    const cells = m[2].split('|').map((c) => c.trim());
    if (cells.length < 4) continue;
    if (!out.has(m[1])) out.set(m[1], cells[2]);
  }
  return out;
}

describe('gap.md 一致面闸：正文写过「清 Gx」的行必须回填判定（第 207 批）', () => {
  const text = readFileSync(LEDGER, 'utf8');

  it('扫描面非空（判据没在空转）', () => {
    const ids = new Set([...text.matchAll(/清 G(\d{3,4})/g)].map((m) => m[1]));
    expect(ids.size, '一条「清 Gx」都没扫到＝这条闸在空转').toBeGreaterThanOrEqual(10);
    expect(verdicts(text).size, '一行 G 行都没解析到＝表格形状变了').toBeGreaterThan(500);
  });

  it('每一条被"清"过的 G 号，判定格里都有 `已清` 或 `不做`', () => {
    const rows = verdicts(text);
    const cleared = new Set([...text.matchAll(/清 G(\d{3,4})/g)].map((m) => m[1]));
    const stale: string[] = [];
    for (const id of cleared) {
      const verdict = rows.get(id);
      if (verdict === undefined) {
        stale.push(`G${id}：正文说已清，但找不到它的行`);
        continue;
      }
      if (!/已清|不做/.test(verdict)) {
        stale.push(`G${id}：判定格仍写着「${verdict.slice(0, 40)}…」`);
      }
    }
    expect(stale, `这些行是"批表登记快照未回填"的漏项 ⇒ ${stale.join('；')}`).toEqual([]);
  });

  it('G 号唯一（上面的 `verdicts` 只取每个号的首行 ⇒ 重号会让所有以它为准的判据失准）', () => {
    const counts = new Map<string, number>();
    for (const line of text.split(/\r?\n/)) {
      const m = /^\|\s*G(\d{3,4})\s*\|/.exec(line);
      if (!m) continue;
      counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
    }
    const dups = [...counts].filter(([, n]) => n > 1).map(([id, n]) => `G${id}×${n}`);
    expect(counts.size, '一行 G 行都没解析到＝表格形状变了').toBeGreaterThan(500);
    expect(dups, `重号 ⇒ ${dups.join('、')}`).toEqual([]);
  });
});
