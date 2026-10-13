'use client';

import { useEffect, useRef, useState } from 'react';
import { loadEmojiIndex, searchEmojis, type EmojiEntry } from '@/lib/emoji/data';
import { acceptEmoji, emojiQueryAt, type EmojiQuery } from './emoji-query';

/**
 * The `:query` completion under a comment field (G74). It owns the lookup; the field owns the text,
 * and reports back the rewritten draft so the caret can follow the inserted glyph.
 */
export function EmojiSuggest({
  draft,
  caret,
  onAccept,
  onMatchCount,
}: {
  draft: string;
  caret: number;
  onAccept: (next: { draft: string; caret: number }) => void;
  /** Lets the field's Enter accept the first match instead of sending. */
  onMatchCount?: (count: number) => void;
}) {
  const query = emojiQueryAt(draft, caret);
  const term = query?.query ?? '';
  const [matches, setMatches] = useState<EmojiEntry[]>([]);

  useEffect(() => {
    if (!term) return;
    let alive = true;
    loadEmojiIndex()
      .then((index) => {
        if (alive) setMatches(searchEmojis(index, term));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [term]);

  const open = !!query && matches.length > 0;
  const box = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    onMatchCount?.(open ? matches.length : 0);
  }, [open, matches.length, onMatchCount]);

  // Enter accepts the first match. The effect re-runs once the list has rendered, which is the only
  // moment the field can be found from it, and it binds to that field alone.
  useEffect(() => {
    const field = box.current?.parentElement?.querySelector('textarea, input');
    if (!field || !query) return;
    const onKey = (event: Event) => {
      const key = event as KeyboardEvent;
      if (key.key !== 'Enter' || key.shiftKey || key.metaKey || key.ctrlKey || key.altKey) return;
      key.preventDefault();
      key.stopPropagation();
      onAccept(acceptEmoji(draft, query, caret, matches[0].char));
    };
    field.addEventListener('keydown', onKey);
    return () => field.removeEventListener('keydown', onKey);
  }, [open, query, matches, draft, caret, onAccept]);

  if (!open || !query) return null;

  return (
    <div ref={box} className="mt-1 max-h-40 overflow-y-auto rounded-md border border-foreground/10 bg-popover">
      {matches.map((entry) => (
        <button
          key={entry.name}
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onAccept(acceptEmoji(draft, query, caret, entry.char))}
          className="flex w-full items-center gap-2 px-2 py-1 text-left text-meta hover:bg-foreground/4"
        >
          <span>{entry.char}</span>
          <span className="truncate text-foreground/55">:{entry.name}</span>
        </button>
      ))}
    </div>
  );
}

/** Where the caret sits after a change, so the suggestion tracks the field rather than the text end. */
export function caretAfter(event: { target: { selectionStart: number | null } }, fallback: number): number {
  return event.target.selectionStart ?? fallback;
}

export type { EmojiQuery };
