import { readFileSync } from 'node:fs';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/sync-core', () => ({ getSyncManager: vi.fn() }));
vi.mock('@/components/sync/local-records', () => ({
  findFavoriteRowId: vi.fn(),
  findLiveFavoriteIds: vi.fn(),
  readLocalRecords: vi.fn(async () => [] as unknown[]),
}));
vi.mock('@/actions/document/favorite', () => ({ isDocumentFavorite: vi.fn(async () => false) }));

import { getSyncManager } from '@/lib/sync-core';
import { findFavoriteRowId, findLiveFavoriteIds, readLocalRecords } from '@/components/sync/local-records';
import { isDocumentFavorite } from '@/actions/document/favorite';
import { SYNC_TABLES } from '@/lib/sync/tables';
import { favoriteMirrorState, resolveFavoriteState, toggleFavoriteLocal } from './toggle-local';

const NOW = '2026-10-14T02:00:00.000Z';

type Applied = { table: string; id: string; patch: Record<string, unknown> | null };

function manager() {
  const applyLocal = vi.fn(async (_rec: Applied): Promise<void> => {});
  const flushNow = vi.fn(async () => {});
  (getSyncManager as any).mockReturnValue({ applyLocal, flushNow });
  return { applyLocal, flushNow };
}

beforeEach(() => {
  vi.clearAllMocks();
  (findFavoriteRowId as any).mockResolvedValue(null);
  (findLiveFavoriteIds as any).mockResolvedValue([]);
});

describe('toggleFavoriteLocal 的收藏分支', () => {
  it('镜像没有这一行时用新 uuid 建 upsert，并清 deletedAt', async () => {
    const { applyLocal, flushNow } = manager();
    const favored = await toggleFavoriteLocal({ documentId: 'd1', favored: false, userId: 'u1', now: NOW });

    expect(favored).toBe(true);
    expect(applyLocal).toHaveBeenCalledTimes(1);
    const rec = applyLocal.mock.calls[0]![0];
    expect(rec.table).toBe('favorite');
    expect(rec.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(rec.patch).toMatchObject({ documentId: 'd1', userId: 'u1', deletedAt: null, createdAt: NOW });
    expect(flushNow).toHaveBeenCalledTimes(1);
  });

  it('镜像里有墓碑行时复用它的 id：唯一键 [userId,documentId] 不容第二行', async () => {
    const { applyLocal } = manager();
    (findFavoriteRowId as any).mockResolvedValue('fav-old');
    await toggleFavoriteLocal({ documentId: 'd1', favored: false, now: NOW });
    expect(applyLocal.mock.calls[0]![0].id).toBe('fav-old');
  });

  it('patch 的键全部落在同步列白名单内', async () => {
    const { applyLocal } = manager();
    await toggleFavoriteLocal({ documentId: 'd1', favored: false, userId: 'u1', now: NOW });
    const cols = SYNC_TABLES.find((t) => t.table === 'favorite')!.cols;
    const patch = applyLocal.mock.calls[0]![0].patch;
    if (!patch) throw new Error('收藏写入必须是 upsert，不能是墓碑 op');
    for (const key of Object.keys(patch)) {
      expect(cols).toContain(key);
    }
  });
});

describe('toggleFavoriteLocal 的取消收藏分支', () => {
  it('镜像里的每条生效行都写墓碑，且不走 patch:null（data 要留下一次复用 id）', async () => {
    const { applyLocal } = manager();
    (findLiveFavoriteIds as any).mockResolvedValue(['fav-a', 'fav-b']);
    const favored = await toggleFavoriteLocal({ documentId: 'd1', favored: true, now: NOW });

    expect(favored).toBe(false);
    expect(applyLocal).toHaveBeenCalledTimes(2);
    const ids = applyLocal.mock.calls.map((c) => c[0].id).sort();
    expect(ids).toEqual(['fav-a', 'fav-b']);
    for (const c of applyLocal.mock.calls) {
      expect(c[0].patch).not.toBeNull();
      expect(c[0].patch).toMatchObject({ documentId: 'd1', deletedAt: NOW });
    }
  });

  it('镜像还没拉到该行时也要落地：写一条带 documentId 的墓碑，由服务端唯一键定位器认领', async () => {
    const { applyLocal } = manager();
    const favored = await toggleFavoriteLocal({ documentId: 'd1', favored: true, now: NOW });
    expect(favored).toBe(false);
    expect(applyLocal).toHaveBeenCalledTimes(1);
    expect(applyLocal.mock.calls[0]![0].patch).toMatchObject({ documentId: 'd1', deletedAt: NOW });
  });
});

describe('favoriteMirrorState / resolveFavoriteState', () => {
  it('镜像里一篇文档都没有行时不表态，交回服务端', async () => {
    (readLocalRecords as any).mockResolvedValue([]);
    expect(await favoriteMirrorState('d1')).toBeNull();
  });

  it('按 data.deletedAt 裁决，而不是按行的多少', async () => {
    (readLocalRecords as any).mockResolvedValue([
      { id: 'f1', op: 'upsert', data: { documentId: 'd1', deletedAt: NOW } },
    ]);
    expect(await favoriteMirrorState('d1')).toBe(false);

    (readLocalRecords as any).mockResolvedValue([
      { id: 'f1', op: 'delete' },
      { id: 'f2', op: 'upsert', data: { documentId: 'd1' } },
    ]);
    expect(await favoriteMirrorState('d1')).toBe(true);
  });

  it('刚入队、还没推送的写盖过服务端的旧答案', async () => {
    (readLocalRecords as any).mockResolvedValue([
      { id: 'f1', op: 'upsert', data: { documentId: 'd1' } },
    ]);
    (isDocumentFavorite as any).mockResolvedValue(false);
    expect(await resolveFavoriteState('d1')).toBe(true);
    expect(isDocumentFavorite).not.toHaveBeenCalled();
  });

  it('镜像没见过这篇文档时才问服务端', async () => {
    (readLocalRecords as any).mockResolvedValue([]);
    (isDocumentFavorite as any).mockResolvedValue(true);
    expect(await resolveFavoriteState('d1')).toBe(true);
    expect(isDocumentFavorite).toHaveBeenCalledWith('d1');
  });
});

describe('红线：收藏写入只走 applyLocal', () => {
  const source = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');

  it('服务端只剩读，写侧 action 已删除', () => {
    const actions = source('../../actions/document/favorite.ts');
    expect(actions).not.toContain('toggleFavorite');
    expect(actions).toContain('isDocumentFavorite');
  });

  it.each([
    '../../components/sidebar/DocumentTreeItem.tsx',
    '../../components/editor/tabs/InfoTab.tsx',
  ])('%s 用本地写路径切换收藏', (rel) => {
    const src = source(rel);
    expect(src).toContain('toggleFavoriteLocal(');
    expect(src).not.toContain('toggleFavorite(');
  });
});
