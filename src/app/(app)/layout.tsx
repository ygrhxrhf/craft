import { Sidebar } from '@/components/sidebar/Sidebar';
import { CommandPalette } from '@/components/search/CommandPalette';
import { ShellShortcuts } from '@/components/editor/shell-shortcuts';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { AppTopBar } from '@/components/app/AppTopBar';
import { AppShellHeader } from '@/components/app/AppPageHeader';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    // G01/G02：craft 是「全宽顶栏 48 → 其下 侧栏 288 + 主列 1152」的四块结构。
    // 本地此前是「侧栏 + main（header 在 main 内）」两栏，侧栏从 y=0 起、main 右移 4px。
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      <AppTopBar />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        {/* The named container the official layout hangs its column thresholds on (G1079/G1124):
            the content area is the reference, not the viewport, so a wide window with the sidebar
            open still counts as narrow. */}
        <main className="app-main-wrapper flex min-w-0 flex-1 flex-col overflow-hidden">
          <AppShellHeader />
          {children}
        </main>
      </div>
      <CommandPalette />
      <ShellShortcuts />
      <SettingsModal />
    </div>
  );
}
