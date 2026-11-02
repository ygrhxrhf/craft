import { describe, expect, it } from 'vitest';

import { DOC_META_COLS } from '@/lib/sync/tables';

import {
  applyMove,
  applyMoveRow,
  parseMoveRequest,
  planMove,
  type MovePlan,
} from './move';

const current = { folderId: 'f1', parentId: 'p1', isDailyNote: false, isTemplate: false };

describe('the move target is exactly one of three (G679)', () => {
  it('rejects no target and multiple targets', () => {
    expect(parseMoveRequest({})).toEqual({ ok: false, reason: 'no-target' });
    expect(parseMoveRequest({ folder: 'f1', destination: 'unsorted' })).toEqual({
      ok: false,
      reason: 'conflicting-targets',
    });
    expect(parseMoveRequest({ folder: 'f1', parent: 'p2' })).toEqual({
      ok: false,
      reason: 'conflicting-targets',
    });
  });

  it('knows only the two virtual destinations', () => {
    expect(parseMoveRequest({ destination: 'trash' })).toEqual({ ok: false, reason: 'unknown-destination' });
    expect(parseMoveRequest({ destination: 'templates' })).toEqual({ kind: 'destination', target: 'templates' });
  });

  it('reads an empty folder as 未分类', () => {
    expect(parseMoveRequest({ folder: '' })).toEqual({ kind: 'folder', folderId: null });
  });
});

describe('the plan it produces', () => {
  it('writes only the columns the chosen target owns, and keeps a snapshot', () => {
    expect(planMove(current, { kind: 'folder', folderId: null })).toEqual({
      ok: true,
      plan: { patch: { folderId: null }, previous: current },
    });
    const restore = planMove(current, { kind: 'destination', target: 'unsorted' });
    expect(restore.ok && restore.plan.patch).toEqual({ folderId: null, parentId: null, isTemplate: false });
    const toTemplates = planMove(current, { kind: 'destination', target: 'templates' });
    expect(toTemplates.ok && toTemplates.plan.patch).toEqual({ isTemplate: true });
  });

  it('refuses to move a daily note', () => {
    expect(planMove({ ...current, isDailyNote: true }, { kind: 'folder', folderId: 'f2' })).toEqual({
      ok: false,
      reason: 'daily-note',
    });
  });
});

describe('the rollback the official sentence asks for', () => {
  function recorder(failOnFirst: boolean) {
    const writes: Record<string, unknown>[] = [];
    let calls = 0;
    return {
      writes,
      applyLocal: async (op: { table: 'document'; id: string; patch: Record<string, unknown> }) => {
        calls += 1;
        if (failOnFirst && calls === 1) throw new Error('quota');
        writes.push(op.patch);
      },
    };
  }

  it('restores the recorded position when the write fails', async () => {
    const plan: MovePlan = { patch: { folderId: 'f9' }, previous: current };
    const writer = recorder(true);
    const result = await applyMove(writer, 'd1', plan);
    expect(result.ok).toBe(false);
    expect(writer.writes).toEqual([
      { folderId: current.folderId, parentId: current.parentId, isTemplate: false },
    ]);
  });

  it('writes once and reports success otherwise', async () => {
    const writer = recorder(false);
    expect(await applyMove(writer, 'd1', { patch: { folderId: 'f9' }, previous: current })).toEqual({ ok: true });
    expect(writer.writes).toEqual([{ folderId: 'f9' }]);
  });
});

describe('applyMoveRow (the one-stop path the browse bar uses)', () => {
  function spy() {
    const writes: Record<string, unknown>[] = [];
    return {
      writes,
      applyLocal: async (op: { table: 'document'; id: string; patch: Record<string, unknown> }) => {
        writes.push(op.patch);
      },
    };
  }

  it('moves an ordinary document to the chosen folder', async () => {
    const writer = spy();
    expect(await applyMoveRow(writer, { id: 'd1', current, folderId: 'f9' })).toBe('moved');
    expect(writer.writes).toEqual([{ folderId: 'f9' }]);
  });

  it('blocks a daily note without writing anything', async () => {
    const writer = spy();
    const blocked = { ...current, isDailyNote: true };
    expect(await applyMoveRow(writer, { id: 'd2', current: blocked, folderId: 'f9' })).toBe('daily-note');
    expect(writer.writes).toEqual([]);
  });
});

// R-9 那道闸把 `patch: plan.patch` 记成"静态面判不出来"的一处，人工复核就钉在这条测试上：
// 四种落点产出的键必须全在 document 白名单里，否则同步会静默丢列。
describe('the patches stay inside the document whitelist', () => {
  const requests = [
    { kind: 'folder', folderId: 'f9' },
    { kind: 'folder', folderId: null },
    { kind: 'parent', parentId: 'p9' },
    { kind: 'destination', target: 'unsorted' },
    { kind: 'destination', target: 'templates' },
  ] as const;

  it('only writes whitelisted columns', () => {
    for (const request of requests) {
      const result = planMove(current, request);
      if (!result.ok) throw new Error(`${JSON.stringify(request)} 应该可移动`);
      for (const key of Object.keys(result.plan.patch)) {
        expect(DOC_META_COLS, `${JSON.stringify(request)} → ${key}`).toContain(key);
      }
    }
  });
});
