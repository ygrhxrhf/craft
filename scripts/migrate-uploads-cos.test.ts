import { describe, it, expect, vi } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  listMigratable,
  isLocalCopyExpired,
  LOCAL_KEEP_DAYS,
  summarize,
  countsMatch,
  migrate,
  type PutFn,
} from './migrate-uploads-cos';

// 泛型必须显式给 PutFn：`vi.fn(async () => undefined)` 推断出的参数表是 []，
// mock.calls 的元组随之退化成 never[] ⇒ 读 c[0]/c[2] 直接 TS2493（与 T7 计划缺陷 8 同源）。
const okPut = () => vi.fn<PutFn>(async () => undefined);

describe('migrate-uploads-cos 纯函数', () => {
  it('过滤掉不满足 NAME_RE 的文件名', () => {
    expect(listMigratable(['a.png', 'b b.txt', 'c.pdf', '../evil'])).toEqual(['a.png', 'c.pdf']);
  });

  it('本地副本满 7 天才算可删', () => {
    const now = Date.parse('2026-09-30T00:00:00.000Z');
    expect(LOCAL_KEEP_DAYS).toBe(7);
    expect(isLocalCopyExpired(now - 6 * 864e5, now)).toBe(false);
    expect(isLocalCopyExpired(now - 8 * 864e5, now)).toBe(true);
  });

  it('恰好满 7 天算已过期（边界含等号）', () => {
    const now = Date.parse('2026-09-30T00:00:00.000Z');
    expect(isLocalCopyExpired(now - LOCAL_KEEP_DAYS * 864e5, now)).toBe(true);
  });

  it('summarize 与 countsMatch 一起构成计数核对', () => {
    const r = { put: 3, skipped: 1, failed: 0 };
    expect(countsMatch(r)).toBe(true);
    expect(summarize(r.put, r.skipped, r.failed)).toContain('3');
  });

  it('countsMatch 在有失败项时为 false', () => {
    expect(countsMatch({ put: 1, skipped: 0, failed: 1 })).toBe(false);
  });

  it('summarize 带上 7 天缓冲字样', () => {
    expect(summarize(0, 0, 0)).toContain('7');
  });
});

describe('migrate', () => {
  it('dryRun 只数不搬', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'crafty-mig-'));
    await writeFile(path.join(dir, 'a.png'), 'x');
    const put = okPut();
    const r = await migrate({ dir, dryRun: true, put });
    expect(r).toEqual({ put: 1, skipped: 0, failed: 0 });
    expect(put).not.toHaveBeenCalled();
    await rm(dir, { recursive: true, force: true });
  });

  it('目录不存在时返回全零而不是抛错', async () => {
    expect(await migrate({ dir: path.join(tmpdir(), 'nope-not-here'), dryRun: true, put: okPut() }))
      .toEqual({ put: 0, skipped: 0, failed: 0 });
  });

  it('真跑时逐个 putUpload，并按 mimeForName 传服务端判定的类型', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'crafty-mig-'));
    await writeFile(path.join(dir, 'a.png'), 'png-bytes');
    await writeFile(path.join(dir, 'b.txt'), 'txt-bytes');
    const put = okPut();
    const r = await migrate({ dir, dryRun: false, put });
    expect(r).toEqual({ put: 2, skipped: 0, failed: 0 });
    expect(put.mock.calls.map(c => c[0])).toEqual(['a.png', 'b.txt']);
    // 类型由服务端按扩展名判定，不采信磁盘上的任何元数据。
    // ⚠ 期望值必须逐字取自冻结的 EXT_MIME 表：'.txt' 那档写的是 'text/plain; charset=utf-8'
    //   （storage-local.ts:71），不是裸 'text/plain'。写断言时先 grep 表，别凭印象写。
    expect(put.mock.calls.map(c => c[2])).toEqual(['image/png', 'text/plain; charset=utf-8']);
    // 本地副本一律保留（spec 7.4：7 天缓冲期内不删）。
    expect(put.mock.calls[0]![1]).toBeInstanceOf(Buffer);
    await rm(dir, { recursive: true, force: true });
  });

  it('非法文件名计入 skipped 且不上传', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'crafty-mig-'));
    await writeFile(path.join(dir, 'a.png'), 'x');
    await writeFile(path.join(dir, 'b b.txt'), 'x');
    const put = okPut();
    const r = await migrate({ dir, dryRun: false, put });
    expect(r).toEqual({ put: 1, skipped: 1, failed: 0 });
    expect(put).toHaveBeenCalledTimes(1);
    await rm(dir, { recursive: true, force: true });
  });

  it('单个文件失败计入 failed 且不中断后续（计数可核对）', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'crafty-mig-'));
    await writeFile(path.join(dir, 'a.png'), 'x');
    await writeFile(path.join(dir, 'b.png'), 'x');
    await writeFile(path.join(dir, 'c.png'), 'x');
    const put = vi.fn(async (key: string) => {
      if (key === 'b.png') throw new Error('COS 拒绝');
    });
    const r = await migrate({ dir, dryRun: false, put });
    expect(r).toEqual({ put: 2, skipped: 0, failed: 1 });
    // b 失败后 c 仍被尝试，否则一次网络抖动会毁掉整轮迁移。
    expect(put.mock.calls.map(c => c[0])).toEqual(['a.png', 'b.png', 'c.png']);
    await rm(dir, { recursive: true, force: true });
  });

  it('子目录不参与迁移（只读一层，不递归）', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'crafty-mig-'));
    await writeFile(path.join(dir, 'a.png'), 'x');
    await mkdir(path.join(dir, 'sub'));
    await writeFile(path.join(dir, 'sub', 'nested.png'), 'x');
    const put = okPut();
    const r = await migrate({ dir, dryRun: false, put });
    expect(r).toEqual({ put: 1, skipped: 1, failed: 0 });
    expect(put.mock.calls[0]![0]).toBe('a.png');
    await rm(dir, { recursive: true, force: true });
  });
});
