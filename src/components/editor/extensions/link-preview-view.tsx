'use client';

import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useEffect, useState } from 'react';
import { Link2, Globe, Loader2 } from 'lucide-react';

interface PreviewData {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  siteName: string | null;
}

export function LinkPreviewView({ node, updateAttributes }: NodeViewProps) {
  // 结果按 url 记：换了链接就自然回到"未落定"，不必在 effect 里同步 setLoading(true)
  // （那会被 react-hooks/set-state-in-effect 拦下）。
  const [previewed, setPreviewed] = useState<{ url: string; data: PreviewData } | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const url = node.attrs.url as string;
  // G111：四档布局（small／regular／card／embed），块菜单按这四档切换。
  const layout = (node.attrs.layout as string) || 'regular';
  const reloadSeq = typeof node.attrs.reloadSeq === 'number' ? node.attrs.reloadSeq : 0;
  const hasMeta = Boolean(node.attrs.title || node.attrs.siteName);
  const data = previewed?.url === url ? previewed.data : null;
  const settled = previewed?.url === url || failedUrl === url;
  const loading = !hasMeta && !settled;

  useEffect(() => {
    if (hasMeta) return;
    let cancelled = false;
    fetch('/api/link-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
      .then((res) => res.json())
      .then((d: PreviewData) => {
        if (cancelled) return;
        setPreviewed({ url, data: d });
        updateAttributes({
          title: d.title ?? null,
          description: d.description ?? null,
          image: d.image ?? null,
          favicon: d.favicon ?? null,
          siteName: d.siteName ?? null,
        });
      })
      .catch(() => {
        if (!cancelled) setFailedUrl(url);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, reloadSeq]);

  const title = (node.attrs.title as string) ?? data?.title ?? null;
  const description = (node.attrs.description as string) ?? data?.description ?? null;
  const image = (node.attrs.image as string) ?? data?.image ?? null;
  const favicon = (node.attrs.favicon as string) ?? data?.favicon ?? null;
  const siteName =
    (node.attrs.siteName as string) ?? data?.siteName ?? hostnameOf(url);

  const meta = (
    <div className="flex items-center gap-1.5 text-meta text-foreground/40">
      {favicon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={favicon} alt="" className="size-3.5 rounded-sm" />
      ) : (
        <Globe className="size-3.5" />
      )}
      <span className="truncate">{siteName}</span>
    </div>
  );

  const heading =
    loading && !title ? (
      <div className="flex items-center gap-2 text-ui text-foreground/40">
        <Loader2 className="size-3.5 animate-spin" />
        正在获取链接预览...
      </div>
    ) : (
      <>
        <div className="truncate text-ui font-medium">{title ?? url}</div>
        {description && <div className="line-clamp-2 text-meta text-foreground/55">{description}</div>}
      </>
    );

  // G111 `previewToEmbedStyle`：整页嵌进块里。iframe 用沙箱隔离，不给 same-origin —— 目标页
  // 拿不到本应用的存储与父窗口。
  if (layout === 'embed') {
    return (
      <NodeViewWrapper as="div" className="my-3" data-type="link-preview" data-layout="embed">
        <div className="overflow-hidden rounded-lg border border-foreground/8">
          <iframe
            src={url}
            title={title ?? siteName ?? url}
            sandbox="allow-scripts allow-popups allow-presentation"
            referrerPolicy="no-referrer"
            loading="lazy"
            className="h-[360px] w-full bg-background"
          />
        </div>
      </NodeViewWrapper>
    );
  }

  if (layout === 'small') {
    return (
      <NodeViewWrapper as="div" className="my-2" data-type="link-preview" data-layout="small">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-w-full items-center gap-2 rounded-md border border-foreground/8 px-2 py-1 text-ui transition-colors duration-150 ease-craft hover:bg-foreground/4"
          style={{ backgroundColor: 'var(--card-background)' }}
        >
          {favicon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={favicon} alt="" className="size-3.5 shrink-0 rounded-sm" />
          ) : (
            <Globe className="size-3.5 shrink-0 text-foreground/40" />
          )}
          <span className="truncate">{title ?? url}</span>
        </a>
      </NodeViewWrapper>
    );
  }

  if (layout === 'card') {
    return (
      <NodeViewWrapper as="div" className="my-3" data-type="link-preview" data-layout="card">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden rounded-lg border border-foreground/8 transition-colors duration-150 ease-craft hover:bg-foreground/4"
          style={{ backgroundColor: 'var(--card-background)' }}
        >
          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="h-40 w-full object-cover" />
          )}
          <div className="flex min-w-0 flex-col gap-1 px-3 py-2.5">
            {meta}
            {heading}
          </div>
        </a>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper as="div" className="my-3" data-type="link-preview" data-layout="regular">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex overflow-hidden rounded-lg border border-foreground/8 transition-colors duration-150 ease-craft hover:bg-foreground/4"
        style={{ backgroundColor: 'var(--card-background)' }}
      >
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            className="hidden h-auto w-40 shrink-0 object-cover sm:block"
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1 px-3 py-2.5">
          {meta}
          {heading}
        </div>
      </a>
    </NodeViewWrapper>
  );
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
