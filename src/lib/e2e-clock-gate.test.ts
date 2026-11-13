import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * `gap.md` G1504③ —— **假时钟下删除同步行**的那一族，全仓有多少份 spec？
 *
 * 病根：`page.clock.install` 把 `delete` 的 `syncTs` 打到残留行那枚较新的真实 `updatedAt` 之前，
 * 服务端 LWW 原样退回、界面毫无提示 ⇒ 清扫段删不掉残留，下一轮必然红。
 * 处置（第 190 批，`tasks-upcoming-sections.spec.ts`）＝ 清扫与收尾一律先
 * 回到真实时钟。第 535 批换了承载方式：不再掰本页时钟（实测 `setSystemTime` 之后该页客户端
 * fetch 与定时器一起失准，`/tasks` 停在「加载中…」），改成在同一 context 里**开一张新页**——
 * `page.clock` 是按页装的，新页天然是真实钟。
 *
 * 本闸把"全仓清点"冻在这里（第 205 批逐份扫过）：**只有三份 spec 碰 `page.clock`**，
 * 其中只有 `tasks-upcoming-sections` 用 `install`（即真的伪造了计时器并会在假时间下写库）。
 * 将来谁再加一份 fake-clock spec，这道闸会红——逼他把台账与这里的清单一起改，而不是静默扩张。
 */
const E2E = join(process.cwd(), 'e2e');

/** 逐份扫过得出的清单（2026-10-15）。 */
const CLOCK_SPECS = [
  'calendar-timeline.spec.ts', // setFixedTime：只钉"今天"以便日记回到同一篇；写入是**新建**（无存量行 ⇒ LWW 不会拒）
  'tasks-upcoming-sections.spec.ts', // install：真的伪造计时器 ⇒ 必须回到真实时钟再清扫
  'visual.spec.ts', // setFixedTime：只影响截图那一帧
];
/** 其中真正 `install`（伪造计时器）的那些：必须带回真实时钟的那一句。 */
const INSTALL_SPECS = ['tasks-upcoming-sections.spec.ts'];

function specFiles(): string[] {
  return readdirSync(E2E).filter((f) => f.endsWith('.spec.ts'));
}
const read = (f: string) => readFileSync(join(E2E, f), 'utf8');

describe('e2e 假时钟闸：伪造计时器的 spec 必须能回到真实时钟（G1504③）', () => {
  const files = specFiles();

  it('扫描面非空（判据没在空转）', () => {
    expect(files.length, '一份 spec 都没扫到＝这条闸在空转').toBeGreaterThanOrEqual(40);
  });

  it('碰 `page.clock` 的 spec 就是清单里那三份（新增必须先过这里）', () => {
    const actual = files.filter((f) => read(f).includes('page.clock'));
    expect(actual.sort(), ' 假时钟 spec 清单变了＝请先逐份判断"它会不会在假时间下删同步行"，再改这里与台账').toEqual([...CLOCK_SPECS].sort());
  });

  it('每个 `install` 过的 spec 都把清扫带回真实时钟（否则会被 LWW 静默退回）', () => {
    const installers = files.filter((f) => read(f).includes('page.clock.install('));
    expect(installers.sort(), 'install 清单与上面那份不一致＝判据失效').toEqual([...INSTALL_SPECS].sort());
    // 两条被批准的承载方式：掰回本页时钟，或另开一张（按页装的假钟带不过去）页跑清扫。
    const REAL_CLOCK_ESCAPES = ['page.clock.setSystemTime(Date.now())', 'context().newPage()'];
    for (const f of installers) {
      const source = read(f);
      expect(
        REAL_CLOCK_ESCAPES.some((escape) => source.includes(escape)),
        `${f} 伪造了计时器却没把清扫带回真实时钟（setSystemTime(Date.now()) 或新开一页）⇒ 清扫段可能删不掉残留`,
      ).toBe(true);
    }
  });
});
