// src/lib/sync-core/queue-record-level.test.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isRecordLevelSyncError } from './queue';

/**
 * `gap.md` G1631 —— G1630 让队列对**记录级** 4xx 逐笔判死（好笔照落、坏笔 ack 掉并冒 invalid），
 * 对**非**记录级 4xx 退回 network 重试。这条分界线的两侧代价完全相反：
 *  - 把记录级误判成 network ⇒ 那一笔永远重试、队头毒死（G1630 要修的那条）；
 *  - 把 network 误判成记录级 ⇒ 代理/网关的一次 400 就让用户所有未同步改动被逐笔丢弃。
 * 而"哪些错误句算记录级"在客户端是手抄的服务端字面量。服务端 POST 新增一种 400（新的
 * `superRefine`、新的整批校验）而客户端没跟，就静默退回第一种 —— 这条闸现读 `route.ts` 的
 * POST 函数体，把每一条 4xx 错误句与客户端的名单对账。
 */
const ROUTE = join(process.cwd(), 'src', 'app', 'api', 'v1', 'sync', 'route.ts');

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

/** 取 `export async function <name>` 的函数体（靠大括号配对，不靠行号）。 */
function fnBody(src: string, name: string): string {
  const start = new RegExp(`export async function ${name}\\(`).exec(src);
  expect(start, `找不到 ${name}＝判据失效（被判的对象不存在）`).not.toBeNull();
  const open = src.indexOf('{', src.indexOf(')', start!.index));
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  throw new Error(`${name} 的大括号没闭合`);
}

/**
 * 本服务**刻意不算记录级**的 4xx（逐条写理由）。目前为空：POST 里没有任何"整批不可归因、
 * 又不该丢数据"的分支。新增一条时要先答"客户端重试它会不会一直接同一个 4xx"。
 */
const NOT_RECORD_LEVEL: Record<string, string> = {};

describe('G1631：客户端记录级错误名单与服务端 4xx 逐句对账', () => {
  const post = fnBody(read(ROUTE), 'POST');

  // POST 里每一处 `error: '...'` 与它的状态码。写法是 `Response.json({ error: 'x' }, { status: N })`。
  const allSites = [...post.matchAll(/error:\s*'([^']+)'[^)]*\}\s*,\s*\{\s*status:\s*(\d{3})/g)]
    .map((m) => ({ error: m[1]!, status: Number(m[2]) }));
  const sites = allSites.filter((s) => s.status === 400 || s.status === 413);

  it('扫描器真的扫到了 4xx（防"正则写歪＝空夹具假绿"）', () => {
    expect(post, 'POST 函数体没取到＝判据失效').toContain('Response.json');
    // 同一份正则也扫到了 500（`sync failed`）⇒ 它确实在扫"错误句＋状态码"，不是只挑 4xx 拼出来的
    expect(allSites.some((s) => s.status === 500), '500 那句没扫到＝扫描面可疑').toBe(true);
    expect(sites.length, '一处 4xx 都没扫到＝判据失效').toBeGreaterThan(2);
  });

  it('每一条 4xx 错误句要么被客户端认成记录级，要么逐条登记了"为什么不"', () => {
    const unknown: string[] = [];
    for (const site of sites) {
      if (isRecordLevelSyncError(site.error)) continue;
      if (NOT_RECORD_LEVEL[site.error]) continue;
      unknown.push(`${site.status} ${site.error}`);
    }
    expect(
      unknown,
      `这些 4xx 客户端不认识 ⇒ 会退回 network 无限重试（队头毒死）：${unknown.join(' / ')}`,
    ).toEqual([]);
  });

  it('名单里没有过期的豁免（服务端已不再发那条句）', () => {
    const emitted = new Set(sites.map((s) => s.error));
    for (const key of Object.keys(NOT_RECORD_LEVEL)) {
      expect(emitted.has(key), `豁免条目 ${key} 服务端已不再发＝过期`).toBe(true);
    }
  });

  it('GET 的 400（bad limit／bad since）不在 POST 名单里——pull 失败本来就该重试', () => {
    // 反面对照：这条钉的是"逐句对账只覆盖 POST"，不是"客户端认得所有 400"。
    expect(isRecordLevelSyncError('bad limit')).toBe(false);
    expect(isRecordLevelSyncError('bad since')).toBe(false);
  });

  it('记录级判据本身：四种已知句＋unknown table 前缀，其余一律 false', () => {
    for (const ok of ['payload too large', 'bad records', 'user id mismatch', 'unknown table whiteboard']) {
      expect(isRecordLevelSyncError(ok), ok).toBe(true);
    }
    for (const not of ['bad limit', 'bad since', 'sync failed', 'unknown table', 'Bad Request', '']) {
      expect(isRecordLevelSyncError(not), not).toBe(false);
    }
  });
});
