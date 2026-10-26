import { describe, expect, it } from 'vitest';

import { whiteboardMetaPatch } from './whiteboard-meta';
import { SYNC_TABLES } from '@/lib/sync/tables';

const NOW = '2026-10-26T00:00:00.000Z';

const whiteboardCols = new Set(
  SYNC_TABLES.find((table) => table.table === 'whiteboard')!.cols,
);

describe('whiteboardMetaPatch', () => {
  it('改名两端去空白', () => {
    expect(whiteboardMetaPatch.rename('  草图  ')).toEqual({ name: '草图' });
  });

  it('删除是软删：置 isDeleted 并留 deletedAt 供「最近删除」排序', () => {
    expect(whiteboardMetaPatch.delete(NOW)).toEqual({
      isDeleted: true,
      deletedAt: NOW,
      updatedAt: NOW,
    });
  });

  it('恢复把两列都清回活行状态', () => {
    expect(whiteboardMetaPatch.restore(NOW)).toEqual({
      isDeleted: false,
      deletedAt: null,
      updatedAt: NOW,
    });
  });

  it('每个产出的键都落在 whiteboard 同步白名单内（本地 store 没有服务端求交闸门）', () => {
    const patches = [
      whiteboardMetaPatch.rename('x'),
      whiteboardMetaPatch.delete(NOW),
      whiteboardMetaPatch.restore(NOW),
    ];
    for (const patch of patches) {
      for (const key of Object.keys(patch)) {
        expect(whiteboardCols.has(key), `${key} 不在 whiteboard 白名单`).toBe(true);
      }
    }
  });

  it('不提供客户端分享 token 一档（token 由服务端 createShareToken 签发）', () => {
    expect(Object.keys(whiteboardMetaPatch)).toEqual(['rename', 'delete', 'restore']);
  });
});
