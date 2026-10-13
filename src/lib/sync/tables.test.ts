import { describe, it, expect } from 'vitest';
import { SYNC_TABLES } from './tables';

describe('SYNC_TABLES coverage (R-9)', () => {
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
      'whiteboard',
    ];
    for (const t of expected) expect(tables).toContain(t);
    expect(tables.length).toBe(new Set(tables).size); // 无重复
  });
});
