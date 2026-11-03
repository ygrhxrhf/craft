'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, PinOff } from 'lucide-react';

import { cn } from 'cn';
import { SIDEBAR_DOC_MIME, sidebarDragState, parseSidebarDragPayload } from '@/lib/dnd/sidebar-drag';
import { setFolderPinnedLocal } from '@/lib/folder/pin-local';
import { FOLDER_PIN_COPY } from '@/lib/folder/pinned-doc';

interface PinnedDoc {
  id: string;
  title: string;
  icon: string | null;
}

interface FolderPinnedSectionProps {
  folderId: string;
  pinned: PinnedDoc | null;
}

/**
 * G338：文件夹屏上的「固定文档」区——官方 `Folder pinned doc` 事件（`folder_set_pinned`）的落点。
 * 入口是拖放（`browse.drop.here.to.pin.document`），槽位只有一个：拖新的进来即换掉旧的。
 */
export function FolderPinnedSection({ folderId, pinned }: FolderPinnedSectionProps) {
  const router = useRouter();
  const [isOver, setIsOver] = useState(false);

  async function write(documentId: string | null) {
    await setFolderPinnedLocal(folderId, documentId);
    // 固定文档是服务端读出来的，写完要让服务器组件重新取一次。
    router.refresh();
  }

  function handleDragOver(e: React.DragEvent) {
    const payload = sidebarDragState.payload;
    if (!payload || !('type' in payload) || payload.type !== 'doc') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!isOver) setIsOver(true);
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsOver(false);
    const payload =
      parseSidebarDragPayload(e.dataTransfer.getData(SIDEBAR_DOC_MIME)) ??
      (sidebarDragState.payload && 'type' in sidebarDragState.payload && sidebarDragState.payload.type === 'doc'
        ? sidebarDragState.payload
        : null);
    if (!payload || payload.type !== 'doc') return;
    sidebarDragState.payload = null;
    await write(payload.documentId);
  }

  return (
    <section className="mb-8" data-testid="folder-pinned-doc">
      <h2 className="mb-3 text-lg font-medium">{FOLDER_PIN_COPY.pinnedDoc.label}</h2>
      <div
        onDragOver={handleDragOver}
        onDragLeave={() => setIsOver(false)}
        onDrop={(e) => void handleDrop(e)}
        data-dropzone={pinned ? 'replace' : 'empty'}
        className={cn(
          'rounded-lg border border-dashed border-border transition-colors',
          isOver && 'border-ring bg-primary/5'
        )}
      >
        {pinned ? (
          <div className="flex items-center gap-2 px-3 py-2.5">
            <Link
              href={`/documents/${pinned.id}`}
              className="flex min-w-0 flex-1 items-center gap-2 text-body"
            >
              {pinned.icon ? <span>{pinned.icon}</span> : <FileText className="size-4 text-foreground/40" />}
              <span className="truncate">{pinned.title}</span>
            </Link>
            <button
              type="button"
              aria-label={FOLDER_PIN_COPY.unpin.label}
              title={FOLDER_PIN_COPY.unpin.label}
              onClick={() => void write(null)}
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-foreground"
            >
              <PinOff className="size-3.5" />
            </button>
          </div>
        ) : (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            {FOLDER_PIN_COPY.dropHereToPin.label}
          </p>
        )}
      </div>
    </section>
  );
}
