'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSidebarStore } from '@/lib/store/use-sidebar-store';
import { NotificationBell } from '@/components/notification/NotificationBell';
import { PageHeaderPlus, type PagePlusKind } from '@/components/app/PageHeaderPlus';
import { setHeaderActionsNode } from '@/lib/app/header-actions-slot';
import { cn } from 'cn';

interface AppPageHeaderProps {
  title: string;
  actions?: ReactNode;
  className?: string;
  /** G1663: official list pages draw `[＋][title]`; the plus pushes the title to x=358. */
  plus?: PagePlusKind;
}

export function AppPageHeader({ title, actions, className, plus }: AppPageHeaderProps) {
  const toggleMobileNav = useSidebarStore((store) => store.toggleMobileNav);
  const sidebarOpen = useSidebarStore((store) => store.isOpen);
  const setSidebarOpen = useSidebarStore((store) => store.setOpen);

  return (
    <header
      className={cn(
        // G12/G13/G14：craft 页头带 1120×52 @(304,48)、内容左内距 16（无图标屏 h1 @main+16）。
        'flex h-[52px] shrink-0 items-center gap-3 border-b border-border/60 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80',
        'pt-[env(safe-area-inset-top)]',
        className,
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="-ml-1 size-10 shrink-0 rounded-xl text-muted-foreground md:hidden"
        onClick={toggleMobileNav}
        aria-label="打开导航"
      >
        <Menu className="size-5" />
      </Button>
      {/* G1660：侧栏在桌面端被收起后，页头给一枚展开入口，避免收起后无路可回。 */}
      {!sidebarOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="-ml-1 hidden size-9 shrink-0 rounded-xl text-muted-foreground md:inline-flex"
          onClick={() => setSidebarOpen(true)}
          aria-label="展开侧栏"
          title="展开侧栏"
        >
          <PanelLeft className="size-4" />
        </Button>
      )}
      {plus && (
        <div className="ml-1 flex shrink-0 items-center after:block after:w-[10px]">
          <PageHeaderPlus kind={plus} />
        </div>
      )}
      {/* G12/G13/G25：craft 页头带 1120×52、h1 22/600/26.4/ls0，带内 y=61（带顶 +13）。
          G1663：带 ＋ 钮时标题落在 x=358（304 + 4 + 28 + 22）。 */}
      <h1 className="min-w-0 flex-1 truncate text-[22px] font-semibold leading-[26.4px] tracking-normal">
        {title}
      </h1>
      {/* On a phone the action button keeps the right edge and the bell queues in
          front of it: the bell is 36px plus a 12px gap, and anything that takes
          that out of the row moves the button, which is the one thing here whose
          position readers aim at. The title gives way instead -- it is already
          `truncate` for exactly this. From `sm` up there is width to share, so
          the bell trails the actions the way the desktop header has always drawn
          it. */}
      {/* G1663：官方的「网格 / 列表 / 瀑布 + ⋯」是**顶栏右侧的一簇**（1440 下 34×28 三枚，
          x=1342/1377/1412），不是卡片网格上方单独一行。页面里的这些控件通过这个挂点
          portal 进顶栏，标题与卡片之间因此不再多出 44px。 */}
      <div
        id="page-header-actions"
        data-testid="page-header-actions"
        ref={setHeaderActionsNode}
        className="ml-auto flex shrink-0 items-center gap-1 empty:hidden"
      />
      {actions && (
        <div className="flex shrink-0 items-center gap-2 order-last sm:order-none">
          {actions}
        </div>
      )}
      <NotificationBell />
    </header>
  );
}

const ownHeaderRoutes = [
  '/documents',
  '/recent',
  '/favorites',
  '/tags',
  '/templates',
  '/trash',
  '/collections',
  '/shared-with-me',
  '/inbox',
  '/daily-notes',
  '/tasks',
  '/calendar',
  '/connections',
  '/whiteboards',
  '/search',
  '/settings',
];

export function AppShellHeader() {
  const pathname = usePathname();
  const hasOwnHeader = ownHeaderRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (hasOwnHeader || pathname.startsWith('/documents/')) return null;

  return <AppPageHeader title="Crafty" />;
}
