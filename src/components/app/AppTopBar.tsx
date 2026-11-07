'use client';

import { Search } from 'lucide-react';
import { useCommandPaletteStore } from '@/lib/store/use-command-palette-store';

/**
 * G01/G05 —— craft 有一套**全宽 48px 顶栏**（1440×48 @(0,0)），压在侧栏之上；
 * 侧栏与主列都从 y=48 起。搜索域在顶栏中央（428×28 @(506,10)，radius 10，占位「打开」）。
 *
 * 本地此前没有顶栏，搜索按钮挂在侧栏顶行。桌面（≥md）走这条；手机上顶栏不出现
 * （craft 的窄屏形态未采集），搜索入口仍留在侧栏抽屉里。
 */
export function AppTopBar() {
  const openPalette = useCommandPaletteStore((state) => state.open);

  return (
    <div className="hidden h-[var(--layout-header-h)] shrink-0 items-center justify-center px-4 md:flex">
      <button
        type="button"
        onClick={openPalette}
        aria-label="打开"
        data-testid="app-topbar-search"
        className="flex h-7 w-full max-w-[428px] items-center gap-2 rounded-[10px] bg-foreground/[0.045] px-2.5 text-[13px] font-medium leading-4 tracking-[-0.04px] text-foreground/85 transition-colors hover:bg-foreground/[0.07]"
      >
        <Search className="size-4 shrink-0 text-foreground/55" />
        <span className="flex-1 truncate text-left">打开</span>
        <kbd className="rounded border border-foreground/10 px-1 text-[10px] font-normal text-foreground/55">
          ⌘K
        </kbd>
      </button>
    </div>
  );
}
