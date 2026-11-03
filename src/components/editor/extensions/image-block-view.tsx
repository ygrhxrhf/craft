'use client';

import { NodeViewWrapper } from '@tiptap/react';
import { cn } from 'cn';
import type { NodeViewProps } from '@tiptap/react';
import { useRef, useState } from 'react';
import { Crop, ImagePlus, Link2, Loader2, Minus, Plus } from 'lucide-react';
import { uploadFile } from '@/lib/upload-client';
import { promptDialog } from '@/lib/dialog/show';
import { frameStyle, moveFrame, readImageFrame, zoomFrame, type ImageFrame } from '@/lib/editor/image-frame';
import { primaryColorFromInt, samplePrimaryColor } from '@/lib/editor/image-primary-color';
import { useLightboxStore } from '@/lib/store/use-lightbox-store';

export function ImageBlockView({ node, updateAttributes }: NodeViewProps) {
  const [loaded, setLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const src = node.attrs.src as string | null;
  // G156：两根轴。auto 保持阅读列宽，large 铺满；fill 裁切填充，fit 完整显示。
  const imageSize = node.attrs.imageSize === 'large' ? 'large' : 'auto';
  const imageFit = node.attrs.imageFit === 'fit' ? 'fit' : 'fill';
  const alt = node.attrs.alt as string;
  const caption = node.attrs.caption as string;
  // G504：主色整型存库，没采样到时吃官方那枚默认底色。
  const primaryColor = primaryColorFromInt(node.attrs.primaryColor);
  const frame = readImageFrame(node.attrs);
  const [framing, setFraming] = useState(false);
  const drag = useRef<{ x: number; y: number; frame: ImageFrame } | null>(null);
  const frameBox = useRef<HTMLDivElement>(null);

  const writeFrame = (next: ImageFrame) => {
    updateAttributes({ posX: next.x, posY: next.y, scale: next.scale });
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('仅支持图片文件');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const { url } = await uploadFile(file);
      updateAttributes({ src: url, alt: file.name });
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleUrl = async () => {
    const url = await promptDialog({ title: '输入图片 URL', placeholder: 'https://…', confirmLabel: '保存' });
    if (url) updateAttributes({ src: url, alt: null });
  };

  return (
    <NodeViewWrapper
      as="div"
      className={cn('my-4', imageSize === 'large' ? 'w-full' : 'mx-auto max-w-[720px]')}
      data-image-size={imageSize}
      data-image-fit={imageFit}
    >
      <figure
        className={`group relative rounded-lg transition-colors ${
          dragOver ? 'ring-2 ring-primary ring-offset-2' : ''
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
      >
        {!src ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-foreground/15 bg-foreground/4 text-foreground/55 transition-colors duration-150 ease-craft hover:bg-foreground/8"
          >
            {uploading ? (
              <>
                <Loader2 className="size-6 animate-spin" />
                <span className="text-sm">上传中...</span>
              </>
            ) : (
              <>
                <ImagePlus className="size-6" />
                <span className="text-sm">点击上传图片，或拖拽 / 粘贴图片到这里</span>
              </>
            )}
          </button>
        ) : (
          <>
            {!loaded && (
              <div className="flex h-48 items-center justify-center rounded-lg bg-muted">
                <div className="size-6 animate-pulse rounded-full bg-muted-foreground/20" />
              </div>
            )}
            <div ref={frameBox} className="h-72 overflow-hidden rounded-lg" style={{ backgroundColor: primaryColor }}>
              <img
                src={src}
                alt={alt || ''}
                draggable={false}
                onLoad={(event) => {
                  setLoaded(true);
                  if (node.attrs.primaryColor == null) {
                    const sampled = samplePrimaryColor(event.currentTarget);
                    if (sampled !== null) updateAttributes({ primaryColor: sampled });
                  }
                }}
                // G347：点图进灯箱——把图丢进**全局 store 字段**，灯箱自己从字段渲染
                // （不是本组件的局部态，所以跨屏也能唤起）。裁剪态下不抢点击。
                onClick={() => {
                  if (framing || !src) return;
                  useLightboxStore.getState().open(src, [src]);
                }}
                onPointerDown={(event) => {
                  if (!framing) return;
                  drag.current = { x: event.clientX, y: event.clientY, frame };
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={(event) => {
                  const start = drag.current;
                  const box = frameBox.current;
                  if (!start || !box) return;
                  writeFrame(
                    moveFrame(
                      start.frame,
                      event.clientX - start.x,
                      event.clientY - start.y,
                      box.clientWidth,
                      box.clientHeight,
                    ),
                  );
                }}
                onPointerUp={() => {
                  drag.current = null;
                }}
                style={frameStyle(frame)}
                className={`h-full w-full ${imageFit === 'fit' ? 'object-contain' : 'object-cover'} transition-opacity ${
                  loaded ? 'opacity-100' : 'opacity-0'
                } ${framing ? 'cursor-grab' : ''}`}
              />
            </div>
            <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex size-7 items-center justify-center rounded-md bg-background/80 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-background hover:text-foreground"
                title="重新上传"
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ImagePlus className="size-4" />
                )}
              </button>
              <button
                type="button"
                aria-pressed={framing}
                onClick={() => setFraming((open) => !open)}
                className="flex size-7 items-center justify-center rounded-md bg-background/80 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-background hover:text-foreground"
                title="重新定位或裁剪"
              >
                <Crop className="size-4" />
              </button>
              {framing && (
                <>
                  <button
                    type="button"
                    aria-label="放大"
                    onClick={() => writeFrame(zoomFrame(frame, 1))}
                    className="flex size-7 items-center justify-center rounded-md bg-background/80 text-muted-foreground shadow-sm backdrop-blur hover:text-foreground"
                  >
                    <Plus className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="缩小"
                    onClick={() => writeFrame(zoomFrame(frame, -1))}
                    className="flex size-7 items-center justify-center rounded-md bg-background/80 text-muted-foreground shadow-sm backdrop-blur hover:text-foreground"
                  >
                    <Minus className="size-4" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={handleUrl}
                className="flex size-7 items-center justify-center rounded-md bg-background/80 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-background hover:text-foreground"
                title="图片 URL"
              >
                <Link2 className="size-4" />
              </button>
            </div>
          </>
        )}
        {caption && (
          <figcaption className="mt-2 text-center text-ui text-foreground/55">
            {caption}
          </figcaption>
        )}
        {error && (
          <div className="mt-1 text-center text-meta text-destructive">{error}</div>
        )}
      </figure>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
    </NodeViewWrapper>
  );
}
