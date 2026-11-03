'use client';

import { FileText, FolderPlus, Database, PenTool, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';
import { createDocumentLocal, createFolderLocal } from '@/components/sync/create-local';
import { UNTITLED_FOLDER } from '@/lib/document/untitled-copy';
import { pendingLabel } from '@/lib/app/pending-states';
import { useRouter } from 'next/navigation';
import { IdeaStarterDialog } from '@/components/ai/IdeaStarterDialog';

export function QuickActions() {
  const router = useRouter();
  const { data: session } = useSession();
  const [busy, setBusy] = useState<'doc' | 'folder' | null>(null);
  const [ideaOpen, setIdeaOpen] = useState(false);

  async function handleNewDoc() {
    // G1608: offline the official build does not create anything and shows nothing — the click
    // simply has no effect (no disabled state, no toast, no navigation).
    if (!navigator.onLine) return;
    setBusy('doc');
    try {
      const id = await createDocumentLocal({ userId: session?.user?.id });
      router.push(`/documents/${id}`);
    } finally {
      setBusy(null);
    }
  }

  async function handleNewFolder() {
    if (!navigator.onLine) return;
    setBusy('folder');
    try {
      await createFolderLocal({ userId: session?.user?.id, name: UNTITLED_FOLDER });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
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
      {/* G70：Idea Starter —— 从一句描述生成结构化文档。 */}
      <Button
        variant="outline"
        className="flex h-20 flex-col items-center justify-center gap-2"
        onClick={() => setIdeaOpen(true)}
        disabled={busy !== null}
      >
        <Sparkles className="size-5" />
        <span className="text-ui">从想法开始</span>
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
      <IdeaStarterDialog open={ideaOpen} onClose={() => setIdeaOpen(false)} />
    </div>
  );
}
