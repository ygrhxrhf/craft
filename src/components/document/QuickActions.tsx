'use client';

import { FileText, FolderPlus, Database, PenTool } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';
import { createDocumentLocal, createFolderLocal } from '@/components/sync/create-local';
import { UNTITLED_FOLDER } from '@/lib/document/untitled-copy';
import { pendingLabel } from '@/lib/app/pending-states';
import { useRouter } from 'next/navigation';

export function QuickActions() {
  const router = useRouter();
  const { data: session } = useSession();
  const [busy, setBusy] = useState<'doc' | 'folder' | null>(null);

  async function handleNewDoc() {
    setBusy('doc');
    try {
      const id = await createDocumentLocal({ userId: session?.user?.id });
      router.push(`/documents/${id}`);
    } finally {
      setBusy(null);
    }
  }

  async function handleNewFolder() {
    setBusy('folder');
    try {
      await createFolderLocal({ userId: session?.user?.id, name: UNTITLED_FOLDER });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Button
        variant="outline"
        className="flex h-20 flex-col items-center justify-center gap-2 border-transparent bg-craft-accent text-white hover:bg-craft-accent-hover hover:text-white"
        onClick={handleNewDoc}
        disabled={busy !== null}
        aria-busy={busy === 'doc'}
      >
        <FileText className="size-5" />
        <span className="text-ui font-medium">{busy === 'doc' ? pendingLabel('creatingDocuments') : '新建文档'}</span>
      </Button>
      <Button
        variant="outline"
        className="flex h-20 flex-col items-center justify-center gap-2 hover:bg-foreground/4"
        onClick={handleNewFolder}
        disabled={busy !== null}
        aria-busy={busy === 'folder'}
      >
        <FolderPlus className="size-5" />
        <span className="text-ui">{busy === 'folder' ? pendingLabel('creatingFolders') : '新建文件夹'}</span>
      </Button>
      <Button
        variant="outline"
        className="flex h-20 flex-col items-center justify-center gap-2"
        disabled
      >
        <Database className="size-5" />
        <span className="text-ui">新建集合</span>
      </Button>
      <Button
        variant="outline"
        className="flex h-20 flex-col items-center justify-center gap-2"
        disabled
      >
        <PenTool className="size-5" />
        <span className="text-ui">新建白板</span>
      </Button>
    </div>
  );
}
