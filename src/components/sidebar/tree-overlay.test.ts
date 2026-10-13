// src/components/sidebar/tree-overlay.test.ts
// 三树的离线 overlay 纯函数：服务端行集合 + 本地 pending 意图 → 即时视图。
// 取数本身已并入 useSidebarSnapshot（单次批量请求），不再有每棵树各自的 safeLoad* loader。
import { describe, it, expect, vi } from 'vitest';

// 树组件的渲染依赖（next-auth/next-navigation/重子组件）不进本测试模块图
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: null }) }));
vi.mock('next-auth', () => ({ default: () => ({}) }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
}));
vi.mock('./DocumentTreeItem', () => ({ DocumentTreeItem: () => null }));
vi.mock('./FolderTreeItem', () => ({ FolderTreeItem: () => null }));

import { overlayDocumentRows } from './DocumentTree';
import { overlayFolderRows } from './FolderTree';
import { overlayWhiteboardRows } from './WhiteboardTree';

const doc = (id: string, title: string) => ({
  id, title, icon: null, parentId: null, folderId: null,
  isDeleted: false, isDailyNote: false, updatedAt: 't', order: 0,
});
const folder = (id: string, name: string) => ({
  id, name, icon: null, parentId: null, order: 0, isDeleted: false,
});
const board = (id: string, name: string) => ({
  id, name, icon: null, updatedAt: 't',
});

describe('DocumentTree overlay', () => {
  it('overlayDocumentRows：pending upsert 覆盖/新增、delete 丢行，过滤同服务端路径', () => {
    const pending = new Map([
      ['d1', { op: 'upsert' as const, data: { title: '本地新名' }, syncTs: 't' }],
      ['d2', { op: 'delete' as const, syncTs: 't' }],
      ['new', { op: 'upsert' as const, data: { title: '离线新建' }, syncTs: 't' }],
    ]);
    const out = overlayDocumentRows(
      [doc('d1', '旧名'), doc('d2', '将删除'), { ...doc('dx', '回收站'), isDeleted: true }],
      pending,
    );
    expect(out.map((d) => d.id)).toEqual(['d1', 'new']);
    expect(out[0]!.title).toBe('本地新名');
    expect(out[1]!.title).toBe('离线新建');
  });
});

describe('FolderTree overlay', () => {
  it('overlayFolderRows：pending 覆盖 + isDeleted 过滤（与 getFolders 同条件）', () => {
    const pending = new Map([
      ['f1', { op: 'upsert' as const, data: { name: '本地新名' }, syncTs: 't' }],
      ['dead', { op: 'upsert' as const, data: { isDeleted: true }, syncTs: 't' }],
    ]);
    const out = overlayFolderRows([folder('f1', '旧名'), folder('dead', '将删')], pending);
    expect(out).toHaveLength(1);
    expect(out[0]!.name).toBe('本地新名');
  });
});

describe('WhiteboardTree overlay', () => {
  it('overlayWhiteboardRows：pending 改名覆盖 + isDeleted 过滤', () => {
    const pending = new Map([
      ['w1', { op: 'upsert' as const, data: { name: '本地新名' }, syncTs: 't' }],
      ['gone', { op: 'upsert' as const, data: { isDeleted: true }, syncTs: 't' }],
    ]);
    const out = overlayWhiteboardRows(
      [board('w1', '旧名'), board('gone', '已删') as any],
      pending,
    );
    expect(out).toHaveLength(1);
    expect(out[0]!.name).toBe('本地新名');
  });
});
