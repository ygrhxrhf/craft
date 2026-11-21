import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { overlayMemberRows } from './member-rows';
import type { PendingRow } from './local-records';

/**
 * `gap.md` G1521 —— 移除协作者走内核之后，断链时那一行不能弹回来。
 * 服务端名册里那一行还在（还没推出去），只有本机 pending 的墓碑能把它从屏上摘掉。
 */
const row = (id: string, role = 'editor'): { id: string; userId: string; role: string } =>
  ({ id, userId: `u-${id}`, role });
const pending = (op: 'upsert' | 'delete', data?: Record<string, unknown>): PendingRow =>
  ({ op, data, syncTs: '2026-10-15T06:00:00.000Z' });

describe('overlayMemberRows（G1521）', () => {
  it('本机墓碑把服务端那一行从名册里摘掉（断链时"移除"当场生效）', () => {
    const out = overlayMemberRows([row('m-1'), row('m-2')], new Map([['m-1', pending('delete')]]));
    expect(out.map((r) => r.id)).toEqual(['m-2']);
  });

  it('本机改权限以 pending 覆盖服务端那一行的 role', () => {
    const out = overlayMemberRows(
      [row('m-1', 'editor')],
      new Map([['m-1', pending('upsert', { role: 'viewer' })]]),
    );
    expect(out[0]!.role).toBe('viewer');
  });

  it('无 pending ⇒ 原样返回', () => {
    const rows = [row('m-1'), row('m-2')];
    expect(overlayMemberRows(rows, new Map())).toEqual(rows);
  });

  it('不给 opts 时本机新建仍不进名册（老调用点的行为不变）', () => {
    const out = overlayMemberRows(
      [row('m-1')],
      new Map([['m-new', pending('upsert', { documentId: 'd', userId: 'u-new', role: 'editor' })]]),
    );
    expect(out.map((r) => r.id)).toEqual(['m-1']);
  });
});

/**
 * G1520 的本机新建那一支：邀请走内核后，服务端名册还没有那一行，而 `applyLocal` 触发的
 * `onStoreChanged('document_member')` 重读只叠删除/改权限，会把刚进 state 的行冲掉。
 * 新建行只带得住 userId ⇒ 显示名来自 G1507/G1520 那枚缓存。
 */
describe('overlayMemberRows 的本机新建支（G1520）', () => {
  const newMember = pending('upsert', { documentId: 'd-1', userId: 'u-new', role: 'commenter' });
  const displayOf = (userId: string) =>
    userId === 'u-new' ? { name: '缓存协作者乙', email: 'b@example.com' } : null;

  it('服务端没有、显示名学得到的本机新建行要补进名册（否则离线邀请的行会被重读冲掉）', () => {
    const out = overlayMemberRows([row('m-1')], new Map([['m-new', newMember]]), {
      documentId: 'd-1',
      displayOf,
    });
    expect(out.map((r) => r.id)).toEqual(['m-1', 'm-new']);
    expect(out[1]).toMatchObject({
      userId: 'u-new',
      role: 'commenter',
      name: '缓存协作者乙',
      email: 'b@example.com',
    });
  });

  it('显示名学不到的那一枚不收（名册里一行没名字比暂不出现更糟）', () => {
    const out = overlayMemberRows([], new Map([['m-new', newMember]]), {
      documentId: 'd-1',
      displayOf: () => null,
    });
    expect(out).toEqual([]);
  });

  it('别篇文档的 pending 成员行不会被端进这一篇', () => {
    const out = overlayMemberRows([], new Map([['m-new', newMember]]), {
      documentId: 'd-2',
      displayOf,
    });
    expect(out).toEqual([]);
  });

  it('服务端已有同一枚人（另一个 id、pending 还没 ack）⇒ 不重复加一行', () => {
    const server = [{ id: 'm-server', userId: 'u-new', role: 'editor' }];
    const out = overlayMemberRows(server, new Map([['m-new', newMember]]), {
      documentId: 'd-1',
      displayOf,
    });
    expect(out.map((r) => r.id)).toEqual(['m-server']);
  });

  it('本机墓碑同样作用于新建行：先建后删，重读后不留行', () => {
    const out = overlayMemberRows([], new Map([['m-new', { ...newMember, op: 'delete' }]]), {
      documentId: 'd-1',
      displayOf,
    });
    expect(out).toEqual([]);
  });
});

describe('接线闸：成员面板走内核并订阅（G1521）', () => {
  const src = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');

  it('移除协作者走 applyLocal（patch:null ＝ 删除 op），不再直连服务端 action', () => {
    const s = src('src/components/editor/tabs/MembersSection.tsx');
    expect(s).toContain("applyLocal({ table: 'document_member', id, patch: null })");
    expect(s).not.toContain('removeDocumentMember');
  });

  it('名册叠本机 pending（断链时移除的那一行留得住；本机新建的行也补得回来）', () => {
    const s = src('src/components/editor/tabs/MembersSection.tsx');
    expect(s).toContain("readPendingRows('document_member')");
    expect(s).toContain('overlayMemberRows(server, pending, {');
    expect(s).toContain('hydrateUserDisplay()');
    expect(s).toContain('displayOf: userDisplayOf');
  });

  it('面板订阅 document_member 的 store 变化并重读名册', () => {
    const s = src('src/components/editor/tabs/MembersSection.tsx');
    expect(
      /getSyncManager\(\)\.onStoreChanged\(\(table\) => \{\s*if \(table !== 'document_member'\) return;[\s\S]*?reload\(\)/.exec(s)?.[0],
      '成员面板没订阅 document_member＝他端增删成员时开着的信息面板不翻新',
    ).toBeTruthy();
  });
});
