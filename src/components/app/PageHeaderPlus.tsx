'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { createDocumentLocal } from '@/components/sync/create-local';
import { useSettingsStore } from '@/lib/store/use-settings-store';
import { useSidebarStore } from '@/lib/store/use-sidebar-store';

/**
 * G1663 —— 官方每一个列表页的页头都是 `[＋ 圆钮][标题]`（1440 下钮 @x=308、28×28、radius 8，
 * 标题因此落在 x=358）。此前本地标题直接贴在内距上（x=304），少了这枚钮，标题也就比官方左移 54。
 *
 * 钮的语义逐页不同：文档类页新建文档、任务页新建任务、模板页建模板。任务/模板已经在页面里各自
 * 有一枚带 `aria-label` 的动作钮，这里只**转点**它，避免把「新建任务」的离线队列逻辑复制一份。
 */
export type PagePlusKind = 'document' | 'task' | 'template';

const CLICK_TARGET: Record<Exclude<PagePlusKind, 'document'>, string> = {
  task: 'button[aria-label="新建任务"]',
  template: 'button[aria-label="创建模板"]',
};

export function PageHeaderPlus({ kind }: { kind: PagePlusKind }) {
  const router = useRouter();
  const { data: session } = useSession();
  const openSettings = useSettingsStore((s) => s.openSettings);
  const setSidebarOpen = useSidebarStore((s) => s.setOpen);
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (kind === 'document') {
      // G1608：离线时点了没有可观察反应（静默早退）。
      if (!navigator.onLine || busy) return;
      setBusy(true);
      try {
        const id = await createDocumentLocal({ userId: session?.user?.id });
        router.push(`/documents/${id}`);
      } finally {
        setBusy(false);
      }
      return;
    }
    const target = document.querySelector<HTMLButtonElement>(CLICK_TARGET[kind]);
    if (target) {
      target.click();
      return;
    }
    // 兜底：页面还没挂上那枚钮（例如模板页的空态），退到设置里对应的入口，而不是一枚死键。
    setSidebarOpen(true);
    void openSettings(kind === 'template' ? 'space' : 'space');
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-busy={busy || undefined}
      aria-label={kind === 'document' ? '新建文档' : kind === 'task' ? '新建任务' : '创建模板'}
      data-testid="page-header-plus"
      className="flex size-7 shrink-0 items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
    >
      <Plus className="size-4" />
    </button>
  );
}
