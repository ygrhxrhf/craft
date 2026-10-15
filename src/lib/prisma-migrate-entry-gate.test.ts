import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * `gap.md` G1498 —— **跑迁移只有一个入口，那入口自带 `--advance-ref db`**。
 *
 * 病根（第 190 批踩过）：`migrations/app/refs/db.json` 在版本控制里，而 `prisma db migrate`
 * 成功后**不会**自动推进它 ⇒ 下一批 `migration plan` 拿陈旧 ref 当 from-state，会把已经应用的列
 * **再规划一遍**（那次首枚 plan 就混进了上一批的列）。
 *
 * 处置＝把正确咒语封成 npm script（`db:migrate`），让"该带的那一枚旗标"不可能被忘掉；
 * 本闸钉住这个入口不许被改掉。☆ 这不是"锁死一切"——直接敲 `npx prisma db migrate` 仍绕得过，
 * 所以 G1498 的 (a) 案（把 `refs/db.json` 挪出版本控制）**未做**，记在台账里。
 */
const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>;
};

describe('迁移入口闸（G1498）', () => {
  it('`db:migrate` 带着 `--advance-ref db`（否则 ref 不推进，下一批 plan 会重规划已应用的列）', () => {
    const script = pkg.scripts?.['db:migrate'];
    expect(script, '没有 `db:migrate` 入口＝正确咒语无处可循').toBeTruthy();
    expect(script, `\`db:migrate\` 掉了 --advance-ref db：现为「${script}」`).toContain('--advance-ref db');
    expect(script, '入口应当跑 `prisma db migrate`').toContain('prisma db migrate');
  });

  it('`db:migrate:show` 是只读预演，同样带 ref 名（读一眼路线而不落库）', () => {
    const script = pkg.scripts?.['db:migrate:show'];
    expect(script, '没有只读预演入口').toBeTruthy();
    expect(script).toContain('--show');
    expect(script).toContain('--advance-ref db');
  });
});
