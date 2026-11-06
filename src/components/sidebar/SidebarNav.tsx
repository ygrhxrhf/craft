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
  CheckSquare,
  FileText,
  Home,
  Inbox,
  LayoutTemplate,
  Trash2,
  Cable,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Settings2,
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
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

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
  '/trash': { label: '回收站', icon: Trash2 },
  '/archive': { label: '归档', icon: Archive },
};

export function SidebarNav() {
  const pathname = usePathname();
  // G176/G600: the order and visibility live on this device; the server snapshot is the default.
  const prefs = useSyncExternalStore(subscribeSidebarPrefs, readSidebarPrefsNow, serverSidebarPrefs);
  const [customizing, setCustomizing] = useState(false);
  const visible = visibleSidebarSections(prefs);

  const save = (next: SidebarPrefs) => {
    if (typeof localStorage !== 'undefined') writeSidebarPrefs(localStorage, next);
  };

  return (
    <nav className="flex flex-col gap-1 px-2 py-2">
      {visible.map((id) => {
        const item = SECTIONS[id];
        const isActive = pathname === id || pathname.startsWith(id + '/');
        return (
          <Link
            key={id}
            href={id}
            className={cn(
              'flex min-h-9 items-center gap-2.5 rounded-lg px-3 text-[13px] transition-colors',
              isActive
                ? 'bg-sidebar-active text-sidebar-accent-foreground font-medium shadow-sm'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-hover hover:text-sidebar-foreground'
            )}
          >
            <item.icon className="size-[18px] shrink-0" />
            {item.label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={() => setCustomizing(true)}
        className="mt-1 flex min-h-9 items-center gap-2.5 rounded-lg px-3 text-[13px] text-sidebar-foreground/50 transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground"
      >
        <Settings2 className="size-[18px] shrink-0" />
        自定义侧栏
      </button>

      <Dialog open={customizing} onOpenChange={setCustomizing}>
        <DialogContent className="max-w-md">
          <DialogTitle>自定义侧栏</DialogTitle>
          <DialogDescription>调整分区顺序，或隐藏不需要的分区。</DialogDescription>
          <ul className="mt-4 space-y-1" data-testid="sidebar-customize-list">
            {prefs.order.map((id, index) => {
              const hidden = prefs.hidden.includes(id);
              return (
                <li key={id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-foreground/4">
                  <span className="min-w-0 flex-1 truncate text-ui">{SECTIONS[id].label}</span>
                  <button
                    type="button"
                    aria-label={`上移 ${SECTIONS[id].label}`}
                    disabled={index === 0}
                    onClick={() => save(moveSidebarSection(prefs, id, -1))}
                    className="rounded p-1 text-foreground/50 disabled:opacity-25"
                  >
                    <ChevronUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`下移 ${SECTIONS[id].label}`}
                    disabled={index === prefs.order.length - 1}
                    onClick={() => save(moveSidebarSection(prefs, id, 1))}
                    className="rounded p-1 text-foreground/50 disabled:opacity-25"
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