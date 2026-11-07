'use client';

import { Settings } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { ImportButton } from '@/components/sidebar/ImportButton';
import { HelpMenu } from '@/components/app/HelpMenu';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/lib/store/use-settings-store';

export function SidebarFooter() {
  const openSettings = useSettingsStore((s) => s.openSettings);

  return (
    // G07/G40：craft 底栏 288×61、1px 分隔线 @y839（左右各内缩 10px）、按钮 28×28 @x18。
    // 分隔线用 foreground/6（238,240,241），不是更深的 --sidebar-border。
    <div className="mt-auto flex items-center justify-between border-t border-foreground/6 px-3 py-2.5">
      <div className="flex items-center gap-0.5">
        <ImportButton />
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          onClick={() => openSettings('space')}
          aria-label="设置"
        >
          <Settings className="size-4" />
        </Button>
        <HelpMenu />
      </div>
      <ThemeToggle />
    </div>
  );
}
