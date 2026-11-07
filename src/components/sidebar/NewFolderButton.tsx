'use client';

import { FolderPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { createFolderLocal } from '@/components/sync/create-local';
import { UNTITLED_FOLDER } from '@/lib/document/untitled-copy';

/**
 * G15 —— craft 的文档首页只有卡片网格，本地那条五按钮快捷条撤掉了。
 * 「新建文件夹」原本只在那条里，这里挪到侧栏「文件夹」分区头的动作位（hover 出现）。
 * G1608：离线时点了没有可观察反应（静默早退，不改禁用态、不弹 toast）。
 */
export function NewFolderButton() {
  const router = useRouter();
  const { data: session } = useSession();

  async function handleNewFolder() {
    if (!navigator.onLine) return;
    await createFolderLocal({ userId: session?.user?.id, name: UNTITLED_FOLDER });
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleNewFolder}
      aria-label="新建文件夹"
      data-testid="sidebar-new-folder"
      className="flex size-6 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-sidebar-hover hover:text-foreground focus-visible:opacity-100 group-hover/section:opacity-100"
    >
      <FolderPlus className="size-3.5" />
    </button>
  );
}
