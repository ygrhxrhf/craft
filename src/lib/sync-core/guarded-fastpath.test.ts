import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * `gap.md` G1518 的**解锁条件**（第 215 批兑现）：门面在库开好之后走直通，不再为每一次 store
 * 触碰白等一拍微任务。这里钉两件事——直通那一支存在（源码面），且两条支都还能用（行为面）。
 *
 * ☆ 为什么要有源码面这一条：下游全是 async，`await` 多一拍与少一拍在行为上几乎观测不到
 *   （第 215 批实测：把那两处 `setTimeout(r,0)` 摘掉照样红 ⇒ 它们吸收的是**处理函数自己的
 *   async 链**，不是门面这一拍）。所以判据只能落在"那一行长什么样"上。
 */
const SRC = join(process.cwd(), 'src', 'lib', 'sync-core', 'index.ts');

describe('门面直通支（G1518）', () => {
  const src = readFileSync(SRC, 'utf8');

  it('`guarded` 里存在"已开好 ⇒ 直接调 fn"的那一支', () => {
    const body = /function guarded[\s\S]*?\n  \}/.exec(src)?.[0];
    expect(body, '找不到 guarded（判据失效）').toBeTruthy();
    expect(body!, '没了直通支＝每一次 store 触碰又得多等一拍微任务（G1518 的锁又扣上了）').toMatch(
      /initSettled\s*\?\s*fn\(\.\.\.args\)/,
    );
    expect(body!, '退回了 `await ensureInit()` 的老写法').not.toMatch(/await ensureInit\(\)/);
  });

  it('`initSettled` 只在开库**成功**后置真；失败照旧清空缓存让下一次重试（R-14）', () => {
    const body = /function ensureInit[\s\S]*?\n  \}/.exec(src)?.[0];
    expect(body, '找不到 ensureInit（判据失效）').toBeTruthy();
    expect(body!, '成功那一支没置 initSettled＝直通永远走不到').toMatch(/initSettled = true/);
    const fail = /\(err: unknown\) => \{[\s\S]*?\}/.exec(body!)?.[0] ?? '';
    expect(fail, '失败那一支不见了＝"开库失败不缓存"的语义被改').toContain('initPromise = null');
    expect(fail, '失败那一支顺手把 initSettled 置真＝把"没开成"说成"已开好"').not.toContain('initSettled = true');
  });

  it('`initSettled` 初值为 false（全新 manager 第一次触碰仍必须先开库）', () => {
    expect(src, 'initSettled 初值不是 false＝未开库就直通，写入会打在没开的库上').toMatch(
      /let initSettled = false/,
    );
  });
});
