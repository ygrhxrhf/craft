'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArchiveRestore } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { setDocumentArchived } from '@/actions/document/archive';

/**
 * G93: the archive view. Unarchiving restores the document to the normal lists; the row stays on
 * this screen until the refresh removes it.
 */
export function ArchiveList({
  documents,
}: {
  documents: { id: string; title: string; updatedAt: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  if (documents.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        暂无归档的文档。
      </div>
    );
  }

  return (
    <ul className="divide-y divide-foreground/6 rounded-lg border border-border">
      {documents.map((doc) => (
        <li key={doc.id} className="flex items-center justify-between gap-3 px-3 py-2">
          <Link href={`/documents/${doc.id}`} className="min-w-0 truncate text-sm hover:underline">
            {doc.title || '无标题'}
          </Link>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy === doc.id}
            onClick={() => {
              setBusy(doc.id);
              void setDocumentArchived(doc.id, false).finally(() => {
                setBusy(null);
                router.refresh();
              });
            }}
          >
            <ArchiveRestore className="mr-1 size-4" />
            取消归档
          </Button>
        </li>
      ))}
    </ul>
  );
}
