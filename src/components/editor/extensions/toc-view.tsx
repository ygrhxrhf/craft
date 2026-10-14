'use client';

import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { List } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TOC_PLACEHOLDER } from '@/lib/editor/official-copy';
import { untitledFor } from '@/lib/document/untitled-copy';

interface TocEntry {
  text: string;
  level: number;
  index: number;
  /** Set when the entry is a page mention, which opens that document rather than scrolling. */
  documentId?: string;
}

/**
 * The entries a table of contents is built from. The official placeholder names three sources —
 * headings, pages and cards — and the local document has the first and the third, so a card counts
 * alongside a heading instead of being invisible to the list.
 */
export function collectTocEntries(doc: {
  descendants: (walk: (node: { type: { name: string }; attrs: Record<string, unknown>; textContent: string }) => boolean | void) => void;
}): TocEntry[] {
  const entries: TocEntry[] = [];
  doc.descendants((node) => {
    if (node.type.name === 'heading') {
      entries.push({
        text: node.textContent.trim() || '未命名',
        level: (node.attrs.level as number) ?? 1,
        index: entries.length,
      });
      return;
    }
    if (node.type.name === 'mention' && typeof node.attrs.documentId === 'string' && node.attrs.documentId) {
      entries.push({
        text: (typeof node.attrs.title === 'string' && node.attrs.title) || untitledFor('list'),
        level: 1,
        index: entries.length,
        documentId: node.attrs.documentId,
      });
      return;
    }
    if (node.type.name === 'cardBlock') {
      entries.push({
        text: node.textContent.trim().slice(0, 80) || '卡片',
        level: 1,
        index: entries.length,
      });
      // The card is one entry. Headings inside it belong to the card, not to the list again.
      return false;
    }
  });
  return entries;
}

export function TableOfContentsView({ editor }: NodeViewProps) {
  const router = useRouter();
  const [entries, setEntries] = useState<TocEntry[]>(() => collectTocEntries(editor.state.doc));

  useEffect(() => {
    const sync = () => setEntries(collectTocEntries(editor.state.doc));
    editor.on('update', sync);
    editor.on('transaction', sync);
    return () => {
      editor.off('update', sync);
      editor.off('transaction', sync);
    };
  }, [editor]);

  const jump = (index: number) => {
    // The headings are the only elements of their kind inside the editor, so the
    // nth match is the entry the list is showing.
    const target = document.querySelectorAll(
      '.ProseMirror h1, .ProseMirror h2, .ProseMirror h3, .ProseMirror h4, .ProseMirror [data-type="card-block"]',
    )[index];
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (entries.length === 0) {
    return (
      <NodeViewWrapper as="div">
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-[13px] text-muted-foreground">
          <List className="size-4" />
          目录：{TOC_PLACEHOLDER}
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper as="div">
      <nav
        aria-label="目录"
        className="my-2 rounded-lg border border-border bg-muted/20 px-3 py-2"
      >
        <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
          目录
        </p>
        <ul className="space-y-0.5">
          {entries.map((entry) => (
            <li key={`${entry.index}-${entry.text}`}>
              <button
                type="button"
                onClick={() => (entry.documentId ? router.push(`/documents/${entry.documentId}`) : jump(entry.index))}
                className="block w-full truncate rounded px-1 py-0.5 text-left text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                style={{ paddingLeft: `${(entry.level - 1) * 0.75 + 0.25}rem` }}
              >
                {entry.text}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </NodeViewWrapper>
  );
}
