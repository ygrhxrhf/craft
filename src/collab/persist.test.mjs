// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import 'dotenv/config';
import * as Y from 'yjs';
import { deriveSnapshot, isRoomName, loadState, storeState } from './persist.mjs';

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)('collab room persistence', () => {
  let documentId;

  beforeAll(async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const mod = await import('@prisma/orm-postgres/runtime');
    const contractJson = JSON.parse(
      fs.readFileSync(path.resolve('src/prisma/contract.json'), 'utf8'),
    );
    const db = await mod.default({ contractJson, url: process.env.DATABASE_URL });
    // CI 的库是干净的：这里自备一行用户，别依赖有人先跑过种子脚本。
    const email = 'craft-test@example.com';
    const existing = await db.orm.public.User.first({ email });
    const user =
      existing ??
      (await db.orm.public.User.create({
        id: crypto.randomUUID(),
        email,
        password: 'ci-only-placeholder',
        name: 'Craft Test',
      }));
    const doc = await db.orm.public.Document.create({
      id: crypto.randomUUID(),
      title: 'persistence probe',
      userId: user.id,
    });
    documentId = doc.id;
  });

  afterAll(async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const mod = await import('@prisma/orm-postgres/runtime');
    const contractJson = JSON.parse(
      fs.readFileSync(path.resolve('src/prisma/contract.json'), 'utf8'),
    );
    const db = await mod.default({ contractJson, url: process.env.DATABASE_URL });
    await db.orm.public.Document.where({ id: documentId }).delete();
  });

  it('accepts only uuid room names', () => {
    expect(isRoomName(documentId)).toBe(true);
    expect(isRoomName('../../etc/passwd')).toBe(false);
    expect(isRoomName('anyone-else-s-room')).toBe(false);
  });

  it('round-trips a ydoc update through storage', async () => {
    expect(await loadState(documentId)).toBeNull();

    const ydoc = new Y.Doc();
    ydoc.getText('probe').insert(0, '服务端持久化内容');
    await storeState(documentId, Y.encodeStateAsUpdate(ydoc));

    const restored = await loadState(documentId);
    expect(restored).toBeInstanceOf(Uint8Array);

    const reopened = new Y.Doc();
    Y.applyUpdate(reopened, restored);
    expect(reopened.getText('probe').toString()).toBe('服务端持久化内容');
  });

  it('ignores stores for unknown rooms', async () => {
    const missing = crypto.randomUUID();
    await storeState(missing, new Uint8Array([1, 2, 3]));
    expect(await loadState(missing)).toBeNull();
  });
});

/**
 * 空房间判定（导入丢正文缺陷）：y-sync 绑定就把「一枚空段落」写进房间，只判
 * `length === 0` 会让还没播种的房间把 `Document.content` 镜像清空。
 */
describe('deriveSnapshot empty-room guards', () => {
  const stateOf = (fill) => {
    const doc = new Y.Doc();
    fill(doc.getXmlFragment('default'));
    return Y.encodeStateAsUpdate(doc);
  };

  it('returns null for a fresh room', () => {
    expect(deriveSnapshot(stateOf(() => {}))).toBeNull();
  });

  it('returns null when the room only holds the bind-time empty paragraph', () => {
    expect(deriveSnapshot(stateOf((fragment) => fragment.insert(0, [new Y.XmlElement('paragraph')])))).toBeNull();
  });

  it('returns null for the scaffold run of blank paragraphs (incl. trailing node)', () => {
    expect(
      deriveSnapshot(stateOf((fragment) => fragment.insert(0, [new Y.XmlElement('paragraph'), new Y.XmlElement('paragraph')]))),
    ).toBeNull();
  });

  it('derives the mirror once the room has text', () => {
    const doc = new Y.Doc();
    const fragment = doc.getXmlFragment('default');
    const paragraph = new Y.XmlElement('paragraph');
    paragraph.insert(0, [new Y.XmlText('正文')]);
    fragment.insert(0, [paragraph]);
    const snapshot = deriveSnapshot(Y.encodeStateAsUpdate(doc));
    expect(snapshot?.content).toMatchObject({ type: 'doc' });
    expect(snapshot?.plainText).toBe('正文');
  });
});
