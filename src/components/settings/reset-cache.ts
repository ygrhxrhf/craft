/**
 * G161 —— 高级设置里的「重置文档缓存」。
 *
 * 本地唯一的文档缓存就是离线内核的 IndexedDB（`SYNC_DB_NAME`）：同步记录、待发队列与游标都在那
 * 一个库里。重置＝把这个库删掉，内核下次 boot 会重新开库、从服务端整批取回；因此重置会丢掉**尚未
 * 同步的本地修改**，调用方必须先过一遍确认框。
 *
 * 官方那句确认长文未采集到逐字，这里的文案是本地措辞（不与官方句混用）。
 */
import { SYNC_DB_NAME } from '@/lib/sync-core/adapter-idb';

export const RESET_CACHE_TITLE = '重置文档缓存';
export const RESET_CACHE_DESC = '清空本机缓存的文档数据，下次打开时从服务器重新下载。';
export const RESET_CACHE_CONFIRM_MESSAGE = '尚未同步到服务器的本地修改会丢失。此操作无法撤消。';
export const RESET_CACHE_ACTION = '重置缓存';
export const RESET_CACHE_BUSY = '正在重置缓存…';
export const RESET_CACHE_DONE = '文档缓存已重置';
export const RESET_CACHE_FAILED = '没有重置缓存，请重试';

export interface ResetCacheEnv {
  /** 可注入的 IndexedDB（测试用 fake-indexeddb）。 */
  indexedDB: IDBFactory;
}

/**
 * 删除离线内核的整库。删除请求可能被另一个仍持有连接的标签页挡住（`onblocked`）——内核自己在
 * `versionchange` 时主动关连接，所以这里只等 `success`/`error`，不额外加超时。
 */
export function resetDocumentCache(env: ResetCacheEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = env.indexedDB.deleteDatabase(SYNC_DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('deleteDatabase failed'));
  });
}