'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { File, FolderInput } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getSyncManager } from '@/lib/sync-core';
import { readPendingRows, type PendingRow } from '@/components/sync/local-records';
import { overlayDocumentRows, type Document } from '@/components/sidebar/DocumentTree';
import { folderOptions, unsortedDocuments, type FolderLike } from '@/lib/browse/inbox';
import { formatDocCount, INBOX_EMPTY, MOVE_TO, UNSORTED_TITLE } from '@/lib/browse/official-copy';
import { untitledFor } from '@/lib/document/untitled-copy';
import { useSidebarStore } from '@/lib/store/use-sidebar-store';

interface InboxListProps {
  documents: Document[];
  folders: FolderLike[];
}

export function InboxList({ documents, folders }: InboxListProps) {
  const router = useRouter();
  const [pending, setPending] = useState<Map<string, PendingRow>>(new Map());
  const bumpTree = useSidebarStore((s) => s.bumpTree);

  // 未推送的本地意图也要立刻反映在列表里（归档后该行就离开未分类）
  useEffect(() => {
    let alive = true;
    readPendingRows('document').then((rows) => {
      if (alive) setPending(rows);
    });
    return () => {
      alive = false;
    };
  }, [documents]);

  useEffect(
    () =>
      getSyncManager().onStoreChanged((table) => {
        if (table !== 'document') return;
        readPendingRows('document').then(setPending);
      }),
    []
  );

  const rows = unsortedDocuments(overlayDocumentRows(documents, pending));
  const options = folderOptions(folders);

  async function moveTo(documentId: string, folderId: string | null) {
    const manager = getSyncManager();
    // G1514：开库闸门已在内核门面里 ⇒ 不再拿 boot() 当就绪闸门（那会把一趟网络往返
    // 塞进「归档」这一击）。
    await manager.applyLocal({ table: 'document', id: documentId, patch: { folderId } });
    // 覆盖层只活到 flush ack：队列一清空服务端才是权威，此时若不重取 RSC，
    // 该行会带着旧 folderId 重新出现（实测归档后 1.5s 仍在列表里）。
    setPending(await readPendingRows('document'));
    bumpTree();
    await manager.flushNow();
    router.refresh();
  }

  if (rows.length === 0) {
    return <p className="px-1 py-6 text-sm text-muted-foreground">{INBOX_EMPTY}</p>;
  }

  return (
    <div className="flex flex-col">
      <p className="mb-2 text-[13px] text-muted-foreground">{formatDocCount(rows.length)}</p>
      <ul className="flex flex-col gap-0.5">
        {rows.map((doc) => (
          <li
            key={doc.id}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors hover:bg-sidebar-hover"
          >
            <Link
              href={`/documents/${doc.id}`}
              className="flex min-w-0 flex-1 items-center gap-2 text-sidebar-fg"
            >
              {doc.icon ? (
                <span className="text-base leading-none">{doc.icon}</span>
              ) : (
                <File className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="truncate">{doc.title || untitledFor('list')}</span>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground" />
                }
              >
                <FolderInput className="size-4" />
                <span className="sr-only">{MOVE_TO}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => void moveTo(doc.id, null)}>
                  {UNSORTED_TITLE}
                </DropdownMenuItem>
                {options.length > 0 && <DropdownMenuSeparator />}
                {options.map((folder) => (
                  <DropdownMenuItem
                    key={folder.id}
                    style={{ paddingLeft: `${folder.depth * 12 + 8}px` }}
                    onClick={() => void moveTo(doc.id, folder.id)}
                  >
                    {folder.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        ))}
      </ul>
    </div>
  );
}
