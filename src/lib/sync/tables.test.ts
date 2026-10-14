import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SYNC_TABLES } from './tables';

/**
 * `gap.md` G03 的教训：设置面板的开关是乐观绘制＋`applyLocal`，而 `applyLocal` 的
 * payload 在服务端与 `def.cols` **求交**——白名单漏一列，那一列就在两个方向上都永远
 * 到不了库，屏上却已经改完了。这条闸从 `Preferences` 那个类型里现读键名，
 * 所以"加了偏好列忘了加白名单"从下一次起当场红（此前 `user` 那行从没被钉过）。
 */
function preferenceColumns(): string[] {
  const src = readFileSync(join(process.cwd(), 'src', 'actions', 'user', 'preferences.ts'), 'utf8');
  const block = /export type Preferences = \{([\s\S]*?)\n\};/.exec(src);
  if (!block) throw new Error('找不到 Preferences 类型＝判据失效，请复核这条闸');
  return [...block[1].matchAll(/^\s*(\w+)\s*:/gm)].map((m) => m[1]);
}

describe('SYNC_TABLES coverage (R-9)', () => {
  it('user 的白名单覆盖设置面板能写的每一列偏好（G03）', () => {
    const user = SYNC_TABLES.find((d) => d.table === 'user');
    expect(user).toBeDefined();
    const prefs = preferenceColumns();
    expect(prefs.length).toBeGreaterThanOrEqual(6);
    for (const col of prefs) expect(user!.cols, `${col} 不在 user.cols ⇒ 它永远出不了这台设备`).toContain(col);
  });

  it('注册 whiteboard 表：tsCol=metaUpdatedAt，payload 排除 data', () => {
    const wb = SYNC_TABLES.find(d => d.table === 'whiteboard');
    expect(wb).toBeDefined();
    expect(wb!.model).toBe('Whiteboard');
    expect(wb!.tsCol).toBe('metaUpdatedAt');
    expect(wb!.cols).toEqual([
      'id', 'name', 'shareToken', 'isDeleted', 'deletedAt', 'createdAt', 'updatedAt',
    ]);
    expect(wb!.cols).not.toContain('data'); // spec: whiteboard payload excludes data
    expect(wb!.id({ id: 'wb-1' })).toBe('wb-1');
  });

  it('注册 document_member：tsCol=updatedAt，列为 contract 实际字段（无 deletedAt）', () => {
    const m = SYNC_TABLES.find(d => d.table === 'document_member');
    expect(m).toBeDefined();
    expect(m!.model).toBe('DocumentMember');
    expect(m!.tsCol).toBe('updatedAt');
    expect(m!.cols).toEqual([
      'id', 'documentId', 'userId', 'role', 'addedBy', 'createdAt', 'updatedAt',
    ]);
    expect(m!.cols).not.toContain('deletedAt');
    expect(m!.id({ id: 'mem-1' })).toBe('mem-1');
  });

  it('注册 notification 表：model=Notification，tsCol=updatedAt，payload 取 contract 全列', () => {
    const n = SYNC_TABLES.find(d => d.table === 'notification');
    expect(n).toBeDefined();
    expect(n!.model).toBe('Notification');
    expect(n!.tsCol).toBe('updatedAt');
    expect(n!.cols).toEqual([
      'id', 'userId', 'kind', 'taskId', 'documentId', 'title',
      'remindAt', 'isResolved', 'resolvedAt', 'createdAt', 'updatedAt',
    ]);
    expect(n!.id({ id: 'ntf-1' })).toBe('ntf-1');
  });

  it('folder cols 包含 id（spec 5.1 全列，payload data 需带 id）', () => {
    const folder = SYNC_TABLES.find(d => d.table === 'folder');
    expect(folder).toBeDefined();
    expect(folder!.cols).toContain('id');
  });

  it('brief Step 7 的所有表组仍在注册表（无移除）', () => {
    const tables = SYNC_TABLES.map(d => d.table);
    const expected = [
      'document', 'folder', 'tag', 'document_tag', 'favorite', 'task',
      'daily_notes_config', 'user',
      'collection', 'collection_item', 'collection_property', 'collection_value', 'collection_view',
      'comment', 'comment_thread', 'document_share', 'document_member',
      'notification',
      'whiteboard',
    ];
    for (const t of expected) expect(tables).toContain(t);
    expect(tables.length).toBe(new Set(tables).size); // 无重复
  });
});
