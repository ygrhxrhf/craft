import { describe, it, expect } from 'vitest';
import { planToggle, rollForwardRow, toggleColumns, type ToggleSource } from './toggle-core';
import { SYNC_TABLES } from '@/lib/sync/tables';

const NOW = new Date('2030-05-01T12:00:00.000Z');

const source = (over: Partial<ToggleSource> = {}): ToggleSource => ({
  id: 't1',
  userId: 'u1',
  title: '任务',
  isCompleted: false,
  status: 'todo',
  cancelledAt: null,
  documentId: null,
  blockId: null,
  dueDate: null,
  remindAt: null,
  recurrence: null,
  recurrenceEnd: null,
  seriesId: null,
  order: null,
  ...over,
});

describe('toggleColumns：三值循环与列投影', () => {
  it('待办 → 完成，落完成时间', () => {
    expect(toggleColumns(source(), NOW)).toEqual({
      isCompleted: true,
      status: 'done',
      completedAt: NOW.toISOString(),
      cancelledAt: null,
    });
  });

  it('已完成 → 待办，完成时间清空', () => {
    expect(toggleColumns(source({ isCompleted: true, status: 'done' }), NOW)).toEqual({
      isCompleted: false,
      status: 'todo',
      completedAt: null,
      cancelledAt: null,
    });
  });

  it('★ 已取消 → 待办：不是完成，也不留下取消时间戳', () => {
    expect(toggleColumns(source({ status: 'cancelled', cancelledAt: '2026-09-01T00:00:00.000Z' }), NOW))
      .toEqual({ isCompleted: false, status: 'todo', completedAt: null, cancelledAt: null });
  });
});

describe('rollForwardRow：重复任务下一期', () => {
  it('没有重复规则 → 不派生', () => {
    expect(rollForwardRow(source({ dueDate: '2030-05-01T00:00:00.000Z' }), NOW, 'UTC', 'n1')).toBeNull();
  });

  it('fixed 从原排期起算，提醒按「新排期那天 ＋ 原时刻」重算', () => {
    const next = rollForwardRow(
      source({
        dueDate: '2030-05-01T00:00:00.000Z',
        remindAt: '2030-05-01T09:00:00.000Z',
        recurrence: '{"freq":"daily","type":"fixed"}',
      }),
      NOW,
      'UTC',
      'n1',
    );

    expect(next).toMatchObject({
      id: 'n1',
      userId: 'u1',
      title: '任务',
      isCompleted: false,
      status: 'todo',
      dueDate: '2030-05-02T00:00:00.000Z',
      remindAt: '2030-05-02T09:00:00.000Z',
      recurrence: '{"freq":"daily","type":"fixed"}',
    });
  });

  it('flexible 从完成这一刻起算，不跟原排期走', () => {
    const next = rollForwardRow(
      source({
        dueDate: '2030-04-01T00:00:00.000Z',
        recurrence: '{"freq":"daily","type":"flexible"}',
      }),
      NOW,
      'UTC',
      'n1',
    );

    expect(next?.dueDate).toBe('2030-05-02T12:00:00.000Z');
  });

  it('算出来已经过去的提醒静默留空', () => {
    const next = rollForwardRow(
      source({
        dueDate: '2020-01-01T00:00:00.000Z',
        remindAt: '2020-01-01T09:00:00.000Z',
        recurrence: '{"freq":"daily","type":"fixed"}',
      }),
      NOW,
      'UTC',
      'n1',
    );

    expect(next?.remindAt).toBeNull();
  });

  it('下一期接回原序列；没有序列时用原行 id 自成一根（与服务端 fallback 同形）', () => {
    const withSeries = rollForwardRow(
      source({ seriesId: 'series-1', recurrence: '{"freq":"daily","type":"fixed"}', dueDate: '2030-05-01T00:00:00.000Z' }),
      NOW,
      'UTC',
      'n1',
    );
    const withoutSeries = rollForwardRow(
      source({ recurrence: '{"freq":"daily","type":"fixed"}', dueDate: '2030-05-01T00:00:00.000Z' }),
      NOW,
      'UTC',
      'n1',
    );

    expect(withSeries?.seriesId).toBe('series-1');
    expect(withoutSeries?.seriesId).toBe('t1');
  });

  it('G645：下一期仍带着原行的文档／区块深链与位次', () => {
    const next = rollForwardRow(
      source({
        documentId: 'd1',
        blockId: 'b1',
        order: 3,
        dueDate: '2030-05-01T00:00:00.000Z',
        recurrence: '{"freq":"daily","type":"fixed"}',
      }),
      NOW,
      'UTC',
      'n1',
    );

    expect(next).toMatchObject({ documentId: 'd1', blockId: 'b1', order: 3 });
  });

  it('recurrenceEnd 已过 → 不再派生', () => {
    const next = rollForwardRow(
      source({
        dueDate: '2030-05-01T00:00:00.000Z',
        recurrence: '{"freq":"daily","type":"fixed","until":"2030-05-01"}',
      }),
      NOW,
      'UTC',
      'n1',
    );

    expect(next).toBeNull();
  });

  it('派生行的键全部落在 SYNC_TABLES.task 的列白名单内', () => {
    const next = rollForwardRow(
      source({
        documentId: 'd1',
        blockId: 'b1',
        seriesId: 's1',
        order: 2,
        dueDate: '2030-05-01T00:00:00.000Z',
        remindAt: '2030-05-01T09:00:00.000Z',
        recurrence: '{"freq":"daily","type":"fixed"}',
        recurrenceEnd: null,
      }),
      NOW,
      'UTC',
      'n1',
    );
    const cols = SYNC_TABLES.find((def) => def.table === 'task')!.cols;

    expect(next).not.toBeNull();
    for (const key of Object.keys(next!)) expect(cols).toContain(key);
  });
});

describe('planToggle：一次勾选的完整计划', () => {
  it('变成完成且有规则 → 同时给列与下一期', () => {
    const plan = planToggle(
      source({ dueDate: '2030-05-01T00:00:00.000Z', recurrence: '{"freq":"daily","type":"fixed"}' }),
      NOW,
      'UTC',
      'n1',
    );

    expect(plan.columns.isCompleted).toBe(true);
    expect(plan.next?.id).toBe('n1');
  });

  it('取消勾选不派生下一期', () => {
    const plan = planToggle(
      source({
        isCompleted: true,
        status: 'done',
        dueDate: '2030-05-01T00:00:00.000Z',
        recurrence: '{"freq":"daily","type":"fixed"}',
      }),
      NOW,
      'UTC',
      'n1',
    );

    expect(plan.columns.isCompleted).toBe(false);
    expect(plan.next).toBeNull();
  });
});
