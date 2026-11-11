'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSyncExternalStore, useState } from 'react';
import {
  Archive,
  Star,
  Tags,
  Clock,
  CalendarDays,
  Check,
  CheckSquare,
  FileText,
  Home,
  Inbox,
  LayoutTemplate,
  Trash2,
  Cable,
  Users,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  SlidersHorizontal,
} from 'lucide-react';
import { cn } from 'cn';
import { SIDEBAR_INBOX, TAGS_TITLE } from '@/lib/browse/official-copy';
import {
  moveSidebarSection,
  readSidebarPrefsNow,
  serverSidebarPrefs,
  subscribeSidebarPrefs,
  toggleSidebarSection,
  visibleSidebarSections,
  writeSidebarPrefs,
  type SidebarPrefs,
  type SidebarSectionId,
} from '@/lib/browse/sidebar-prefs';
import {
  CUSTOMIZE_SIDEBAR_LABEL,
  SHOW_GROUP_TITLE,
  VIEW_SWITCH_ITEMS,
  activeViewSwitchId,
  readSidebarViewNow,
  serverSidebarView,
  showsCustomizeEntry,
  subscribeSidebarView,
  writeSidebarView,
  type SidebarView,
} from '@/lib/browse/sidebar-view';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  readTagsHiddenNow,
  serverTagsHidden,
  subscribeTagsVisibility,
} from '@/lib/browse/tag-visibility';

const SECTIONS: Record<SidebarSectionId, { label: string; icon: typeof Home }> = {
  '/documents': { label: '首页', icon: Home },
  '/favorites': { label: '收藏', icon: Star },
  '/tags': { label: TAGS_TITLE, icon: Tags },
  '/inbox': { label: SIDEBAR_INBOX, icon: Inbox },
  '/recent': { label: '最近', icon: Clock },
  '/daily-notes': { label: '日记', icon: FileText },
  '/tasks': { label: '任务', icon: CheckSquare },
  '/calendar': { label: '日历', icon: CalendarDays },
  '/templates': { label: '模板', icon: LayoutTemplate },
  '/connections': { label: '连接', icon: Cable },
  '/shared-with-me': { label: '与我共享', icon: Users },
  '/trash': { label: '回收站', icon: Trash2 },
  '/archive': { label: '归档', icon: Archive },
};

