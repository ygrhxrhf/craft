'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SYNC_STATUS_LABEL,
  helpEntriesFor,
  helpEntryUrl,
  syncStatusText,
  type HelpEntry,
} from '@/lib/app/help-menu';
import { getSyncManager, type SyncStatus } from '@/lib/sync-core';
import { useSettingsStore } from '@/lib/store/use-settings-store';
import { useFeedbackStore } from '@/lib/store/use-feedback-store';
import { useIsMobile } from '@/lib/use-is-mobile';

/**
 * The help menu (G754). The listed entries depend on the viewport tier and on whether a document
 * is open (G877 / G883 / G891 / G950): desktop document page 8 rows, desktop space page 6, compact
 * 5 — the two sync rows and 「快捷键」 drop out in that order.
 *
 * Three kinds of landing (G765):
 *   - `inAppPanel`（快捷键）→ 打开设置里的快捷键面板；
 *   - `externalLink`（最新特性／Web 和 Windows 版最新特性／常见问题／Markdown 快捷方式／报告同步）→ 帮助站；
 *   - `dialog`（意见反馈）→ 官方该条**不调 `window.open`**，本地开站内反馈弹窗（G1414）；
 *   - `status`（`Sync Status`）→ 不是动作，是当前同步态的一行读数。
 */
export function HelpMenu() {
  const openSettings = useSettingsStore((s) => s.openSettings);
  const compact = useIsMobile();
  const pathname = usePathname();
  const documentPage = pathname.startsWith('/documents/');
  const entries = helpEntriesFor({ compact, documentPage });

  const [status, setStatus] = useState<SyncStatus>('synced');
  useEffect(() => {
    if (typeof window === 'undefined') return;
    return getSyncManager().subscribe((s) => setStatus(s));
  }, []);

  const open = (entry: HelpEntry) => {
    if (entry.kind === 'status') return;
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
    // 意见反馈：开站内反馈弹窗（G1414）。
    if (entry.id === 'feedback') {
      useFeedbackStore.getState().openFeedback();
      return;
    }
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
        {entries.map((entry) =>
          entry.kind === 'status' ? (
            // 官方这一行在中文界面里仍是英文 `Sync Status`（G950 的 i18n 缺口，逐字保留），
            // 行内文字是当前同步态（G891 读到的 `All changes synced` 就是它）。
            <div
              key={entry.id}
              aria-label={SYNC_STATUS_LABEL}
              title={SYNC_STATUS_LABEL}
              className="px-2 py-1.5 text-[13px] text-muted-foreground select-none"
            >
              {syncStatusText(status)}
            </div>
          ) : (
            <DropdownMenuItem key={entry.id} onClick={() => open(entry)}>
              {entry.label}
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
