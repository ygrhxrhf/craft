'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MentionCandidate } from '@/actions/document/members';
import { getSyncManager } from '@/lib/sync-core';
// G1507：与正文那枚 `@` 同源——名单要认这台设备上刚做的邀请，不能只读服务端已落库的行。
import { loadMentionCandidates } from '@/components/sync/mention-candidates';
import { mentionLabel, rankMentionCandidates } from '../extensions/mention-users';
import { acceptEmoji, mentionQueryAt } from './emoji-query';

/**
 * The `@` completion under a comment field (G74). The people are the document's mention candidates —
 * members plus the owner — ranked by the same rule the body uses. Accepting inserts `@名字` followed
 * by a space, so the query closes.
 *
 * G1519：候选随 `document_member` 的 store 变化重读——评论框挂着时刚被邀的人当场进得了候选，
 * 不必整页重载（正文那枚弹层每次 query 变化都重跑，这一侧原本只在 `documentId` 变时读一次）。
 */
export function MentionSuggest({
  documentId,
  draft,
  caret,
  onAccept,
}: {
  documentId: string;
  draft: string;
  caret: number;
  onAccept: (next: { draft: string; caret: number }) => void;
}) {
  const query = mentionQueryAt(draft, caret);
  const [people, setPeople] = useState<MentionCandidate[] | null>(null);

  const refresh = useCallback(() => {
    loadMentionCandidates(documentId)
      .then(setPeople)
      .catch(() => {});
  }, [documentId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // 本机邀请／他端推送／入站 ack+pull 触碰 document_member ⇒ 重读候选（与 `TrashList.tsx:81` 同法）。
  useEffect(
    () =>
      getSyncManager().onStoreChanged((table) => {
        if (table !== 'document_member') return;
        refresh();
      }),
    [refresh],
  );

  if (!query || !people) return null;
  const matches = rankMentionCandidates(people, query.query, 8);
  if (matches.length === 0) return null;

  return (
    <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-foreground/10 bg-popover">
      {matches.map((person) => (
        <button
          key={person.userId}
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onAccept(acceptEmoji(draft, query, caret, `@${mentionLabel(person)} `))}
          className="flex w-full items-center gap-2 px-2 py-1 text-left text-meta hover:bg-foreground/4"
        >
          <span className="truncate">{mentionLabel(person)}</span>
          <span className="truncate text-foreground/40">{person.email}</span>
        </button>
      ))}
    </div>
  );
}
