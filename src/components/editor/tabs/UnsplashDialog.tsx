'use client';

import { useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Photo {
  id: string;
  alt: string;
  thumb: string;
  full: string;
  author: string;
}

/**
 * G1675 —— 插入面板里的 Unsplash 图片选择器。
 *
 * 只有配置了 `UNSPLASH_ACCESS_KEY`（`/api/unsplash/search` 不返 501）时才挂上来；搜到图点一张
 * 就把原图地址插成图片块。没配置时面板那一行仍是原来的禁用占位。
 */
export function UnsplashDialog({ onPick }: { onPick: (url: string, alt: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function search(term: string) {
    if (!term.trim()) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/unsplash/search?q=${encodeURIComponent(term)}`);
      const payload = (await response.json()) as { results?: Photo[] };
      setPhotos(payload.results ?? []);
    } catch {
      setPhotos([]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        aria-label="插入 Unsplash 图片"
        className="flex w-full items-center gap-2.5 rounded-lg border border-border/70 bg-card px-2.5 py-2 text-left text-[13px] text-foreground shadow-xxs transition-colors hover:bg-muted"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-background">
          <Search className="size-3.5 text-muted-foreground" />
        </span>
        <span className="flex-1 truncate leading-tight">插入 Unsplash 图片</span>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] w-[720px] overflow-y-auto p-5">
        <DialogTitle className="mb-3 text-[15px] font-semibold">Unsplash 图片</DialogTitle>
        <div className="mb-3 flex items-center gap-2">
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void search(query);
            }}
            placeholder="搜索图片，按回车确认…"
            className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <button
            type="button"
            onClick={() => void search(query)}
            className="h-9 shrink-0 rounded-md bg-foreground/[0.06] px-3 text-[13px] font-medium hover:bg-foreground/[0.1]"
          >
            搜索
          </button>
        </div>
        {busy ? (
          <p className="flex items-center gap-2 py-6 text-[13px] text-foreground/55">
            <Loader2 className="size-4 animate-spin" /> 正在搜索…
          </p>
        ) : photos === null ? (
          <p className="py-6 text-[13px] text-foreground/55">输入关键词开始搜索</p>
        ) : photos.length === 0 ? (
          <p className="py-6 text-[13px] text-foreground/55">没有找到图片</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => {
                  onPick(photo.full, photo.alt);
                  setOpen(false);
                }}
                className="overflow-hidden rounded-md border border-foreground/8 transition-colors hover:border-foreground/25"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.thumb} alt={photo.alt} className="h-32 w-full object-cover" />
                <span className="block truncate px-1.5 py-1 text-left text-[11px] text-foreground/60">
                  {photo.author || photo.alt}
                </span>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
