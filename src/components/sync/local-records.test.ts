import { describe, it, expect } from 'vitest';
import { mergePending } from './local-records';

interface Row { id: string; title: string; isDeleted: boolean; order: number }

const server = (partial: Partial<Row> & { id: string }): Row =>
  ({ title: 'server', isDeleted: false, order: 0, ...partial });

describe('mergePending（本地未推送意图覆盖服务端行）', () => {
  it('pending upsert → 覆盖服务端同 id 行的变更字段', () => {
    const pending = new Map([['a', { op: 'upsert' as const, data: { title: '本地改名' }, syncTs: 't' }]]);
    const out = mergePending([server({ id: 'a' })], pending, (id) => server({ id }));
    expect(out).toEqual([{ id: 'a', title: '本地改名', isDeleted: false, order: 0 }]);
  });

  it('pending upsert（服务端尚无此行）→ 用 defaults + data 新增行', () => {
    const pending = new Map([['n', { op: 'upsert' as const, data: { title: '新文档', order: 2 }, syncTs: 't' }]]);
    const out = mergePending([server({ id: 'a' })], pending, (id) => server({ id, title: '默认' }));
    expect(out.map(r => r.id).sort()).toEqual(['a', 'n']);
    expect(out.find(r => r.id === 'n')).toEqual({ id: 'n', title: '新文档', isDeleted: false, order: 2 });
  });

  it('pending delete 墓碑 → 丢弃服务端行且不新增', () => {
    const pending = new Map<string, { op: 'delete'; data?: Record<string, unknown>; syncTs: string }>([
      ['a', { op: 'delete', syncTs: 't' }],
      ['gone', { op: 'delete', syncTs: 't' }],
    ]);
    const out = mergePending([server({ id: 'a' })], pending, (id) => server({ id }));
    expect(out).toEqual([]);
  });

  it('无 pending → 原样返回', () => {
    const rows = [server({ id: 'a' })];
    expect(mergePending(rows, new Map(), (id) => server({ id }))).toEqual(rows);
  });
});
