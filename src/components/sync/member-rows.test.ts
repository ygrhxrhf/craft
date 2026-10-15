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

  it('pending 里有服务端没有的 id（本机新建）不进名册——那一支由 resolveDocumentMember 的返回值直接进 state', () => {
    const out = overlayMemberRows(
      [row('m-1')],
      new Map([['m-new', pending('upsert', { documentId: 'd', userId: 'u-new', role: 'editor' })]]),
    );
    expect(out.map((r) => r.id)).toEqual(['m-1']);
  });
});

describe('接线闸：成员面板走内核并订阅（G1521）', () => {
  const src = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');

  it('移除协作者走 applyLocal（patch:null ＝ 删除 op），不再直连服务端 action', () => {
    const s = src('src/components/editor/tabs/MembersSection.tsx');
    expect(s).toContain("applyLocal({ table: 'document_member', id, patch: null })");
    expect(s).not.toContain('removeDocumentMember');
  });

  it('名册叠本机 pending（断链时移除的那一行留得住）', () => {
    const s = src('src/components/editor/tabs/MembersSection.tsx');
    expect(s).toContain("readPendingRows('document_member')");
    expect(s).toContain('overlayMemberRows(server, pending)');
  });

  it('面板订阅 document_member 的 store 变化并重读名册', () => {
    const s = src('src/components/editor/tabs/MembersSection.tsx');
    expect(
      /getSyncManager\(\)\.onStoreChanged\(\(table\) => \{\s*if \(table !== 'document_member'\) return;[\s\S]*?reload\(\)/.exec(s)?.[0],
      '成员面板没订阅 document_member＝他端增删成员时开着的信息面板不翻新',
    ).toBeTruthy();
  });
});
