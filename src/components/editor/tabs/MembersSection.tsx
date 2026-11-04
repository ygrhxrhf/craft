'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import {
  countMemberElsewhere,
  listDocumentMembers,
  resolveDocumentMember,
  revokeMemberEverywhere,
  type MemberRole,
} from '@/actions/document/members';
import { getSyncManager } from '@/lib/sync-core';
import { readPendingRows } from '@/components/sync/local-records';
import { findDocumentShare } from '@/components/sync/local-records';
import { overlayMemberRows } from '@/components/sync/member-rows';
import { rememberUserDisplay } from '@/components/sync/user-display';
import { persistUserDisplay } from '@/components/sync/user-display-persist';
import { memberRemovalNote } from '@/lib/share/member-access-notes';
import { revokeAcrossDocumentsPrompt } from '@/lib/share/document-scope';
import { SHARE_ERROR } from '@/lib/share/share-guards';
import { confirmDialog } from '@/lib/dialog/show';

interface MemberRow {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  role: MemberRole;
}

const ROLE_LABELS: Record<MemberRole, string> = {
  editor: '可编辑',
  commenter: '可评论',
  viewer: '只读',
};

const ROLES = Object.keys(ROLE_LABELS) as MemberRole[];

interface MembersSectionProps {
  documentId: string;
  /** Only the document owner may grant or revoke access. */
  canManage: boolean;
}

