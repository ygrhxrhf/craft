'use client';

import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { FileText, Download, Table2 } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatFileSize } from '@/lib/upload-client';
import { collectionNameFromFile, isCsvFileBlock } from '@/lib/collection/csv-file';
import { createCollectionFromCsv } from '@/actions/collection/collection';
import { toast } from '@/components/ui/toast';

export function AttachmentView({ node, deleteNode }: NodeViewProps) {
  const router = useRouter();
  const url = node.attrs.url as string;
  const name = (node.attrs.name as string) ?? '附件';
  const size = node.attrs.size as number | null;
  // G112：只有 `.csv` 文件块才给「转为集合」这一枚。
  const csv = isCsvFileBlock(name);
  const [converting, setConverting] = useState(false);

  const convertToCollection = async () => {
    if (converting) return;
    setConverting(true);
    try {
      // 正文走代理读（文件在对象存储里，前端直连会被 CORS 拦）。
      const res = await fetch(url);
      if (!res.ok) throw new Error('读取失败');
      const text = await res.text();
      const { id } = await createCollectionFromCsv(collectionNameFromFile(name), text);
      toast.add({ title: `已转为集合「${collectionNameFromFile(name)}」`, type: 'success' });
      router.push(`/collections/${id}`);
    } catch {
      toast.add({ title: '没有转换成集合，请重试', type: 'error' });
    } finally {
      setConverting(false);
    }
  };

  return (
    <NodeViewWrapper as="div" className="my-2">
      <div className="group flex items-center gap-3 rounded-lg border border-foreground/8 bg-card px-3 py-2.5 transition-colors duration-150 ease-craft hover:bg-foreground/4">
        <FileText className="size-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-ui font-medium">{name}</div>
          {size != null && (
            <div className="text-meta text-foreground/40">
              {formatFileSize(size)}
            </div>
          )}
        </div>
        {/* G112：CSV 文件块 → 集合。集合名取文件名去扩展（纯核判据）。 */}
        {csv && (
          <button
            type="button"
            data-testid="csv-to-collection"
            disabled={converting}
            onClick={() => void convertToCollection()}
            className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-meta text-(--craft-accent) transition-colors duration-150 ease-craft hover:bg-foreground/6 disabled:opacity-50"
            title="转为集合"
          >
            <Table2 className="size-3.5" />
            转为集合
          </button>
        )}
        <a
          href={url}
          download={name}
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-foreground/55 transition-colors duration-150 ease-craft hover:bg-foreground/6 hover:text-foreground/85"
          title="下载"
        >
          <Download className="size-4" />
        </a>
        <button
          type="button"
          onClick={() => deleteNode()}
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all duration-150 ease-craft hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
          title="删除"
        >
          <svg
            className="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </NodeViewWrapper>
  );
}
