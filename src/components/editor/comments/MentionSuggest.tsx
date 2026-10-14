'use client';

import { useEffect, useState } from 'react';
import type { MentionCandidate } from '@/actions/document/members';
// G1507：与正文那枚 `@` 同源——名单要认这台设备上刚做的邀请，不能只读服务端已落库的行。
import { loadMentionCandidates } from '@/components/sync/mention-candidates';
import { mentionLabel, rankMentionCandidates } from '../extensions/mention-users';
import { acceptEmoji, mentionQueryAt } from './emoji-query';

/**
 * The `@` completion under a comment field (G74). The people are the document's mention candidates —
 * members plus the owner — loaded once per document, and ranked by the same rule the body uses.
 * Accepting inserts `@名字` followed by a space, so the query closes.
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

  useEffect(() => {
    let alive = true;
    loadMentionCandidates(documentId)
      .then((rows) => {
        if (alive) setPeople(rows);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [documentId]);

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
