'use client';

import { useState } from 'react';
import { FolderPlus, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { createFolderLocal } from '@/components/sync/create-local';
import { UNTITLED_FOLDER } from '@/lib/document/untitled-copy';
import { pendingLabel } from '@/lib/app/pending-states';

/**
 * G15 —— craft 的文档首页只有卡片网格，本地那条五按钮快捷条撤掉了。
 * 「新建文件夹」原本只在那条里，这里挪到侧栏「文件夹」分区头的动作位（hover 出现）。
 * G1608：离线时点了没有可观察反应（静默早退，不改禁用态、不弹 toast）。
 * G300：创建期间换成 spinner 并挂上采集句（creating folders）；分区头在忙碌时保持可见，
 * 否则鼠标移开就把进度一起藏了。
 */
export function NewFolderButton() {
  const router = useRouter();
  const { data: session } = useSession();
  const [creating, setCreating] = useState(false);

  async function handleNewFolder() {
    if (!navigator.onLine) return;
    if (creating) return;
    setCreating(true);
    try {
      await createFolderLocal({ userId: session?.user?.id, name: UNTITLED_FOLDER });
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleNewFolder}
        disabled={creating}
        aria-busy={creating || undefined}
        aria-label="新建文件夹"
        data-testid="sidebar-new-folder"
        className={`flex size-6 items-center justify-center rounded text-muted-foreground transition-opacity hover:bg-sidebar-hover hover:text-foreground focus-visible:opacity-100 group-hover/section:opacity-100 ${creating ? 'opacity-100' : 'opacity-0'}`}
      >
        {creating ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <FolderPlus className="size-3.5" />
        )}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {creating ? pendingLabel('creatingFolders') : ''}
      </span>
    </>
  );
}
