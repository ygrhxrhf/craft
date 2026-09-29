'use client';

import { FileText, FolderPlus, Database, PenTool } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';
import { createDocumentLocal, createFolderLocal } from '@/components/sync/create-local';
import { useRouter } from 'next/navigation';

export function QuickActions() {
  const router = useRouter();
  const { data: session } = useSession();

  async function handleNewDoc() {
    const id = await createDocumentLocal({ userId: session?.user?.id });
    router.push(`/documents/${id}`);
  }

  async function handleNewFolder() {
    await createFolderLocal({ userId: session?.user?.id, name: '未命名文件夹' });
    router.refresh();
  }

  return (
    <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Button
        variant="outline"
        className="flex h-20 flex-col items-center justify-center gap-2 border-transparent bg-craft-accent text-white hover:bg-craft-accent-hover hover:text-white"
        onClick={handleNewDoc}
      >
        <FileText className="size-5" />
        <span className="text-ui font-medium">新建文档</span>
      </Button>
      <Button
        variant="outline"
        className="flex h-20 flex-col items-center justify-center gap-2 hover:bg-foreground/4"
        onClick={handleNewFolder}
      >
        <FolderPlus className="size-5" />
        <span className="text-ui">新建文件夹</span>
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
