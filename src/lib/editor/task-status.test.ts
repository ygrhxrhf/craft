import { describe, expect, it } from 'vitest';

import {
  applyCancelled,
  applyChecked,
  applyToggled,
  cancelledOnText,
  isPending,
  taskLineStatus,
  CANCELLED_LABEL,
  CANCELLED_ON_TEXT,
  type TaskAttrs,
} from './task-status';

/**
 * `gap.md` G52：官方任务除"勾上"之外还有**第三态** `cancelled`，而且线值映射是一根轴、
 * 不是两枚布尔（`docs/craft-ref/features/tasks.md:11` 逐字＝`Unchecked → "todo"`、
 * `Checked → "completed"`、`Canceled → "cancelled"`）。这里钉的就是这根轴的语义。
 */

const NOW = new Date('2026-10-14T08:00:00.000Z');

const attrs = (over: Partial<TaskAttrs> = {}): TaskAttrs => ({
  checked: false,
  cancelled: false,
  cancelledAt: null,
  ...over,
});

describe('官方线值映射（tasks.md:11）', () => {
  it('三档各归位，且已取消优先于勾上', () => {
    expect(taskLineStatus(attrs())).toBe('todo');
    expect(taskLineStatus(attrs({ checked: true }))).toBe('done');
    expect(taskLineStatus(attrs({ cancelled: true }))).toBe('cancelled');
    // 一根轴：两枚都真在合法正文里不该出现，出现了也必须给出唯一答案，而不是让 `done` 抢走
    expect(taskLineStatus(attrs({ checked: true, cancelled: true }))).toBe('cancelled');
  });

  it('pending＝既没完成也没取消（日历默认只看 pending 的口径）', () => {
    expect(isPending('todo')).toBe(true);
    expect(isPending('cancelled')).toBe(false);
    expect(isPending('done')).toBe(false);
    // `doing` 是本地多出的一档（官方没有＝tasks.md:16 记着），它属于 pending，不许被默认过滤吃掉
    expect(isPending('doing')).toBe(true);
  });
});

describe('取消那一轴与勾选那一轴互斥', () => {
  it('标记为已取消同时把勾去掉，并落下自己的时间戳', () => {
    expect(applyCancelled(attrs({ checked: true }), true, NOW)).toEqual({
      checked: false,
      cancelled: true,
      cancelledAt: NOW.toISOString(),
    });
  });

  it('勾上＝完成，同时退出已取消（含清掉取消时间戳）', () => {
    expect(applyChecked(attrs({ cancelled: true, cancelledAt: NOW.toISOString() }), true)).toEqual({
      checked: true,
      cancelled: false,
      cancelledAt: null,
    });
  });

  it('取消标记只退取消轴，不许顺手把勾选改掉', () => {
    const before = attrs({ checked: true, cancelled: true, cancelledAt: NOW.toISOString() });
    expect(applyCancelled(before, false, NOW)).toEqual({ checked: true, cancelled: false, cancelledAt: null });
    expect(applyCancelled(attrs({ checked: true }), false, NOW)).toEqual({ checked: true, cancelled: false, cancelledAt: null });
  });

  it('两枚"已经是这个值"都不返回新对象＝接线层据此决定发不发事务', () => {
    // 这一条是防"重复点同一档就再 dispatch 一次"＝正文里会白涨一条 Yjs 历史
    const already = attrs({ cancelled: true, cancelledAt: NOW.toISOString() });
    expect(applyCancelled(already, true, NOW)).toBe(already);
    expect(applyCancelled(attrs(), false, NOW)).toEqual(attrs());
    expect(applyChecked(attrs(), false)).toEqual(attrs());
    const done = attrs({ checked: true });
    expect(applyChecked(done, true)).toBe(done);
  });

  it('再取消一次不覆盖第一次的时间戳＝「已于 [0] 取消」始终指那一刻', () => {
    const early = attrs({ cancelled: true, cancelledAt: new Date('2026-01-01T00:00:00.000Z').toISOString() });
    expect(applyCancelled(early, true, NOW)).toBe(early);
    expect(applyCancelled(early, true, NOW).cancelledAt).not.toBe(NOW.toISOString());
  });
});

describe('官方点击循环（tasks.md:12：Unchecked→Checked、Checked→Unchecked、Canceled→Unchecked）', () => {
  it('未勾 → 勾上', () => {
    expect(applyToggled(attrs())).toEqual({ checked: true, cancelled: false, cancelledAt: null });
  });

  it('勾上 → 未勾', () => {
    expect(applyToggled(attrs({ checked: true }))).toEqual({ checked: false, cancelled: false, cancelledAt: null });
  });

  it('★ 已取消 → 未勾：取消行被点一下是回到待办，不是变成完成', () => {
    // 这一枚是"一根轴"最容易被写错的地方：只看 `checked` 的实现会把它算成"勾上"，
    // 于是取消过一次的任务永远回不到待办，行还挂着划线。
    const cancelled = attrs({ checked: false, cancelled: true, cancelledAt: NOW.toISOString() });
    expect(applyToggled(cancelled)).toEqual({ checked: false, cancelled: false, cancelledAt: null });
    expect(taskLineStatus(applyToggled(cancelled))).toBe('todo');
  });

  it('已取消且勾着（非法正文）也只走取消那一档：先清轴，不许记完成', () => {
    const both = attrs({ checked: true, cancelled: true, cancelledAt: NOW.toISOString() });
    expect(taskLineStatus(applyToggled(both))).toBe('todo');
  });
});

describe('官方文案', () => {
  it('「已取消」与「已于 [0] 取消」逐字对齐词表，且占位符真被填掉', () => {
    expect(CANCELLED_LABEL).toBe('已取消'); // tasks.cancelled
    expect(CANCELLED_ON_TEXT).toBe('已于 [0] 取消'); // tasks.canceled.on
    expect(cancelledOnText('10 月 14 日')).toBe('已于 10 月 14 日 取消');
    expect(cancelledOnText('10 月 14 日')).not.toContain('[0]');
  });
});
