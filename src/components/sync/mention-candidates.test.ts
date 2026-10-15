import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

// 被测的是纯函数；同源那一枚的两次外部读（服务端 action 与本地库）都不该在单测里真跑。
vi.mock('@/actions/document/members', () => ({ listMentionCandidates: vi.fn() }));
vi.mock('./local-records', () => ({ readPendingRows: vi.fn(), readUserDisplayCache: vi.fn(async () => null) }));

import { overlayMentionCandidates } from './mention-candidates';
import type { PendingRow } from './local-records';
import type { MentionCandidate } from '@/actions/document/members';

const DOC = 'doc-1';
const row = (data: Record<string, unknown>): PendingRow => ({ op: 'upsert', data, syncTs: '2026-10-15T02:00:00.000Z' });
const tombstone = (data: Record<string, unknown>): PendingRow => ({ op: 'delete', data, syncTs: '2026-10-15T02:00:00.000Z' });
const owner: MentionCandidate = { userId: 'u-owner', name: '发起者甲', email: 'owner@example.com' };
const display = (map: Record<string, { name: string | null; email: string }>) => (userId: string) => map[userId] ?? null;

describe('overlayMentionCandidates（G1507）', () => {
  it('本机刚邀请、还没推出去的那位进得了候选', () => {
    const out = overlayMentionCandidates(
      [owner],
      new Map([['m-new', row({ documentId: DOC, userId: 'u-peer', role: 'editor' })]]),
      DOC,
      display({ 'u-peer': { name: '协作者乙', email: 'peer@example.com' } }),
    );
    expect(out.map((c) => c.userId)).toEqual(['u-owner', 'u-peer']);
    expect(out[1]).toEqual({ userId: 'u-peer', name: '协作者乙', email: 'peer@example.com' });
  });

  it('别篇文档的成员不会被端进这一篇', () => {
    const out = overlayMentionCandidates(
      [owner],
      new Map([['m-other', row({ documentId: 'doc-2', userId: 'u-outsider', role: 'viewer' })]]),
      DOC,
      display({ 'u-outsider': { name: '路人丙', email: 'out@example.com' } }),
    );
    expect(out.map((c) => c.userId)).toEqual(['u-owner']);
  });

  it('改权限那种只带 role 的 patch 不新增任何人（那个人本来就在服务端名单里）', () => {
    const out = overlayMentionCandidates(
      [owner],
      new Map([['m-role', row({ role: 'commenter' })]]),
      DOC,
      display({}),
    );
    expect(out).toEqual([owner]);
  });

  it('服务端已有的行叠本机意图时不产生第二枚同一个人的候选', () => {
    const out = overlayMentionCandidates(
      [owner],
      new Map([['m-owner', row({ documentId: DOC, userId: 'u-owner', role: 'editor' })]]),
      DOC,
      display({ 'u-owner': { name: '另一个名字', email: 'other@example.com' } }),
    );
    expect(out).toEqual([owner]);
  });

  it('墓碑行不进候选', () => {
    const out = overlayMentionCandidates(
      [],
      new Map([['m-gone', tombstone({ documentId: DOC, userId: 'u-peer' })]]),
      DOC,
      display({ 'u-peer': { name: '协作者乙', email: 'peer@example.com' } }),
    );
    expect(out).toEqual([]);
  });

  it('显示名学不到时宁可不收：一枚标不出名字的 chip 比"暂时不在名单里"更糟', () => {
    const out = overlayMentionCandidates(
      [],
      new Map([['m-unknown', row({ documentId: DOC, userId: 'u-peer', role: 'editor' })]]),
      DOC,
      display({}),
    );
    expect(out).toEqual([]);
  });

  it('服务端名单一行不掉、顺序在前，本机新增排在后面', () => {
    const peer: MentionCandidate = { userId: 'u-peer', name: '协作者乙', email: 'peer@example.com' };
    const out = overlayMentionCandidates(
      [owner, peer],
      new Map([['m-third', row({ documentId: DOC, userId: 'u-third', role: 'viewer' })]]),
      DOC,
      display({ 'u-third': { name: '第三位', email: 'third@example.com' } }),
    );
    expect(out.map((c) => c.userId)).toEqual(['u-owner', 'u-peer', 'u-third']);
  });
});

describe('接线闸：两处 `@` 与邀请那一路都接到同源上（G1507）', () => {
  const src = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');

  it('正文的 `@` 菜单走 loadMentionCandidates，不再裸读服务端名单', () => {
    const s = src('src/components/editor/extensions/mention-user-menu.tsx');
    expect(s).toContain('loadMentionCandidates(documentId)');
    expect(s).not.toContain('listMentionCandidates(documentId)');
  });

  it('评论框的 `@` 补全走同一枚（同因同修，不许只修正文那一半）', () => {
    const s = src('src/components/editor/comments/MentionSuggest.tsx');
    expect(s).toContain('loadMentionCandidates(documentId)');
    expect(s).not.toContain('listMentionCandidates(documentId)');
  });

  it('邀请那一路把学到的显示名记进缓存，并落进内核（G1520）', () => {
    const s = src('src/components/editor/tabs/MembersSection.tsx');
    expect(s).toContain('rememberUserDisplay({ userId: resolved.userId');
    expect(s, '邀请后没落库＝刷新页面后那条 pending 行标不出名字（G1520）').toContain('persistUserDisplay()');
  });

  it('读候选前先 hydrate 落库的显示名（G1520）', () => {
    const s = src('src/components/sync/mention-candidates.ts');
    expect(s).toContain('await hydrateUserDisplay()');
  });

  it('同源那一枚读的是 document_member 的 pending（不是别的表，也不是全量镜像）', () => {
    const s = src('src/components/sync/mention-candidates.ts');
    expect(s).toContain("readPendingRows('document_member')");
  });
});

describe('接线闸：评论 `@` 随 store 变化重读候选（G1519）', () => {
  const src = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');

  it('评论补全订阅 document_member 的 store 变化并重读（挂载后新邀的人当场进候选）', () => {
    const s = src('src/components/editor/comments/MentionSuggest.tsx');
    expect(
      /getSyncManager\(\)\.onStoreChanged\(\(table\) => \{\s*if \(table !== 'document_member'\) return;[\s\S]*?refresh\(\)/.exec(s)?.[0],
      '评论 `@` 没订阅 document_member＝挂着评论框时新邀的人要整页重载才进候选（G1519）',
    ).toBeTruthy();
  });

  it('重读走的是同源那一枚 loadMentionCandidates（不是裸读服务端名单）', () => {
    const s = src('src/components/editor/comments/MentionSuggest.tsx');
    expect(s).toContain('loadMentionCandidates(documentId)');
    expect(s).not.toContain('listMentionCandidates(documentId)');
  });
});
