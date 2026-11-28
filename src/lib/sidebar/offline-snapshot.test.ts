import { describe, expect, it } from 'vitest';

import { buildOfflineSidebarSnapshot } from './offline-snapshot';
import type { SyncRecord } from '@/lib/sync-core/types';

function row(table: string, id: string, data: Record<string, unknown>, op: 'upsert' | 'delete' = 'upsert'): SyncRecord {
  return { table, id, op, data, syncTs: '2026-11-01T00:00:00.000Z' };
}

/**
 * 这份读取是「服务端快照失败时的底座」：它必须给出与四个服务端读同源的过滤与排序，
 * 否则断网冷启动看到的是另一个侧栏（多出归档文档、日记页，或顺序每次都变）。
 */
describe('the offline sidebar snapshot', () => {
  it('keeps the document filter getDocuments applies and orders by updatedAt desc', () => {
    const snapshot = buildOfflineSidebarSnapshot(
      {
        document: [
          row('document', 'a', { title: 'older', updatedAt: '2026-11-01T00:00:00.000Z' }),
          row('document', 'b', { title: 'newer', updatedAt: '2026-11-02T00:00:00.000Z' }),
          row('document', 'deleted', { title: 'x', isDeleted: true }),
          row('document', 'archived', { title: 'x', isArchived: true }),
          row('document', 'daily', { title: 'x', isDailyNote: true }),
          row('document', 'template', { title: 'x', isTemplate: true }),
          row('document', 'tombstone', { title: 'x' }, 'delete'),
        ],
      },
      { pulled: true },
    );

    expect(snapshot.snapshot.documents.map((doc) => doc.id)).toEqual(['b', 'a']);
    expect(snapshot.snapshot.documents[1]).toMatchObject({
      title: 'older',
      icon: null,
      parentId: null,
      folderId: null,
      isDeleted: false,
      isDailyNote: false,
    });
  });

  it('orders folders by order, then createdAt, then id — never by storage order', () => {
    const snapshot = buildOfflineSidebarSnapshot(
      {
        folder: [
          row('folder', 'c', { name: 'C', order: 1, createdAt: '2026-01-02T00:00:00.000Z' }),
          row('folder', 'b', { name: 'B', order: 1, createdAt: '2026-01-01T00:00:00.000Z' }),
          row('folder', 'a', { name: 'A', order: 0 }),
          row('folder', 'gone', { name: 'X', isDeleted: true }),
        ],
      },
      { pulled: true },
    );

    expect(snapshot.snapshot.folders.map((folder) => folder.id)).toEqual(['a', 'b', 'c']);
  });

  it('drops collections that belong to another account and sorts by order', () => {
    const snapshot = buildOfflineSidebarSnapshot(
      {
        collection: [
          row('collection', 'mine-2', { name: 'B', order: 1, userId: 'u1' }),
          row('collection', 'mine-1', { name: 'A', order: 0, userId: 'u1' }),
          row('collection', 'theirs', { name: 'X', order: 0, userId: 'u2' }),
        ],
      },
      { pulled: true, userId: 'u1' },
    );

    expect(snapshot.snapshot.collections.map((collection) => collection.id)).toEqual(['mine-1', 'mine-2']);
  });

  it('reads whiteboards newest first and counts only the rows it projects', () => {
    const snapshot = buildOfflineSidebarSnapshot(
      {
        document: [row('document', 'doc', { title: 'D', updatedAt: '2026-11-01T00:00:00.000Z' })],
        whiteboard: [
          row('whiteboard', 'old', { name: 'Old', updatedAt: '2026-10-01T00:00:00.000Z' }),
          row('whiteboard', 'new', { name: 'New', updatedAt: '2026-10-02T00:00:00.000Z' }),
          row('whiteboard', 'hidden', { name: 'X', isDeleted: true }),
        ],
      },
      { pulled: true },
    );

    expect(snapshot.snapshot.whiteboards.map((board) => board.id)).toEqual(['new', 'old']);
    expect(snapshot.rowCount).toBe(3);
    expect(snapshot.pulled).toBe(true);
  });

  it('reports an empty mirror as pulled-or-not, never as content', () => {
    const cold = buildOfflineSidebarSnapshot({}, { pulled: false });
    expect(cold.rowCount).toBe(0);
    expect(cold.pulled).toBe(false);
    expect(cold.snapshot.documents).toEqual([]);
    expect(cold.snapshot.folders).toEqual([]);
    expect(cold.snapshot.collections).toEqual([]);
    expect(cold.snapshot.whiteboards).toEqual([]);
  });
});
