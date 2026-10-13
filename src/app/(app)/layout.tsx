import { Sidebar } from '@/components/sidebar/Sidebar';
import { CommandPalette } from '@/components/search/CommandPalette';
import { ShellShortcuts } from '@/components/editor/shell-shortcuts';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { AppShellHeader } from '@/components/app/AppPageHeader';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <Sidebar />
      {/* The named container the official layout hangs its column thresholds on (G1079/G1124):
          the content area is the reference, not the viewport, so a wide window with the sidebar
          open still counts as narrow. */}
      <main className="app-main-wrapper flex flex-1 flex-col overflow-hidden">
        <AppShellHeader />
        {children}
      </main>
      <CommandPalette />
      <ShellShortcuts />
      <SettingsModal />
    </div>
  );
}
