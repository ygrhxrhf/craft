'use client';

import { useSidebarStore } from '@/lib/store/use-sidebar-store';
import { useFocusStore } from '@/lib/store/use-focus-store';
import { useIsMobile } from '@/lib/use-is-mobile';
import { useSyncExternalStore } from 'react';
import {
  readSidebarViewNow,
  serverSidebarView,
  subscribeSidebarView,
} from '@/lib/browse/sidebar-view';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { SidebarHeader } from './SidebarHeader';
import { SidebarNav } from './SidebarNav';
import { SidebarFooter } from './SidebarFooter';
import { SidebarResizer } from './SidebarResizer';
import { SidebarSection } from './SidebarSection';
import { NewFolderButton } from './NewFolderButton';
import { FolderTree } from './FolderTree';
import { DocumentTree } from './DocumentTree';
import { CollectionTree } from './CollectionTree';
import { WhiteboardTree } from './WhiteboardTree';
import { cn } from 'cn';

/**
 * G1452：视图档（文档 / 文件夹）决定树区里**先出哪一组**。本地两棵树是可以同时挂在侧栏上的
 * （官方在两种档下各只出一棵），所以这里按档重排而不是把另一棵藏掉——导航不丢，但弹层里选的
 * 那一档确实排在前面。
 */
function TreeSections({ view }: { view: 'document' | 'browse' }) {
  const documents = (
    <SidebarSection title="文档">
      <DocumentTree />
    </SidebarSection>
  );
  const folders = (
    <>
      {/* G15：首页快捷条撤掉后，「新建文件夹」只剩这一个入口（分区头 hover 出现的 ＋）。 */}
      <SidebarSection title="文件夹" action={<NewFolderButton />}>
        <FolderTree />
      </SidebarSection>

      <SidebarSection title="集合">
        <CollectionTree />
      </SidebarSection>

      <SidebarSection title="白板">
        <WhiteboardTree />
      </SidebarSection>
    </>
  );
  return view === 'browse' ? (
    <>
      {folders}
      {documents}
    </>
  ) : (
    <>
      {documents}
      {folders}
    </>
  );
}

function SidebarBody() {
  const view = useSyncExternalStore(subscribeSidebarView, readSidebarViewNow, serverSidebarView);
  return (
    <>
      <SidebarHeader />
      <SidebarNav />

      {/* G08：craft 的树区容器 x=10（内容行 268 宽），本地此前 px-1（x=4）。 */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2.5">
        <TreeSections view={view} />
      </div>

      <SidebarFooter />
    </>
  );
}

export function Sidebar() {
  const { isOpen, width, mobileNavOpen, setMobileNavOpen } = useSidebarStore();
  const isMobile = useIsMobile();
  // 专注模式（G11）：侧栏自己读旗标并整块不挂载，退出即还原——`isOpen`/`width`/抽屉状态
  // 一个都没被改动，所以不存在"恢复步骤和用户的开合状态对不上"这类漂移。
  const focusActive = useFocusStore((state) => state.active);

  if (focusActive) return null;

  if (isMobile) {
    return (
      <Sheet open={mobileNavOpen} onOpenChange={(next) => (!next ? setMobileNavOpen(false) : undefined)}>
        <SheetContent
          side="left"
          className="w-[var(--layout-sidebar-w)] max-w-none gap-0 p-0"
          onClick={(event) => {
            // Picking a destination should dismiss the drawer, like Craft's app shell.
            if ((event.target as HTMLElement).closest('a')) setMobileNavOpen(false);
          }}
        >
          <SheetTitle className="sr-only">导航</SheetTitle>
          <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground" aria-label="导航侧栏">
            <SidebarBody />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <>
      <aside
        className={cn(
          // G02/G04：craft 侧栏 288×852 @(0,48)、**没有右边框**（全站无竖向 hairline），
          // 288/1152 的接缝纯靠相邻摆位。此前是 `border-r` + h-full（y=0）。
          'relative flex h-full min-h-0 shrink-0 flex-col bg-sidebar transition-all duration-200',
          isOpen ? 'opacity-100' : 'w-0 opacity-0 overflow-hidden'
        )}
        aria-label="导航侧栏"
        style={{ width: isOpen ? width : 0 }}
      >
        <SidebarBody />
        {isOpen && <SidebarResizer />}
      </aside>
    </>
  );
}
