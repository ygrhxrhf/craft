import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { createManager } from './index';
import { createMemoryStore } from './store';

/**
 * `gap.md` G1516 的方案 A（第 216 批）——**一座库两个门面**。
 *
 * 病根：读侧门面 `components/sync/local-records.ts` 与内核**各开一份 store 单例**。
 * 浏览器上看不出（idb 按库名开、两个句柄指同一座库），而桌面 `createSqliteStore()` 写死
 * `:memory:` ⇒ 两个句柄＝两座互不相通的库（离线写入既不上屏也不跨重启）。
 *
 * 这里钉两件事：① 行为面＝`readyStore()` 交出的**就是**内核那座（用注入的 store 做同一性断言，
 * 因为"另开一份"在注入场景下必然不等于它）；② 源码面＝读侧不许再出现开库调用。
 */
describe('读侧门面收进内核（G1516 方案 A）', () => {
  it('`readyStore()` 交出的就是内核那座库（不是另开的一份）', async () => {
    const only = createMemoryStore();
    const manager = createManager({ store: () => only });
    expect(await manager.readyStore()).toBe(only);
    // 同一座库反复要，拿到的是同一个句柄
    expect(await manager.readyStore()).toBe(await manager.readyStore());
  });

  it('库还没开时它先过开库闸门（读侧不必自管 init）', async () => {
    const only = createMemoryStore();
    let inits = 0;
    const spy: typeof only = { ...only, init: async () => { inits += 1; await only.init(); } };
    const manager = createManager({ store: () => spy });
    await manager.readyStore();
    await manager.readyStore();
    expect(inits, '开库应当只发生一次（记忆化）').toBe(1);
  });

  it('读侧源码里不再有开库调用（`createIdbStore`／`createSqliteStore`／`store.init`）', () => {
    const raw = readFileSync(join(process.cwd(), 'src', 'components', 'sync', 'local-records.ts'), 'utf8');
    // ☆ 只判**代码行**：注释里提到这两个函数名是允许的（本文件头部就解释了"为什么不再这么做"）。
    const code = raw
      .split(/\r?\n/)
      .filter((l) => {
        const t = l.trim();
        return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('*/'));
      })
      .join('\n');
    expect(code, '读侧又自己开库了＝桌面那座 `:memory:` 库的洞会回来（G1516）').not.toMatch(/createIdbStore\(|createSqliteStore\(/);
    expect(code, '读侧自己 init＝多一个开库时机，闸门又被绕开一半').not.toMatch(/\.init\(\)/);
    expect(raw, '读侧应当向内核要库').toContain('getSyncManager().readyStore()');
  });
});