export function SidebarNav() {
  const pathname = usePathname();
  // G176/G600: the order and visibility live on this device; the server snapshot is the default.
  const prefs = useSyncExternalStore(subscribeSidebarPrefs, readSidebarPrefsNow, serverSidebarPrefs);
  // G174：标签在空间设置里被关闭时「标签将在所有位置隐藏」——侧栏这一行也不该再列出来。
  const tagsHidden = useSyncExternalStore(
    subscribeTagsVisibility,
    readTagsHiddenNow,
    serverTagsHidden,
  );
  const [customizing, setCustomizing] = useState(false);
  // G1452：侧栏的视图档（文档 / 文件夹），本机偏好。
  const view = useSyncExternalStore(subscribeSidebarView, readSidebarViewNow, serverSidebarView);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const visible = visibleSidebarSections(prefs).filter(
    (id) => !(tagsHidden && id === '/tags'),
  );

  const save = (next: SidebarPrefs) => {
    if (typeof localStorage !== 'undefined') writeSidebarPrefs(localStorage, next);
  };

  const chooseView = (next: SidebarView) => {
    if (typeof localStorage !== 'undefined') writeSidebarView(localStorage, next);
    setViewMenuOpen(false);
  };

  return (
    <nav className="flex flex-col gap-px px-2.5 py-2">
      {visible.map((id) => {
        const item = SECTIONS[id];
        const isActive = pathname === id || pathname.startsWith(id + '/');
        return (
          <Link
            key={id}
            href={id}
            className={cn(
              // G17：craft 导航行 268×32、步进 33、radius 8、图标 20×20，未激活文字 α0.85（G38）。
              'flex h-8 items-center gap-2.5 rounded-md px-1.5 text-[length:13px] leading-4 transition-colors',
              isActive
                ? 'bg-sidebar-active text-sidebar-accent-foreground font-medium shadow-sm'
                : 'text-sidebar-foreground/85 hover:bg-sidebar-hover hover:text-sidebar-foreground'
            )}
          >
            <item.icon className="size-5 shrink-0" />
            {item.label}
          </Link>
        );
      })}
      {/*
        G1452 —— 视图切换弹层：分组标题走 `header`（「显示」），行 id 与它显示的文案**不同源**
        （`tableOfContents`/「文档」、`organize`/「文件夹」），当前档用 rightContent 槽里的一枚勾
        表达（不是 class），「自定义侧边栏」只在 browse 档出现。
      */}
      <Popover open={viewMenuOpen} onOpenChange={setViewMenuOpen}>
        <PopoverTrigger
          data-testid="sidebar-view-switch"
          className="mt-1 flex h-8 items-center gap-2.5 rounded-md px-1.5 text-[length:13px] leading-4 text-sidebar-foreground/50 transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground"
        >
          <SlidersHorizontal className="size-5 shrink-0" />
          {SHOW_GROUP_TITLE}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-1">
          <div
            role="group"
            aria-label={SHOW_GROUP_TITLE}
            data-testid="sidebar-view-group"
            className="flex flex-col"
          >
            <div className="px-2 py-1 text-[11px] font-medium text-foreground/45">
              {SHOW_GROUP_TITLE}
            </div>
            {VIEW_SWITCH_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                data-testid={`sidebar-view-${item.id}`}
                onClick={() => chooseView(item.view)}
                className="flex min-h-8 items-center gap-2 rounded-md px-2 text-left text-[13px] hover:bg-foreground/4"
              >
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {/* 选中态＝内容槽里多一枚图标（rightContent），不是行上的 class。 */}
                {activeViewSwitchId(view) === item.id ? (
                  <Check className="size-3.5 shrink-0 text-(--craft-accent)" aria-hidden />
                ) : null}
              </button>
            ))}
          </div>
          {showsCustomizeEntry(view) && (
            <div className="mt-1 border-t border-border pt-1" data-testid="sidebar-customize-entry">
              <button
                type="button"
                onClick={() => {
                  setViewMenuOpen(false);
                  setCustomizing(true);
                }}
                className="flex min-h-8 w-full items-center rounded-md px-2 text-left text-[13px] hover:bg-foreground/4"
              >
                {CUSTOMIZE_SIDEBAR_LABEL}
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      <Dialog open={customizing} onOpenChange={setCustomizing}>
        <DialogContent className="max-w-md">
          <DialogTitle>{CUSTOMIZE_SIDEBAR_LABEL}</DialogTitle>
          <DialogDescription>调整分区顺序，或隐藏不需要的分区。</DialogDescription>
          <ul className="mt-4 space-y-1" data-testid="sidebar-customize-list">
            {prefs.order.map((id, index) => {
              const hidden = prefs.hidden.includes(id);
              return (
                <li key={id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-foreground/4">
                  <span className="min-w-0 flex-1 truncate text-[length:13px] leading-4">{SECTIONS[id].label}</span>
                  <button
                    type="button"
                    aria-label={`上移 ${SECTIONS[id].label}`}
                    disabled={index === 0}
                    onClick={() => save(moveSidebarSection(prefs, id, -1))}
                    className="rounded p-1 text-foreground/50 disabled:opacity-40"
                  >
                    <ChevronUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`下移 ${SECTIONS[id].label}`}
                    disabled={index === prefs.order.length - 1}
                    onClick={() => save(moveSidebarSection(prefs, id, 1))}
                    className="rounded p-1 text-foreground/50 disabled:opacity-40"
                  >
                    <ChevronDown className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={hidden ? `显示 ${SECTIONS[id].label}` : `隐藏 ${SECTIONS[id].label}`}
                    aria-pressed={hidden}
                    onClick={() => save(toggleSidebarSection(prefs, id))}
                    className={cn('rounded p-1', hidden ? 'text-foreground/30' : 'text-foreground/60')}
                  >
                    {hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </DialogContent>
      </Dialog>
    </nav>
  );
}