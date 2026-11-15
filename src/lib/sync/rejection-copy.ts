import type { SyncRejection } from '@/lib/sync-core/types';

/**
 * G1506——服务端拒收本机那一笔时屏幕上该说什么。
 *
 * 纯函数（唯一的职责是把 `reason` 翻成人话）：机制在 `sync-core` 的 `onRejected` 订阅者上，
 * 文案与 G1499 那条"派生表失败不许静默"的徽标同源＝「保存失败」。两枚 `reason` 不能混成一句：
 * `not_found` 是"你点的这行根本不存在／不归你"（越权与陈旧行），`stale` 是"这版比服务端旧"，
 * 把前者说成后者，用户会以为自己改名失败，而真相是他从来没有这行的写权限。
 */
export type RejectionCopy = { title: string; description: string };

const FAILURE_TITLE = '保存失败';

const TABLE_LABELS: Record<string, string> = {
  document: '文档',
  folder: '文件夹',
  whiteboard: '白板',
  collection: '集合',
  task: '待办',
  tag: '标签',
  favorite: '收藏',
  comment: '评论',
  notification: '通知',
};

function label(table: string): string {
  return TABLE_LABELS[table] ?? table;
}

export function rejectionCopy(rejected: SyncRejection[]): RejectionCopy | null {
  if (rejected.length === 0) return null;
  const missing = rejected.filter(r => r.reason === 'not_found');
  if (missing.length > 0) {
    const names = [...new Set(missing.map(r => label(r.table)))];
    return { title: FAILURE_TITLE, description: `${names.join('、')}不存在或不属于你` };
  }
  // G1629：坏值不是"旧"也不是"没权限"——那笔改动已被丢掉（客户端会按拒收回执把它盖回本地），
  // 说成竞态会让用户反复重试一个永远不成功的动作。
  const invalid = rejected.filter(r => r.reason === 'invalid');
  if (invalid.length > 0) {
    const names = [...new Set(invalid.map(r => label(r.table)))];
    return { title: FAILURE_TITLE, description: `${names.join('、')}的改动包含服务端无法识别的数据，已丢弃` };
  }
  return { title: FAILURE_TITLE, description: '这台设备的改动比服务端旧，已按服务端的版本显示' };
}
