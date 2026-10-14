'use client';

import { useEffect, useRef, useState } from 'react';
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react';
import { untitledFor } from '@/lib/document/untitled-copy';

interface EditorHeaderProps {
  documentId: string;
  title: string;
  icon: string | null;
  readOnly?: boolean;
  onTitleChange: (title: string) => void;
  onIconChange: (icon: string | null) => void;
}

export function EditorHeader({
  title,
  icon,
  readOnly = false,
  onTitleChange,
  onIconChange,
}: EditorHeaderProps) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);

  // The caller hands down a fresh closure on every render (DocumentEditor passes an
  // inline arrow), so listing `onTitleChange` as a dependency made every unrelated
  // parent re-render cancel this timer and re-arm it at a full 500ms. Measured during
  // 18 panel-tab clicks: 19 schedules, 18 of them cancelled before firing, and the
  // write leaving only once rendering stopped -- which is how a typed title gets lost
  // when the user navigates. Reading through a ref keeps the schedule tied to the
  // draft, which is the only thing that may restart it.
  const titleChangeRef = useRef(onTitleChange);
  useEffect(() => {
    titleChangeRef.current = onTitleChange;
  });

  useEffect(() => {
    if (draftTitle === title) return;
    const timer = window.setTimeout(() => titleChangeRef.current(draftTitle), 500);
    return () => window.clearTimeout(timer);
  }, [draftTitle, title]);

  const setIcon = (data: EmojiClickData) => {
    onIconChange(data.emoji);
    setEmojiOpen(false);
  };

  return (
    <div className="mb-6 pt-8">
      <div className="flex items-start gap-3">
        {readOnly ? (
          <>
            <span className="mt-1 flex size-10 shrink-0 items-center justify-center text-2xl">
              {icon || '📄'}
            </span>
            <h1 className="flex-1 font-serif text-3xl font-normal italic break-words">
              {title || untitledFor('topBar')}
            </h1>
          </>
        ) : (
          <>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setEmojiOpen((open) => !open)}
            aria-label="更换图标"
            aria-expanded={emojiOpen}
            title="更换图标"
            className="mt-1 flex size-10 items-center justify-center rounded-md text-2xl transition-colors hover:bg-muted"
          >
            {icon || '📄'}
          </button>
          {emojiOpen && (
            <div className="absolute left-0 top-12 z-30">
              <EmojiPicker onEmojiClick={setIcon} width={320} height={380} />
            </div>
          )}
        </div>

        <input
          type="text"
          value={draftTitle ?? ''}
          onChange={(e) => setDraftTitle(e.target.value)}
          placeholder="页面标题"
          className="flex-1 bg-transparent font-serif text-3xl font-normal italic outline-none placeholder:text-muted-foreground/50"
        />
          </>
        )}
      </div>
    </div>
  );
}
