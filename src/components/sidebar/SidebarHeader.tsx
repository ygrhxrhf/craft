'use client';

import { useEffect, useState } from 'react';
import { ChevronsUpDown, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';
import { createDocumentLocal } from '@/components/sync/create-local';
import { useRouter } from 'next/navigation';
import { useCommandPaletteStore } from '@/lib/store/use-command-palette-store';
import { useSettingsStore } from '@/lib/store/use-settings-store';
import { getSpaceContext } from '@/actions/space/space';
import { spaceIconPreset, spaceInitial } from '@/lib/app/space-icons';

/**
 * G05 —— craft 的侧栏顶行是**空间切换**（268×36 @x10），搜索在全局顶栏中央。
 * 本地没有多空间，这一行就是当前空间（图标＋名字），点开进设置的空间页（名字与图标都在那里改）。
 *
 * 搜索仍在侧栏里只对手机保留：窄屏不挂全宽顶栏（craft 的窄屏形态未采集），
 * 抽屉里的这一枚是手机唯一的搜索入口。
 */
export function SidebarHeader() {
  const router = useRouter();
  const { data: session } = useSession();
  const openPalette = useCommandPaletteStore((s) => s.open);
  const openSettings = useSettingsStore((s) => s.openSettings);
  const [space, setSpace] = useState<{ name: string; icon: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSpaceContext()
      .then((summary) => {
        if (!cancelled) setSpace({ name: summary.name, icon: summary.icon });
      })
      .catch(() => {
        if (!cancelled) setSpace(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleNewDoc() {
    // G1608：离线时点了没有可观察反应（静默早退，不改禁用态、不弹 toast）。
    if (!navigator.onLine) return;
    const id = await createDocumentLocal({ userId: session?.user?.id });
    router.push(`/documents/${id}`);
  }

  const preset = spaceIconPreset(space?.icon);

  return (
    <div className="flex items-center gap-1 pl-2.5 pr-1 pt-2 pb-1">
      <button
        type="button"
        data-testid="sidebar-space-switch"
        onClick={() => openSettings('space')}
        className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 text-left transition-colors hover:bg-sidebar-hover"
      >
        <span
          aria-hidden
          className="flex size-5 shrink-0 items-center justify-center rounded-[5px] text-[11px] font-semibold text-white"
          style={{ backgroundImage: `linear-gradient(to bottom right, ${preset.from}, ${preset.to})` }}
        >
          {spaceInitial(space?.name)}
        </span>
        <span className="min-w-0 flex-1 truncate text-[length:13px] font-medium leading-4 text-sidebar-foreground">
          {space?.name ?? '空间'}
        </span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-foreground/45" />
      </button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground md:hidden"
        onClick={openPalette}
        aria-label="搜索"
      >
        <Search className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleNewDoc}
        aria-label="新建文档"
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}
