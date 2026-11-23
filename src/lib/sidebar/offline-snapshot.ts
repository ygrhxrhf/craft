/**
 * 侧栏快照的离线底座。
 *
 * `useSidebarSnapshotState` 在服务端快照失败或 12s 没回来时退回这里：断网冷启动时本地库
 * 已有全量元数据，壳能开、也能写，但侧栏若停在「加载中…」就打不开任何东西。这份读取把
 * 同步镜像（sync-core 的本地库）投影成 `getSidebarSnapshot()` 的同一形状，四棵树照常渲染。
 *
 * 两件事必须分清（见 `use-sidebar-snapshot` 的调用点）：
 *   - `pulled`：这个账号**至少成功拉过一次**（`lastPullAt` 存在）。有它而镜像为空＝账号本来
 *     就没有内容，该显示空态；没有它＝从没同步过，什么都不该假装有。
 *   - `rowCount`：投影出来的可见行数，给"镜像里到底有没有东西"一个读数。
 *
 * 这里只读镜像、不叠 pending：四棵树自己会用 `mergePending` 把未推送的本地意图盖上去，
 * 叠两次会让同一笔改动在两处各算一遍。
 */
import { getSyncManager } from '@/lib/sync-core';
import type { SyncRecord } from '@/lib/sync-core/types';

/** 与 `getDocuments()` 投影的九列同形。 */
export interface OfflineDocumentRow {
  id: string;
  title: string;
  icon: string | null;
  parentId: string | null;
  folderId: string | null;
  isDeleted: boolean;
  isDailyNote: boolean;
  updatedAt: string;
  order: number;
}

/** 与 `getFolders()` 的行同形。 */
export interface OfflineFolderRow {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  parentId: string | null;
  order: number;
  isDeleted: boolean;
  createdAt: string | null;
}

export interface OfflineCollectionRow {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  order: number;
}

export interface OfflineWhiteboardRow {
  id: string;
  name: string;
  icon: string | null;
  updatedAt: string;
}

export interface OfflineSidebarSnapshot {
  pulled: boolean;
  rowCount: number;
  snapshot: {
    documents: OfflineDocumentRow[];
    folders: OfflineFolderRow[];
    collections: OfflineCollectionRow[];
    whiteboards: OfflineWhiteboardRow[];
  };
}

export type SidebarTable = 'document' | 'folder' | 'collection' | 'whiteboard';

const SIDEBAR_TABLES: readonly SidebarTable[] = ['document', 'folder', 'collection', 'whiteboard'];

/** 镜像行的负载：契约字段名（camelCase），缺列一律按默认值读。 */
function dataOf(record: SyncRecord): Record<string, unknown> | null {
  if (record.op === 'delete') return null;
  return record.data ?? {};
}

