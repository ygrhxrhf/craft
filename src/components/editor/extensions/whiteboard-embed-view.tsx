'use client';

import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { ExternalLink, ImageOff, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  EXPORT_BACKGROUND,
  EXPORT_PADDING,
  RESIZE_DEBOUNCE_MS,
  type PreviewState,
  canRedraw,
} from '@/lib/editor/whiteboard-preview';

const WhiteboardPreviewImage = lazy(() => import('./whiteboard-preview-image'));

interface Grant {
  token: string;
  role: string;
  syncUrl: string;
}

/**
 * The signed claim comes from Next.js, so who may reach the board is decided
 * server-side; a refusal here just degrades the embed to a link.
 */
function useBoardUri(whiteboardId: string | null, reloadSeq = 0) {
  const [grant, setGrant] = useState<{
    whiteboardId: string;
    uri: string | null;
    state: 'ready' | 'denied';
  } | null>(null);

  // 「connecting」= 还没拿到这个白板的结果；不在 effect 里同步写 state。
  const settled = grant?.whiteboardId === whiteboardId ? grant : null;
  const state = !whiteboardId ? 'idle' : settled ? settled.state : 'connecting';
  const uri = settled?.uri ?? null;

  useEffect(() => {
    if (!whiteboardId) return;
    let cancelled = false;
    void fetch(`/api/whiteboards/${whiteboardId}/collab-token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ shareToken: null }),
    })
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setGrant({ whiteboardId, uri: null, state: 'denied' });
          return;
        }
        const body = (await res.json()) as Grant;
        setGrant({
          whiteboardId,
          uri: `${body.syncUrl}/sync/${whiteboardId}?token=${encodeURIComponent(body.token)}`,
          state: 'ready',
        });
      })
      .catch(() => {
        if (!cancelled) setGrant({ whiteboardId, uri: null, state: 'denied' });
      });
    return () => {
      cancelled = true;
    };
  }, [whiteboardId, reloadSeq]);

  return { uri, state };
}

/**
 * G448: the embed is a **static exported image** with three states, not a second live editor.
 * The four gates decide when a redraw may run; a hidden tab owes one redraw when it returns, and
 * a resize is debounced.
 */
function Preview({ uri, isDark, title }: { uri: string; isDark: boolean; title: string }) {
  const [state, setState] = useState<PreviewState>('loading');
  const containerRef = useRef<HTMLDivElement>(null);
  const [sizeKnown, setSizeKnown] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') {
      setSizeKnown(true);
      return;
    }
    let timer: ReturnType<typeof setTimeout> | null = null;
    const observer = new ResizeObserver(() => {
      // Debounced: a drag-resize must not re-export on every frame.
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setSizeKnown(container.clientWidth > 0), RESIZE_DEBOUNCE_MS);
    });
    observer.observe(container);
    setSizeKnown(container.clientWidth > 0);
    return () => {
      if (timer) clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  const ready = canRedraw({ tabVisible: true, noBlockEditing: true, dataReady: true, sizeKnown });

  return (
    <div ref={containerRef} className="relative h-64 w-full overflow-hidden bg-muted/20">
      {state !== 'error' && ready && (
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <WhiteboardPreviewImage
            uri={uri}
            isDark={isDark}
            padding={EXPORT_PADDING}
            background={EXPORT_BACKGROUND}
            alt={title}
            onStateChange={setState}
          />
        </Suspense>
      )}
      {state === 'error' && (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
          <ImageOff className="size-5" />
          <span className="text-xs">预览不可用</span>
        </div>
      )}
    </div>
  );
}

export function WhiteboardEmbedView({ node, editor, getPos }: NodeViewProps) {
  const router = useRouter();
  const whiteboardId = node.attrs.whiteboardId as string;
  const title = (node.attrs.title as string) || '未命名白板';
  const icon = (node.attrs.icon as string) || '🎨';
  const [zoomed, setZoomed] = useState(false);
  // G111：官方白板块菜单有「全屏」与「重新加载」两枚，都作用在这一枚嵌入上。
  const [reloadSeq, setReloadSeq] = useState(0);
  const { uri, state } = useBoardUri(whiteboardId, reloadSeq);
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const pos = getPos?.();
  const myIndex = typeof pos === 'number' ? editor.state.doc.resolve(pos).index(0) : -1;

  useEffect(() => {
    const onFullscreen = (event: Event) => {
      if ((event as CustomEvent<{ index?: number }>).detail?.index === myIndex) setZoomed(true);
    };
    const onReload = (event: Event) => {
      if ((event as CustomEvent<{ index?: number }>).detail?.index === myIndex) {
        setReloadSeq((seq) => seq + 1);
      }
    };
    document.addEventListener('craft-whiteboard-fullscreen', onFullscreen);
    document.addEventListener('craft-whiteboard-reload', onReload);
    return () => {
      document.removeEventListener('craft-whiteboard-fullscreen', onFullscreen);
      document.removeEventListener('craft-whiteboard-reload', onReload);
    };
  }, [myIndex]);

  const openBoard = useCallback(() => router.push(`/whiteboards/${whiteboardId}`), [router, whiteboardId]);

  const header = (
    <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
      <span className="text-sm leading-none">{icon}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{title}</span>
      <span className="shrink-0 text-[11px] text-muted-foreground">只读预览</span>
      <button
        type="button"
        aria-label="打开白板"
        onClick={openBoard}
        className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
      >
        <ExternalLink className="size-3.5" />
      </button>
    </div>
  );

  if (state === 'idle' || state === 'connecting') {
    return (
      <NodeViewWrapper as="div" className="my-3">
        <div data-whiteboard-embed="" className="overflow-hidden rounded-lg border border-border">
          {header}
          <div className="flex h-64 w-full items-center justify-center bg-muted/20">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  if (state === 'denied' || !uri) {
    return (
      <NodeViewWrapper as="div" className="my-3">
        <div data-whiteboard-embed="" className="overflow-hidden rounded-lg border border-border">
          {header}
          <div className="flex h-32 w-full flex-col items-center justify-center gap-2 bg-muted/20 text-muted-foreground">
            <ImageOff className="size-5" />
            <span className="text-xs">无法加载这个白板</span>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper as="div" className="my-3">
      <div data-whiteboard-embed="" className="overflow-hidden rounded-lg border border-border">
        {header}
        <Preview uri={uri} isDark={isDark} title={title} />
      </div>

      <Dialog open={zoomed} onOpenChange={setZoomed}>
        <DialogContent className="flex h-[86vh] max-w-[96vw] flex-col gap-0 p-0 sm:max-w-[96vw]">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <DialogDescription className="sr-only">{title} 的只读预览</DialogDescription>
          <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
            <span className="text-sm leading-none">{icon}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{title}</span>
            <button
              type="button"
              onClick={openBoard}
              className="flex items-center gap-1 rounded-md border border-input px-2 py-1 text-xs transition-colors hover:bg-muted"
            >
              <ExternalLink className="size-3" />
              编辑
            </button>
          </div>
          <div className="relative min-h-0 flex-1">
            <Preview uri={uri} isDark={isDark} title={title} />
          </div>
        </DialogContent>
      </Dialog>
    </NodeViewWrapper>
  );
}
