import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * `gap.md` G1515 —— **临时改动必须先自证锚点命中，再落盘**。
 * 这里钉 `scripts/selfproving-edit.mjs` 的三条硬性质：命中才改、没命中和多重命中都**不落盘**、能还原。
 * ☆ 关键的那一条是"没命中就一个字都不改"——第 193 批的假绿正是"锚点没命中却以为改过了"。
 */
const SCRIPT = join(process.cwd(), 'scripts', 'selfproving-edit.mjs');

function run(args: string[]): { code: number; out: string } {
  try {
    return { code: 0, out: execFileSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' }) };
  } catch (e: any) {
    return { code: e.status ?? -1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

function fixture(targetBody: string, findBody: string, replaceBody = 'REPLACED\n') {
  const dir = mkdtempSync(join(tmpdir(), 'craft-spe-'));
  const target = join(dir, 'target.txt');
  const find = join(dir, 'find.txt');
  const repl = join(dir, 'repl.txt');
  const backup = join(dir, 'backup.txt');
  writeFileSync(target, targetBody);
  writeFileSync(find, findBody);
  writeFileSync(repl, replaceBody);
  return { dir, target, find, repl, backup };
}

describe('自证型临时改动（G1515）', () => {
  it('锚点恰好命中一次 ⇒ 落盘、留备份、给出还原命令', () => {
    const f = fixture('alpha\nANCHOR\nomega\n', 'ANCHOR\n');
    const r = run(['--file', f.target, '--find-file', f.find, '--replace-file', f.repl, '--backup', f.backup]);
    expect(r.code).toBe(0);
    expect(readFileSync(f.target, 'utf8')).toBe('alpha\nREPLACED\nomega\n');
    expect(readFileSync(f.backup, 'utf8')).toBe('alpha\nANCHOR\nomega\n');
    expect(r.out).toContain('--revert');
  });

  it('锚点没命中 ⇒ **一个字都不改**（这正是要有自证的原因），退出 3', () => {
    const f = fixture('alpha\nANCHOR\n', 'ANCHOR\n\n'); // 锚串多了个换行＝命中不了
    const before = readFileSync(f.target, 'utf8');
    const r = run(['--file', f.target, '--find-file', f.find, '--replace-file', f.repl, '--backup', f.backup]);
    expect(r.code).toBe(3);
    expect(r.out).toContain('锚点没命中');
    expect(readFileSync(f.target, 'utf8')).toBe(before);
  });

  it('锚点命中多于一次 ⇒ 也不落盘（改错地方比不改更糟），退出 3', () => {
    const f = fixture('A\nA\n', 'A\n');
    const before = readFileSync(f.target, 'utf8');
    const r = run(['--file', f.target, '--find-file', f.find, '--replace-file', f.repl, '--backup', f.backup]);
    expect(r.code).toBe(3);
    expect(r.out).toContain('多于一次');
    expect(readFileSync(f.target, 'utf8')).toBe(before);
  });

  it('CRLF 的文件配 LF 的锚串 ⇒ 判为没命中（第 193 批那枚假绿的形状）', () => {
    const f = fixture('alpha\r\nANCHOR\r\n', 'ANCHOR\n');
    const r = run(['--file', f.target, '--find-file', f.find, '--replace-file', f.repl, '--backup', f.backup]);
    expect(r.code).toBe(3);
    expect(r.out).toContain('行尾');
  });

  it('`--revert` 把备份照原样放回去', () => {
    const f = fixture('alpha\nANCHOR\n', 'ANCHOR\n');
    run(['--file', f.target, '--find-file', f.find, '--replace-file', f.repl, '--backup', f.backup]);
    expect(readFileSync(f.target, 'utf8')).toContain('REPLACED');
    const r = run(['--file', f.target, '--revert', f.backup]);
    expect(r.code).toBe(0);
    expect(readFileSync(f.target, 'utf8')).toBe('alpha\nANCHOR\n');
  });
});
