'use client';

import { CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HELP_ENTRIES, helpEntryUrl, type HelpEntry } from '@/lib/app/help-menu';
import { useSettingsStore } from '@/lib/store/use-settings-store';

/**
 * The help menu (G754). Six entries, verbatim. Three kinds of landing (G765):
 *   - `inAppPanel`（快捷键）→ 打开设置里的快捷键面板；
 *   - `externalLink`（最新特性／Web 和 Windows 版最新特性／常见问题／markdown 小抄）→ 帮助站；
 *   - `dialog`（意见反馈）→ 官方该条**不调 `window.open`**、落点未确认，本地落到设置里的反馈分区。
 *
 * 第五项（快捷键）开应用内面板；第六项（markdown 小抄）是**与它并列**的外链，不是面板里的一节——
 * 这正是本行要复刻的那件事：编辑器一直有 markdown 输入规则（`extensions/markdown-shortcuts.ts`），
 * 但用户此前看不到这份对照表。
 */export function HelpMenu() {
  const openSettings = useSettingsStore((s) => s.openSettings);

  const open = (entry: HelpEntry) => {
    if (entry.kind === 'externalLink') {
      const url = helpEntryUrl(entry.id);
      // noopener：官方三个外链闭包逐字带 `"noopener=true"`。
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (entry.id === 'shortcuts') {
      openSettings('shortcuts');
      return;
    }
    // 意见反馈：落到设置的「关于」分区（本地已有的反馈入口所在）。
    openSettings('about');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label="帮助" title="帮助" />
        }
      >
        <CircleHelp className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {HELP_ENTRIES.map((entry) => (
          <DropdownMenuItem key={entry.id} onClick={() => open(entry)}>
            {entry.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