function text(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function nullableText(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function flag(value: unknown): boolean {
  return value === true;
}

function numeric(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/**
 * 镜像行归属谁。同步载荷里的 `userId` 由服务端按会话覆盖，正常情况下与当前账号一致；
 * 列缺失（老行、白名单没带这一列）时按"归属本机账号"处理，否则侧栏会在换账号后静默变空。
 */
function belongsTo(data: Record<string, unknown>, userId: string | null): boolean {
  const owner = data.userId;
  if (typeof owner !== 'string' || !userId) return true;
  return owner === userId;
}

function compareStrings(a: string | null, b: string | null): number {
  return (a ?? '').localeCompare(b ?? '');
}

/**
 * 把镜像记录投影成侧栏快照。过滤条件与四个服务端读同源：
 * 文档＝未删、未归档、非日记、非模板，按 `updatedAt` 降序；文件夹＝未删，按 order／createdAt／id
 * 三连（并列 order 时不能交给存储顺序，否则改一次名字就换位置）；集合与白板＝未删、按 order。
 */
export function buildOfflineSidebarSnapshot(
  records: Partial<Record<SidebarTable, readonly SyncRecord[]>>,
  options: { pulled: boolean; userId?: string | null },
): OfflineSidebarSnapshot {
  const userId = options.userId ?? null;

  const documents: OfflineDocumentRow[] = [];
  for (const record of records.document ?? []) {
    const data = dataOf(record);
    if (!data) continue;
    if (flag(data.isDeleted) || flag(data.isArchived) || flag(data.isDailyNote) || flag(data.isTemplate)) continue;
    documents.push({
      id: record.id,
      title: text(data.title, ''),
      icon: nullableText(data.icon),
      parentId: nullableText(data.parentId),
      folderId: nullableText(data.folderId),
      isDeleted: false,
      isDailyNote: false,
      updatedAt: text(data.updatedAt, record.syncTs),
      order: numeric(data.order),
    });
  }
  documents.sort((a, b) => {
    const byUpdated = compareStrings(b.updatedAt, a.updatedAt);
    return byUpdated !== 0 ? byUpdated : a.id.localeCompare(b.id);
  });

  const folders: OfflineFolderRow[] = [];
  for (const record of records.folder ?? []) {
    const data = dataOf(record);
    if (!data) continue;
    if (flag(data.isDeleted)) continue;
    folders.push({
      id: record.id,
      name: text(data.name, ''),
      icon: nullableText(data.icon),
      description: nullableText(data.description),
      parentId: nullableText(data.parentId),
      order: numeric(data.order),
      isDeleted: false,
      createdAt: nullableText(data.createdAt),
    });
  }
  folders.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    const byCreated = compareStrings(a.createdAt, b.createdAt);
    return byCreated !== 0 ? byCreated : a.id.localeCompare(b.id);
  });

  const collections: OfflineCollectionRow[] = [];
  for (const record of records.collection ?? []) {
    const data = dataOf(record);
    if (!data) continue;
    if (flag(data.isDeleted)) continue;
    if (!belongsTo(data, userId)) continue;
    collections.push({
      id: record.id,
      name: text(data.name, ''),
      icon: nullableText(data.icon),
      description: nullableText(data.description),
      order: numeric(data.order),
    });
  }
  collections.sort((a, b) => (a.order !== b.order ? a.order - b.order : a.id.localeCompare(b.id)));

  const whiteboards: OfflineWhiteboardRow[] = [];
  for (const record of records.whiteboard ?? []) {
    const data = dataOf(record);
    if (!data) continue;
    if (flag(data.isDeleted)) continue;
    whiteboards.push({
      id: record.id,
      name: text(data.name, ''),
      icon: nullableText(data.icon),
      updatedAt: text(data.updatedAt, record.syncTs),
    });
  }
  whiteboards.sort((a, b) => {
    const byUpdated = compareStrings(b.updatedAt, a.updatedAt);
    return byUpdated !== 0 ? byUpdated : a.id.localeCompare(b.id);
  });

  return {
    pulled: options.pulled,
    rowCount: documents.length + folders.length + collections.length + whiteboards.length,
    snapshot: { documents, folders, collections, whiteboards },
  };
}

/**
 * 读镜像并投影。`userId` 为空（未登录）时不读库：那时的侧栏本来就不该有行。
 * 本地库不可用（隐私模式、SQLite 没开起来）时返回 `null`，调用方按"没有镜像"处理。
 */
export async function readOfflineSidebarSnapshot(
  userId: string | null,
): Promise<OfflineSidebarSnapshot | null> {
  if (!userId) return null;
  try {
    const store = await getSyncManager().readyStore();
    const [document, folder, collection, whiteboard, lastPullAt] = await Promise.all([
      store.all('document'),
      store.all('folder'),
      store.all('collection'),
      store.all('whiteboard'),
      store.getKv('lastPullAt'),
    ]);
    return buildOfflineSidebarSnapshot(
      { document, folder, collection, whiteboard },
      { pulled: typeof lastPullAt === 'string' && lastPullAt.length > 0, userId },
    );
  } catch {
    return null;
  }
}
