import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * `gap.md` G1487 的第①半 —— **P0 行的判据必须现读 `文件:行号`，不许承上一批读数**。
 *
 * 病根（第 187 批现形）：§〇·一 那张 P0 台账里，三行是"写着未动其实早已实现"或"早已实现只断了线"
 * （G03 界面半、G04 整条、G02 的核）—— 都是照抄上一批的读数、没人回读代码造成的。
 * 本闸把"每行必须有现读的 `文件:行号`"变成可跑的：只扫 §〇·一 那张表（按表头定位，不误伤别的表）。
 *
 * ☆ 第 213 批首跑即照出一处：G07 的证据格只点了 `e2e/drag-handle-menu.spec.ts` 这个**文件名**、
 *   一个行号都没有 ⇒ 已按现读补上（`:60/:90/:104/:124/:146` 与实现侧 `DragHandle.tsx:417/:428`、
 *   `block-actions.ts:71-72/:94`）。
 */
const LEDGER = join(process.cwd(), 'docs', 'craft-ref', 'features', 'gap.md');
const FILE_LINE = /[\w@./-]+\.(?:tsx?|mjs|js|json|prisma|md):\d+/;

function p0Rows(text: string): { name: string; evidence: string }[] {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => /^\|\s*状态\s*\|\s*条目（/.test(l));
  if (start < 0) return [];
  const rows: { name: string; evidence: string }[] = [];
  for (let i = start + 2; i < lines.length; i += 1) {
    const l = lines[i];
    if (!l.startsWith('|')) break;
    const cells = l.replace(/\\\|/g, '@').split('|').map((c) => c.trim());
    if (cells.length < 5) continue;
    if (!/\bG\d+\b/.test(cells[2])) continue;
    rows.push({ name: cells[2], evidence: cells[3] });
  }
  return rows;
}

describe('P0 台账行的证据必须是现读的 文件:行号（G1487 第①半）', () => {
  const rows = p0Rows(readFileSync(LEDGER, 'utf8'));

  it('扫到 P0 八条（判据不空转）', () => {
    expect(rows.length, '一行 P0 台账都没扫到＝表头定位失效').toBeGreaterThanOrEqual(8);
  });

  it('每一行的证据格都带至少一处 `文件:行号`', () => {
    const missing = rows.filter((r) => !FILE_LINE.test(r.evidence)).map((r) => r.name.slice(0, 24));
    expect(missing, `这些 P0 行的证据没有现读的行号（只点文件名不算）⇒ ${missing.join('、')}`).toEqual([]);
  });
});
