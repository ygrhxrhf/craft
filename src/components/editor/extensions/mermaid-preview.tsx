'use client';

import { useEffect, useId, useState } from 'react';
import { MERMAID_INVALID } from '@/lib/editor/mermaid-surface';

/** G17: the code block's mermaid surface. Source stays editable; this renders above it. */
export function MermaidPreview({ source, dark }: { source: string; dark: boolean }) {
  const reactId = useId();
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const empty = source.trim() === '';

  useEffect(() => {
    if (empty) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const mermaid = (await import('mermaid')).default;
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: 'strict',
            theme: dark ? 'dark' : 'default',
          });
          const id = `mermaid-${reactId.replace(/:/g, '')}-${Date.now()}`;
          const result = await mermaid.render(id, source);
          if (!cancelled) {
            setSvg(result.svg);
            setError(null);
          }
        } catch (err) {
          if (!cancelled) {
            setSvg(null);
            setError(err instanceof Error ? err.message : 'Mermaid 渲染失败');
          }
        }
      })();
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [source, dark, empty, reactId]);

  if (empty) return null;

  if (error) {
    return (
      <pre className="mermaid-preview mermaid-preview-error overflow-x-auto border-b border-border bg-muted/30 px-3 py-2 text-xs whitespace-pre-wrap text-destructive">
        {MERMAID_INVALID}{source}
      </pre>
    );
  }

  return (
    <div className="mermaid-preview flex justify-center overflow-x-auto border-b border-border bg-muted/20 px-3 py-3">
      {svg ? (
        <div dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <span className="text-xs text-muted-foreground">渲染中…</span>
      )}
    </div>
  );
}
