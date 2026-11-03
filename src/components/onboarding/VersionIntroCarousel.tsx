'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  INTRO_SEEN_KEY,
  pendingIntroPages,
  type IntroPage,
} from '@/lib/onboarding/versioned-intro';

/**
 * G305: the versioned update carousel. A device that has never seen the intro gets every
 * page in version order; a device that has seen v330 only gets v350 and later. Closing the
 * carousel records the newest version shown, so it never returns for that version.
 */
export function VersionIntroCarousel() {
  const [pages, setPages] = useState<IntroPage[]>([]);
  const [newestVersion, setNewestVersion] = useState<string | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let seen: string | null = null;
    try {
      seen = localStorage.getItem(INTRO_SEEN_KEY);
    } catch {
      seen = null;
    }
    const pending = pendingIntroPages(seen);
    if (pending.length === 0) return;
    setPages(pending.flatMap((entry) => entry.pages));
    setNewestVersion(pending[pending.length - 1].version);
  }, []);

  if (pages.length === 0) return null;
  const page = pages[Math.min(index, pages.length - 1)];
  const last = index >= pages.length - 1;

  const dismiss = () => {
    if (newestVersion) {
      try {
        localStorage.setItem(INTRO_SEEN_KEY, newestVersion);
      } catch {
        // A blocked storage keeps the carousel from remembering; the page still closes.
      }
    }
    setPages([]);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={dismiss} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={page.title}
        data-testid="version-intro"
        className="relative w-[420px] max-w-[calc(100vw-2rem)] rounded-2xl bg-background p-6 shadow-xl"
      >
        <button
          type="button"
          aria-label="关闭"
          onClick={dismiss}
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-foreground"
        >
          <X className="size-4" />
        </button>
        <h2 className="text-xl font-semibold">{page.title}</h2>
        <p className="mt-3 min-h-20 text-[14px] leading-relaxed text-foreground/75">{page.content}</p>
        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-1.5" aria-hidden="true">
            {pages.map((_, dot) => (
              <span
                key={dot}
                className={`size-1.5 rounded-full ${dot === index ? 'bg-foreground/70' : 'bg-foreground/20'}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={() => setIndex((value) => Math.max(0, value - 1))}
                className="rounded-md px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-foreground"
              >
                上一步
              </button>
            )}
            <button
              type="button"
              onClick={() => (last ? dismiss() : setIndex((value) => value + 1))}
              className="rounded-md bg-(--craft-accent) px-3 py-1.5 text-[13px] text-white transition-colors hover:bg-(--craft-accent-hover)"
            >
              {last ? '开始使用' : '继续'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

