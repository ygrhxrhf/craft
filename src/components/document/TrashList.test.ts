// src/components/document/TrashList.test.ts
// R-18：回收站列表在 store 变化后要重取服务端权威行，再盖本地 pending overlay——
// 只把旧 prop 行再 overlay 一遍会让 ack+pull 后恢复的文档回流、新删的文档丢真实标题。
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDeletedDocuments } from '@/actions/document/get';
import { readPendingRows } from '@/components/sync/local-records';

vi.mock('@/actions/document/get', () => ({ getDeletedDocuments: vi.fn() }));
vi.mock('@/actions/document/delete', () => ({ permanentDeleteDocument: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: null }) }));
vi.mock('@/components/sync/local-records', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/sync/local-records')>();
  return { ...actual, readPendingRows: vi.fn(async () => new Map()) };
});

import { overlayTrashRows, loadTrashRows } from './TrashList';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TRASH_DISCLAIMER, TRASH_EMPTY } from '@/lib/browse/trash-copy';

const serverRow = (id: string, title: string, deletedAt: string) =>
  ({ id, title, icon: null, deletedAt });

describe('R-18 回收站：重取新鲜行 + pending overlay', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loadTrashRows：视图由重取的服务端行驱动（恢复的不回流、新删的带真实标题）', async () => {
    (getDeletedDocuments as any).mockResolvedValue([
      serverRow('b', '恢复后的真标题', '2026-09-28T12:00:00.000Z'),
    ]);
    (readPendingRows as any).mockResolvedValue(new Map());

    const rows = await loadTrashRows();

    expect(getDeletedDocuments).toHaveBeenCalled(); // 不是拿旧 prop 行再 overlay
    expect(rows).toEqual([serverRow('b', '恢复后的真标题', '2026-09-28T12:00:00.000Z')]);
  });

  it('loadTrashRows：pending overlay 盖在新鲜行上（恢复意图不回流、刚移入未推送的行出现）', async () => {
    (getDeletedDocuments as any).mockResolvedValue([
      serverRow('x', '服务端还标着删除', '2026-09-28T09:00:00.000Z'),
    ]);
    (readPendingRows as any).mockResolvedValue(new Map([
      // 本地已恢复（未 ack）→ deletedAt:null 让行从视图消失
      ['x', { op: 'upsert' as const, data: { isDeleted: false, deletedAt: null }, syncTs: 't' }],
      // 本地刚移入回收站（未推送）→ 行出现且带真实标题
      ['n', {
        op: 'upsert' as const,
        data: { title: '刚移入的文档', isDeleted: true, deletedAt: '2026-09-28T12:30:00.000Z' },
        syncTs: 't',
      }],
    ]));

    const rows = await loadTrashRows();

    expect(rows.map((r) => r.id)).toEqual(['n']);
    expect(rows[0].title).toBe('刚移入的文档');
  });

  it('overlayTrashRows：delete 墓碑丢行；非删除行按 getDeletedDocuments 同条件过滤', () => {
    const pending = new Map([
      ['gone', { op: 'delete' as const, syncTs: 't' }],
    ]);
    const out = overlayTrashRows(
      [
        serverRow('gone', '已物理删除', '2026-09-28T09:00:00.000Z'),
        { id: 'restored', title: '恢复', icon: null, deletedAt: null },
        serverRow('del', '删除中', '2026-09-28T10:00:00.000Z'),
      ],
      pending,
    );
    expect(out.map((r) => r.id)).toEqual(['del']);
  });
});

describe('the trash copy is the official text, and the disclaimer is conditional', () => {
  const source = readFileSync(
    fileURLToPath(new URL('./TrashList.tsx', import.meta.url)),
    'utf8',
  );

  it('uses the official empty-state sentence rather than a local one', () => {
    expect(TRASH_EMPTY).toBe('你删除的文档将显示在此处');
    expect(source).toContain('{TRASH_EMPTY}');
    expect(source).not.toContain('回收站是空的');
  });

  it('shows the 30-day line only on the populated branch', () => {
    expect(TRASH_DISCLAIMER).toBe('文档将保留 30 天。之后，文档将被永久删除。');
    // The empty-state early return happens above the disclaimer, so the line cannot render there.
    const emptyReturn = source.indexOf('rows.length === 0');
    const disclaimer = source.indexOf('{TRASH_DISCLAIMER}');
    expect(emptyReturn).toBeGreaterThanOrEqual(0);
    expect(disclaimer).toBeGreaterThan(emptyReturn);
  });
});
