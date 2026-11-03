import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/sync-core', () => ({ getSyncManager: vi.fn() }));

import { getSyncManager } from '@/lib/sync-core';
import { SYNC_TABLES } from '@/lib/sync/tables';
import { setFolderPinnedLocal } from './pin-local';

type Applied = { table: string; id: string; patch: Record<string, unknown> | null };

function manager() {
  const applyLocal = vi.fn(async (_rec: Applied): Promise<void> => {});
  const flushNow = vi.fn(async () => {});
  (getSyncManager as any).mockReturnValue({ applyLocal, flushNow });
  return { applyLocal, flushNow };
}

beforeEach(() => vi.clearAllMocks());

/** G338：`Folder pinned doc` 事件的本地写通路。 */
describe('setFolderPinnedLocal (G338)', () => {
  it('writes the folder row with a one-item array', async () => {
    const { applyLocal, flushNow } = manager();
    const ids = await setFolderPinnedLocal('f1', 'doc-9');

    expect(applyLocal).toHaveBeenCalledWith({
      table: 'folder',
      id: 'f1',
      patch: { pinnedDocumentIds: ['doc-9'] },
    });
    expect(ids).toEqual(['doc-9']);
    // 文件夹页读服务端行，不推送就看不到刚固定的那一枚。
    expect(flushNow).toHaveBeenCalled();
  });

  it('unpins by writing an empty array, not by dropping the column', async () => {
    const { applyLocal } = manager();
    await setFolderPinnedLocal('f1', null);

    expect(applyLocal).toHaveBeenCalledWith({
      table: 'folder',
      id: 'f1',
      patch: { pinnedDocumentIds: [] },
    });
    const patch = applyLocal.mock.calls[0][0].patch as Record<string, unknown>;
    expect(patch.pinnedDocumentIds).toEqual([]);
  });

  it('is inside the folder sync whitelist, or the pin never leaves this device', () => {
    const folder = SYNC_TABLES.find((table) => table.table === 'folder');
    expect(folder?.cols).toContain('pinnedDocumentIds');
  });
});
