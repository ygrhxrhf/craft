// G338：文件夹「固定文档」的离线写通路——官方叫 `folder_set_pinned`，同步事件面叫 `Folder pinned doc`。
import { getSyncManager } from '@/lib/sync-core';
import { pinnedIdsFor } from '@/lib/folder/pinned-doc';

/**
 * 整条写 `pinnedDocumentIds`（取消固定写空数组，与官方 `documentId ? [id] : []` 同形）。
 * 文件夹页读的是服务端行，所以入队后立刻 flush，否则刷新看不到刚固定的那一枚。
 */
export async function setFolderPinnedLocal(
  folderId: string,
  documentId: string | null
): Promise<string[]> {
  const ids = pinnedIdsFor(documentId);
  const manager = getSyncManager();
  await manager.applyLocal({ table: 'folder', id: folderId, patch: { pinnedDocumentIds: ids } });
  await manager.flushNow();
  return ids;
}
