import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/prisma/db', () => ({ getDb: vi.fn() }));
vi.mock('@/lib/authz/guard', () => ({ requireUserId: vi.fn(async () => 'u1') }));
vi.mock('@/lib/authz/document-access', () => ({ requireDocumentAccess: vi.fn(async () => true) }));

import { getDb } from '@/prisma/db';
import { updateDocument } from './update';

function mockDb() {
  const update = vi.fn(async (_data?: Record<string, unknown>) => ({} as Record<string, unknown>));
  const create = vi.fn(async (_data?: Record<string, unknown>) => ({}));
  const first = vi.fn(async () => null);
  const all = vi.fn(async () => []);
  const chain = { where: () => chain, update, create, first, all,
    orderBy: () => chain, limit: () => chain };
  (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, {
    get: (_t, m: string) => m === 'SyncEvent' ? { create } : chain,
  }) } });
  return { update, create, first, all };
}

describe('updateDocument 字段白名单（spec 4.2/5.6）', () => {
  beforeEach(() => vi.clearAllMocks());

  it('正文保存不写 metaUpdatedAt、不发 sync_events', async () => {
    const db = mockDb();
    await updateDocument('doc1', { content: [{ type: 'p' }], plainText: 'hi', wordCount: 2, charCount: 2 });
    const arg = db.update.mock.calls[0]![0]!;
    expect(arg).not.toHaveProperty('metaUpdatedAt');
    expect(db.create).not.toHaveBeenCalled();      // 不 emit
  });

  it('元数据保存写 metaUpdatedAt 并 emit sync_events', async () => {
    const db = mockDb();
    await updateDocument('doc1', { title: '新标题' });
    const arg = db.update.mock.calls[0]![0]!;
    expect(arg.metaUpdatedAt).toEqual(expect.any(String));
    expect(db.create).toHaveBeenCalledTimes(1);    // emit
  });
});

/** 用「更新前 / 更新后」两份行喂 Document.first，其余表按需给值。 */
function mockDbWithRows(before: Record<string, unknown>, after: Record<string, unknown>, lastVersion: Record<string, unknown> | null) {
  const documentUpdate = vi.fn(async (_data?: Record<string, unknown>) => ({}));
  const versionCreate = vi.fn(async (_data?: Record<string, unknown>) => ({}));
  const syncCreate = vi.fn(async (_data?: Record<string, unknown>) => ({}));

  let documentFirstCall = 0;
  const makeChain = (kind: 'Document' | 'DocumentVersion' | 'SyncEvent') => {
    const chain: Record<string, unknown> = {};
    chain.where = () => chain;
    chain.orderBy = () => chain;
    chain.limit = () => chain;
    chain.update = kind === 'Document' ? documentUpdate : vi.fn(async () => ({}));
    chain.create = kind === 'DocumentVersion' ? versionCreate : vi.fn(async () => ({}));
    chain.all = async () => (kind === 'DocumentVersion' && lastVersion ? [lastVersion] : []);
    chain.first = async () => {
      if (kind !== 'Document') return null;
      // 第一次是更新前那一份，之后是更新后的。
      const row = documentFirstCall === 0 ? before : after;
      documentFirstCall += 1;
      return row;
    };
    return chain;
  };

  const publicSchema = new Proxy({} as Record<string, unknown>, {
    get: (_t, model: string) => makeChain(model as 'Document' | 'DocumentVersion' | 'SyncEvent'),
  });
  (getDb as any).mockResolvedValue({ orm: { public: publicSchema } });
  return { documentUpdate, versionCreate, syncCreate };
}

const row = (over: Record<string, unknown> = {}) => ({
  id: 'doc1',
  title: '甲',
  icon: null,
  coverImage: null,
  coverType: null,
  width: null,
  pageStyle: { theme: 'default' },
  content: { type: 'doc', content: [] },
  plainText: '',
  wordCount: 0,
  ...over,
});

describe('自动版本快照（改动判据）', () => {
  beforeEach(() => vi.clearAllMocks());

  it('改标题当场存一版，并把样式写进 meta', async () => {
    const db = mockDbWithRows(row(), row({ title: '乙', icon: '📄' }), null);
    await updateDocument('doc1', { title: '乙' });

    expect(db.versionCreate).toHaveBeenCalledTimes(1);
    const snapshot = db.versionCreate.mock.calls[0]![0]!;
    expect(snapshot.title).toBe('乙');
    expect(snapshot.meta).toEqual({
      icon: '📄',
      coverImage: null,
      coverType: null,
      width: null,
      pageStyle: { theme: 'default' },
    });
    // G18：快照落库后 Document.version 跟着走。
    expect(db.documentUpdate).toHaveBeenCalledWith({ version: 1 });
  });

  it('只改正文且十分钟窗口未到，不存新版', async () => {
    const recent = new Date(Date.now() - 60_000).toISOString();
    const db = mockDbWithRows(row(), row({ plainText: '一句', wordCount: 2 }), {
      version: 3,
      createdAt: recent,
      ...row(),
    });
    await updateDocument('doc1', { content: { type: 'doc' }, plainText: '一句', wordCount: 2 });

    expect(db.versionCreate).not.toHaveBeenCalled();
  });

  it('只改正文但窗口已过，存新版', async () => {
    const old = new Date(Date.now() - 11 * 60 * 1000).toISOString();
    const db = mockDbWithRows(row(), row({ plainText: '一句', wordCount: 2 }), {
      version: 3,
      createdAt: old,
      ...row(),
    });
    await updateDocument('doc1', { content: { type: 'doc' }, plainText: '一句', wordCount: 2 });

    expect(db.versionCreate).toHaveBeenCalledTimes(1);
    expect(db.versionCreate.mock.calls[0]![0]!.version).toBe(4);
    expect(db.documentUpdate).toHaveBeenCalledWith({ version: 4 });
  });

  it('什么都没动就不存版', async () => {
    const db = mockDbWithRows(row(), row(), null);
    await updateDocument('doc1', { charCount: 0 });

    expect(db.versionCreate).not.toHaveBeenCalled();
  });

  it('没有正文的文档存空正文那一版，不让 content 为 null', async () => {
    const db = mockDbWithRows(row({ content: null }), row({ content: null, title: '乙' }), null);
    await updateDocument('doc1', { title: '乙' });

    expect(db.versionCreate.mock.calls[0]![0]!.content).toEqual({ type: 'doc', content: [] });
  });
});
