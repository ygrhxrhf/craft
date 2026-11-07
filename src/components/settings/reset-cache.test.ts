import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';

import { SYNC_DB_NAME } from '@/lib/sync-core/adapter-idb';
import {
  RESET_CACHE_ACTION,
  RESET_CACHE_DONE,
  RESET_CACHE_FAILED,
  RESET_CACHE_TITLE,
  resetDocumentCache,
} from './reset-cache';

/** G161：「重置文档缓存」删的是离线内核那一整库，下次 boot 重新从服务端取回。 */
describe('resetting the document cache', () => {
  it('drops the offline kernel database', async () => {
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open(SYNC_DB_NAME, 1);
      open.onupgradeneeded = () => open.result.createObjectStore('records');
      open.onsuccess = () => {
        open.result.close();
        resolve();
      };
      open.onerror = () => reject(open.error);
    });
    expect(await indexedDB.databases()).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: SYNC_DB_NAME })]),
    );

    await resetDocumentCache({ indexedDB });

    expect((await indexedDB.databases()).map((db) => db.name)).not.toContain(SYNC_DB_NAME);
  });

  it('carries the local confirmation and both outcome sentences', () => {
    expect(RESET_CACHE_TITLE).toBe('重置文档缓存');
    expect(RESET_CACHE_ACTION).toBe('重置缓存');
    expect(RESET_CACHE_DONE).toBe('文档缓存已重置');
    expect(RESET_CACHE_FAILED).toBe('没有重置缓存，请重试');
  });
});