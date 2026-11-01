'use client';

import { useEffect, useRef, useState } from 'react';
import { Tldraw, inlineBase64AssetStore, type Editor } from 'tldraw';
import { useSync } from '@tldraw/sync';
import 'tldraw/tldraw.css';
import { BOARD_FONT_URLS } from '@/components/whiteboard/board-fonts';
import { containScale, type PreviewState } from '@/lib/editor/whiteboard-preview';

/**
 * G448: the embed renders the board **once**, exports it to an image, and shows that image.
 * A live canvas would be a second editor; the exported image is what the official embed shows.
 */
export default function WhiteboardPreviewImage({
  uri,
  isDark,
  padding,
  background,
  alt,
  onStateChange,
}: {
  uri: string;
  isDark: boolean;
  padding: number;
  background: boolean;
  alt: string;
  onStateChange: (state: PreviewState) => void;
}) {
  const store = useSync({ uri, assets: inlineBase64AssetStore });
  const [src, setSrc] = useState<string | null>(null);
  const editorRef = useRef<Editor | null>(null);

  useEffect(() => {
    onStateChange(store.status === 'error' ? 'error' : 'loading');
  }, [store.status, onStateChange]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || store.status !== 'synced-remote' || src) return;

    let cancelled = false;
    const exportImage = async () => {
      try {
        const shapeIds = [...editor.getCurrentPageShapeIds()];
        if (shapeIds.length === 0) {
          // An empty board has nothing to draw; render an empty state rather than failing.
          if (!cancelled) {
            setSrc('');
            onStateChange('ready');
          }
          return;
        }
        const result = await editor.getSvgString(shapeIds, {
          padding,
          background,
          darkMode: isDark,
        });
        if (cancelled || !result) return;
        setSrc(`data:image/svg+xml;utf8,${encodeURIComponent(result.svg)}`);
        onStateChange('ready');
      } catch {
        if (!cancelled) onStateChange('error');
      }
    };
    void exportImage();
    return () => {
      cancelled = true;
    };
  }, [store.status, src, isDark, padding, background, onStateChange]);

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className="h-full w-full object-contain" style={{ objectFit: 'contain' }} />
    );
  }

  // Until the export lands, the canvas is mounted but hidden — it exists only to be exported.
  return (
    <div aria-hidden className="pointer-events-none absolute left-0 top-0 h-full w-full opacity-0">
      <Tldraw
        store={store.status === 'synced-remote' ? store.store : undefined}
        assetUrls={{ fonts: BOARD_FONT_URLS }}
        components={{ Toolbar: null }}
        onMount={(editor) => {
          editor.updateInstanceState({ isReadonly: true });
          editorRef.current = editor;
        }}
      />
    </div>
  );
}

/** Exposed for the fit test: the scale an exported image uses inside its box. */
export { containScale };
