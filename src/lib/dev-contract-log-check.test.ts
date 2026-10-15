import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * `gap.md` G1501 的那条规矩（加列之后先 `contract emit`、重启、再看日志应为 0）现在是**可跑的**
 * 一条：`scripts/check-dev-contract-log.mjs`。这里只钉它的**判定面**——命中就非零退出、
 * 没有就零退出、`--since` 能把窗口切对、日志读不到时不许装扮成绿。
 * ☆ 用临时 JSONL 夹具跑真脚本（不是把逻辑抄进测试），所以它测的是那条命令本身。
 */
const SCRIPT = join(process.cwd(), 'scripts', 'check-dev-contract-log.mjs');

function run(logPath: string, extra: string[] = []): { code: number; out: string } {
  try {
    const out = execFileSync(process.execPath, [SCRIPT, '--log', logPath, ...extra], { encoding: 'utf8' });
    return { code: 0, out };
  } catch (e: any) {
    return { code: e.status ?? -1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

const line = (ts: string, message: string) =>
  JSON.stringify({ timestamp: ts, source: 'Server', level: 'ERROR', message }) + '\n';

function fixture(rows: string[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'craft-dlog-'));
  const p = join(dir, 'next-development.log');
  writeFileSync(p, rows.join(''));
  return p;
}

describe('检查脚本：dev 日志里的 Unknown column（G1501）', () => {
  it('干净日志 ⇒ 退出 0', () => {
    const p = fixture([line('10:00:00.000', 'compiled successfully'), line('10:00:01.000', 'GET /documents 200')]);
    expect(run(p).code).toBe(0);
  });

  it('有命中 ⇒ 退出 1，并把列名印出来', () => {
    const p = fixture([line('10:00:00.000', 'Unknown column "cancelledAt"')]);
    const r = run(p);
    expect(r.code).toBe(1);
    expect(r.out).toContain('cancelledAt');
  });

  it('`--since` 只算之后的条目（把"上一趟重启前的旧账"切掉）', () => {
    const p = fixture([line('09:00:00.000', 'Unknown column "oldCol"'), line('10:30:00.000', 'compiled successfully')]);
    expect(run(p, ['--since', '10:00:00']).code).toBe(0);
    expect(run(p, ['--since', '08:00:00']).code).toBe(1);
  });

  it('日志读不到 ⇒ 退出 2（判据不成立，不许当绿）', () => {
    const r = run(join(tmpdir(), 'definitely-missing-craft-log.jsonl'));
    expect(r.code).toBe(2);
    expect(r.out).toContain('判据不成立');
  });
});
