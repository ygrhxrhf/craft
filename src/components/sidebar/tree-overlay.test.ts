// src/components/sidebar/tree-overlay.test.ts
// I3：三树 loader 的离线兜底——服务端 action 失败（离线/RSC 失败）时，
// 不能让 Promise 悬空把树卡死在「加载中...」；退化为「旧行 + readPendingRows overlay」。
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDocuments } from '@/actions/document/get';
import { getFolders } from '@/actions/folder/get';
import { getWhiteboards } from '@/actions/whiteboard/whiteboard';
import { readPendingRows } from '@/components/sync/local-records';

vi.mock('@/actions/document/get', () => ({ getDocuments: vi.fn(), getDeletedDocuments: vi.fn() }));
vi.mock('@/actions/folder/get', () => ({ getFolders: vi.fn() }));
vi.mock('@/actions/whiteboard/whiteboard', () => ({
  getWhiteboards: vi.fn(),
  getWhiteboard: vi.fn(),
  createWhiteboard: vi.fn(),
  renameWhiteboard: vi.fn(),
  saveWhiteboardData: vi.fn(),
  deleteWhiteboard: vi.fn(),
}));
// 树组件的渲染依赖（next-auth/next-navigation/重子组件）不进本测试模块图
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: null }) }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
}));
vi.mock('./DocumentTreeItem', () => ({ DocumentTreeItem: () => null }));
vi.mock('./FolderTreeItem', () => ({ FolderTreeItem: () => null }));
vi.mock('@/components/sync/local-records', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/sync/local-records')>();
  return { ...actual, readPendingRows: vi.fn(async () => new Map()) };
});

import { overlayDocumentRows, safeLoadTreeDocuments } from './DocumentTree';
import { overlayFolderRows, safeLoadTreeFolders } from './FolderTree';
import { overlayWhiteboardRows, safeLoadWhiteboards } from './WhiteboardTree';

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

describe('I3 DocumentTree 离线兜底', () => {
  beforeEach(() => vi.clearAllMocks());

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

  it('safeLoadTreeDocuments：服务端 action 失败 → 旧行 + pending overlay（不抛、不悬空）', async () => {
    (getDocuments as any).mockRejectedValue(new Error('offline'));
    (readPendingRows as any).mockResolvedValue(new Map([
      ['n', { op: 'upsert' as const, data: { title: '离线新建的文档' }, syncTs: 't' }],
    ]));

    const rows = await safeLoadTreeDocuments([doc('old', '旧行')]);

    expect(rows.map((d) => d.id)).toEqual(['old', 'n']);
    expect(rows[1]!.title).toBe('离线新建的文档');
  });

  it('safeLoadTreeDocuments：在线时走服务端新鲜行', async () => {
    (getDocuments as any).mockResolvedValue([doc('fresh', '新鲜行')]);
    (readPendingRows as any).mockResolvedValue(new Map());

    const rows = await safeLoadTreeDocuments([doc('old', '旧行')]);
    expect(rows.map((d) => d.id)).toEqual(['fresh']);
  });
});

describe('I3 FolderTree 离线兜底', () => {
  beforeEach(() => vi.clearAllMocks());

  it('overlayFolderRows：pending 覆盖 + isDeleted 过滤（与 getFolders 同条件）', () => {
    const pending = new Map([
      ['f1', { op: 'upsert' as const, data: { name: '本地新名' }, syncTs: 't' }],
      ['dead', { op: 'upsert' as const, data: { isDeleted: true }, syncTs: 't' }],
    ]);
    const out = overlayFolderRows([folder('f1', '旧名'), folder('dead', '将删')], pending);
    expect(out).toHaveLength(1);
    expect(out[0]!.name).toBe('本地新名');
  });

  it('safeLoadTreeFolders：服务端 action 失败 → 旧行 + pending overlay', async () => {
    (getFolders as any).mockRejectedValue(new Error('offline'));
    (readPendingRows as any).mockResolvedValue(new Map([
      ['f2', { op: 'upsert' as const, data: { name: '离线新建的文件夹' }, syncTs: 't' }],
    ]));

    const rows = await safeLoadTreeFolders([folder('f1', '旧行')]);
    expect(rows.map((f) => f.id)).toEqual(['f1', 'f2']);
    expect(rows[1]!.name).toBe('离线新建的文件夹');
  });
});

describe('I3 WhiteboardTree 离线兜底', () => {
  beforeEach(() => vi.clearAllMocks());

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

  it('safeLoadWhiteboards：服务端 action 失败 → 旧行 + pending overlay（不再无人 catch）', async () => {
    (getWhiteboards as any).mockRejectedValue(new Error('offline'));
    (readPendingRows as any).mockResolvedValue(new Map([
      ['w2', { op: 'upsert' as const, data: { name: '离线新建的白板' }, syncTs: 't' }],
    ]));

    const rows = await safeLoadWhiteboards([board('w1', '旧行')]);
    expect(rows.map((b) => b.id)).toEqual(['w1', 'w2']);
    expect(rows[1]!.name).toBe('离线新建的白板');
  });
});
