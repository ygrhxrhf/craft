import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * `gap.md` 表形闸（第 208 批）—— 落成**受控**的一份。
 *
 * 为什么需要它：本仓那张表形检查一直靠 `docs/craft-ref/features/_harvest/check-tables.mjs`，而
 * ① `_harvest/` 被 `.gitignore:71` 整目录排除（承 G1493）＝那枚脚本**不在版本控制里**；
 * ② 它取 `process.argv.slice(2)` 当文件清单 ⇒ **不给参数就扫 0 张表、静默打印
 *    `ALL TABLES CONSISTENT`**（第 208 批发现：一整轮会话里多次据此声称"表形逐字一致"，其实全是空转）。
 * ⇒ 把同一判据搬进 `src/`，并显式断言**扫到的表数**，让"空转"这件事本身变红。
 *
 * 本批顺带修掉的两处真错（都是这道闸照出来的）：`G52` 行少一格（第 206 批我改那行时删掉的）、
 * `G154` 行里 `total===0 || marked===0` 的**裸竖线**（历批存量，单元格里的 `||` 被当成两个分隔符）。
 */
const LEDGER = join(process.cwd(), 'docs', 'craft-ref', 'features', 'gap.md');

/** 与 `check-tables.mjs` 同口径：`\|` 先折叠成一个占位符再数竖线。 */
function pipeCount(line: string): number {
  return line.replace(/\\\|/g, '@').split('|').length;
}

interface Table {
  startLine: number;
  width: number;
  offBy: { line: number; width: number }[];
}

function tablesOf(text: string): Table[] {
  const lines = text.split(/\r?\n/);
  const out: Table[] = [];
  let i = 0;
  while (i < lines.length) {
    if (!lines[i].startsWith('|')) {
      i += 1;
      continue;
    }
    const rows: { line: number; width: number }[] = [];
    let j = i;
    while (j < lines.length && lines[j].startsWith('|')) {
      rows.push({ line: j + 1, width: pipeCount(lines[j]) });
      j += 1;
    }
    const width = rows[0].width;
    out.push({ startLine: i + 1, width, offBy: rows.filter((r) => r.width !== width) });
    i = j;
  }
  return out;
}

describe('gap.md 表形闸：每张表的每一行列数都与表头一致（第 208 批）', () => {
  const text = readFileSync(LEDGER, 'utf8');
  const tables = tablesOf(text);

  it('扫到的表数非空（判据不空转——`check-tables.mjs` 正是在这一点上栽的）', () => {
    expect(tables.length, '一张表都没扫到＝这条闸在空转').toBeGreaterThanOrEqual(250);
    const withRows = tables.filter((t) => t.width > 0).length;
    expect(withRows).toBe(tables.length);
  });

  it('没有一处行列数与表头不符', () => {
    const off = tables.flatMap((t) =>
      t.offBy.map((r) => `L${r.line}：${r.width} 栏（表头在 L${t.startLine}，${t.width} 栏）`),
    );
    expect(off, `表形错位（多/少一个竖线都会让它读起来串列）⇒ ${off.join('；')}`).toEqual([]);
  });
});

/**
 * ☆ 第 209 批把同一枚闸**摊到全部成文面**：`gap.md` 只是 25 份 `features/*.md` 里的一份，
 *   单看它＝只看了 310／约 700 张表。摊开后扫描面立刻翻倍（现跑 692 张），
 *   而"扫描面够不够"正是本会话反复栽的那一类（第 208 批 check-tables 空转、第 209 批 `\d{3,4}` 漏 91 行）。
 */
describe('全部 features/*.md 的表形闸（第 209 批摊开）', () => {
  const dir = join(process.cwd(), 'docs', 'craft-ref', 'features');
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));

  it('扫描面非空且够广', () => {
    expect(files.length, '一份成文面都没扫到＝这条闸在空转').toBeGreaterThanOrEqual(20);
    const total = files.reduce((n, f) => n + tablesOf(readFileSync(join(dir, f), 'utf8')).length, 0);
    expect(total, '总表数太少＝扫描面可疑').toBeGreaterThanOrEqual(600);
  });

  it('没有一处行列数与表头不符（全部成文面）', () => {
    const off: string[] = [];
    for (const f of files) {
      for (const t of tablesOf(readFileSync(join(dir, f), 'utf8'))) {
        for (const r of t.offBy) off.push(`${f} L${r.line}：${r.width} 栏（表头在 L${t.startLine}，${t.width} 栏）`);
      }
    }
    expect(off, `表形错位 ⇒ ${off.slice(0, 8).join('；')}`).toEqual([]);
  });
});
