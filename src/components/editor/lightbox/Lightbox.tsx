'use client';

import { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLightboxStore } from '@/lib/store/use-lightbox-store';

/**
 * G347 —— 图片灯箱本体。它自己不持有"看哪张"的状态，只读全局 store 字段（`src`／`gallery`／
 * `index`）⇒ 任何组件都能把图丢进来，跨屏也能唤起。灯箱自身**没有任何 i18n 键**（官方那支如此），
 * 所以下面只有图标和 `aria-label` 这类无障碍必需的文字。
 */
export function Lightbox() {
  const src = useLightboxStore((state) => state.src);
  const gallery = useLightboxStore((state) => state.gallery);
  const index = useLightboxStore((state) => state.index);
  const close = useLightboxStore((state) => state.close);
  const next = useLightboxStore((state) => state.next);
  const prev = useLightboxStore((state) => state.prev);

  useEffect(() => {
    if (!src) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close();
      } else if (event.key === 'ArrowRight' && gallery.length > 1) {
        event.preventDefault();
        next();
      } else if (event.key === 'ArrowLeft' && gallery.length > 1) {
        event.preventDefault();
        prev();
      }
    };
    // capture 阶段接：编辑器自己也听方向键与 Escape，灯箱必须比它先拿到。
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [src, gallery.length, close, next, prev]);

  if (!src) return null;

  return (
    <div
      data-testid="image-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="图片查看"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-6"
      onClick={close}
    >
      <button
        type="button"
        aria-label="关闭"
        onClick={close}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
      >
        <X className="size-5" />
      </button>
      {gallery.length > 1 && (
        <>
          <button
            type="button"
            aria-label="上一张"
            onClick={(event) => {
              event.stopPropagation();
              prev();
            }}
            className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <ChevronLeft className="size-6" />
          </button>
          <button
            type="button"
            aria-label="下一张"
            onClick={(event) => {
              event.stopPropagation();
              next();
            }}
            className="absolute right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <ChevronRight className="size-6" />
          </button>
        </>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        onClick={(event) => event.stopPropagation()}
        className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
      />
      {gallery.length > 1 && (
        <span className="absolute bottom-4 text-[12px] tabular-nums text-white/70">
          {index + 1} / {gallery.length}
        </span>
      )}
    </div>
  );
}