export function MembersSection({ documentId, canManage }: MembersSectionProps) {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('editor');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      const server = await listDocumentMembers(documentId);
      // G1521：叠本机未推送意图——"移除协作者"走内核之后断链时，服务端名册里那一行还在，
      // 只有本机 pending 的墓碑能把它从屏上摘掉（与 R-18 回收站叠法同源）。
      const pending = await readPendingRows('document_member');
      setMembers(overlayMemberRows(server, pending));
    } catch {
      setMembers([]);
    }
  }, [documentId]);

  useEffect(() => {
    void (async () => {
      await reload();
    })();
  }, [reload]);

  // G1521：本机增删改／他端推送／入站 ack+pull 触碰 document_member ⇒ 重读名册（同 TrashList.tsx:81）。
  useEffect(
    () =>
      getSyncManager().onStoreChanged((table) => {
        if (table !== 'document_member') return;
        void reload();
      }),
    [reload],
  );

  const message = (err: unknown, fallback: string) =>
    setError(err instanceof Error ? err.message : fallback);

  const handleAdd = async () => {
    if (!email.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      // 邮箱解析留在服务端（要查账号）；落库走 applyLocal，离线可排队
      const resolved = await resolveDocumentMember({ documentId, email, role });
      // G1507：成员行的同步列里没有姓名/邮箱 ⇒ 把这一发当场学到的显示名记下来，
      // 正文那枚 `@` 叠 pending 时才标得出这位刚授权的人。
      rememberUserDisplay({ userId: resolved.userId, name: resolved.name, email: resolved.email });
      // G1520：顺手把缓存落进内核，刷新后 @ 名单里那枚人不再丢（pending 还没推上去时尤其）。
      persistUserDisplay();
      await getSyncManager().applyLocal({
        table: 'document_member',
        id: resolved.id,
        patch: resolved.existing
          ? { role: resolved.role }
          : {
              documentId,
              userId: resolved.userId,
              role: resolved.role,
              addedBy: resolved.addedBy,
            },
      });
      setEmail('');
      const row: MemberRow = {
        id: resolved.id,
        userId: resolved.userId,
        name: resolved.name,
        email: resolved.email,
        role: resolved.role,
      };
      setMembers((prev) => [...prev.filter((m) => m.id !== row.id), row]);
    } catch (err) {
      message(err, SHARE_ERROR.addPermission);
    } finally {
      setBusy(false);
    }
  };

  const handleRoleChange = async (id: string, next: MemberRole) => {
    setError(null);
    const previous = members.find((m) => m.id === id)?.role;
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role: next } : m)));
    try {
      await getSyncManager().applyLocal({
        table: 'document_member',
        id,
        patch: { role: next },
      });
    } catch (err) {
      if (previous) {
        setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role: previous } : m)));
      }
      message(err, SHARE_ERROR.changePermission);
    }
  };

  const handleRemove = async (id: string) => {
    setError(null);
    const target = members.find((m) => m.id === id);
    // G85：链接档是 edit 时，移除个人条目**不代表**他失去编辑权 ⇒ 先给官方那句解释再动手
    //   （权限是多路叠加的）。view 档、或镜像里还没有这一行，照常移除、不打扰。
    const share = await findDocumentShare(documentId).catch(() => null);
    const note = memberRemovalNote(share?.permission);
    if (note) {
      const confirmed = await confirmDialog({ title: note, confirmLabel: '移除' });
      if (!confirmed) return;
    }
    const previous = members;
    setMembers((prev) => prev.filter((m) => m.id !== id));
    try {
      // G1521：移除协作者改走内核（patch:null ＝ 删除 op），断链时也留得住；服务端按
      // document_member 无 deletedAt 列走硬删（route.ts 的墓碑分支按 cols 分档）。
      await getSyncManager().applyLocal({ table: 'document_member', id, patch: null });
    } catch (err) {
      setMembers(previous);
      message(err, SHARE_ERROR.deletePermission);
      return;
    }
    // G138：移除是**两问合一**——此人在我别的文档里还有单独授权时，再问一句要不要一并撤销；
    // 答"是"就把那些授权行也删掉（服务端只动调用者拥有的文档）。
    if (!target) return;
    try {
      const elsewhere = await countMemberElsewhere(documentId, target.userId);
      const prompt = revokeAcrossDocumentsPrompt(elsewhere);
      if (!prompt) return;
      const revokeAll = await confirmDialog(prompt);
      if (!revokeAll) return;
      await revokeMemberEverywhere(target.userId);
      // 那些行在别的文档里，本屏看不到；内核那几张镜像表挂在同一库上，重读一次即可。
      await reload();
    } catch (err) {
      message(err, SHARE_ERROR.deletePermission);
    }
  };

  return (
    <section>
      <h4 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
        协作者{members.length > 0 ? ` (${members.length})` : ''}
      </h4>

      <div className="space-y-1">
        {members.map((member) => (
          <div key={member.id} className="flex items-center gap-2 rounded-md px-2 py-1.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] uppercase text-muted-foreground">
              {(member.name || member.email).slice(0, 1)}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px]">
              {member.name || member.email}
            </span>
            {canManage ? (
              <>
                <select
                  aria-label={`协作者权限：${member.email}`}
                  value={member.role}
                  onChange={(e) => void handleRoleChange(member.id, e.target.value as MemberRole)}
                  className="h-6 rounded border border-input bg-transparent px-1 text-[11px] outline-none focus:border-ring"
                >
                  {ROLES.map((option) => (
                    <option key={option} value={option}>
                      {ROLE_LABELS[option]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label={`移除协作者 ${member.email}`}
                  onClick={() => void handleRemove(member.id)}
                  className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="size-3.5" />
                </button>
              </>
            ) : (
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {ROLE_LABELS[member.role]}
              </span>
            )}
          </div>
        ))}
      </div>

      {canManage && (
        <div className="mt-2 flex items-center gap-1.5">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleAdd();
            }}
            placeholder="邮箱地址"
            aria-label="协作者邮箱"
            className="h-7 min-w-0 flex-1 rounded-md border border-input bg-transparent px-2 text-[12px] outline-none focus:border-ring"
          />
          <select
            aria-label="新增协作者权限"
            value={role}
            onChange={(e) => setRole(e.target.value as MemberRole)}
            className="h-7 shrink-0 rounded-md border border-input bg-transparent px-1 text-[11px] outline-none focus:border-ring"
          >
            {ROLES.map((option) => (
              <option key={option} value={option}>
                {ROLE_LABELS[option]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={busy || !email.trim()}
            aria-label="添加协作者"
            className="h-7 shrink-0 rounded-md border border-input px-2 text-[11px] transition-colors hover:bg-muted disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-3 animate-spin" /> : '添加'}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-1.5 text-[11px] text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
