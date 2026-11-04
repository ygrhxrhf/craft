'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutTemplate } from 'lucide-react';
import { duplicateSharedDocument } from '@/actions/document/share';

/**
 * G145：`showDuplicateAsTemplate` 打开时，公开页给访客一枚「用作模板」——把这一页复制进
 * 自己的空间（官方 `toolbar.visitor.page.duplicate.allowed`「访客可以将此页面用作模板」）。
 * 未登录先送去登录：复制出来的文档必须有归属。
 */
export function UseAsTemplateButton({ identifier }: { identifier: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        const { id } = await duplicateSharedDocument(identifier);
        router.push(`/documents/${id}`);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : '';
        // 未登录时 auth 那层抛的就是这句；服务端判定不允许复制另有自己的一句。
        if (message === '未授权') {
          router.push(`/login?next=${encodeURIComponent(`/s/${identifier}`)}`);
          return;
        }
        setError(message || '复制失败');
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        data-testid="use-as-template"
        disabled={pending}
        onClick={onClick}
        className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-meta text-foreground/70 transition-colors duration-150 ease-craft hover:bg-foreground/4 hover:text-foreground disabled:opacity-60"
      >
        <LayoutTemplate className="size-3.5" />
        用作模板
      </button>
      {error && <span className="text-meta text-destructive">{error}</span>}
    </div>
  );
}
