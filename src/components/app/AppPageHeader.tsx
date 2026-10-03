'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSidebarStore } from '@/lib/store/use-sidebar-store';
import { NotificationBell } from '@/components/notification/NotificationBell';
import { cn } from 'cn';

interface AppPageHeaderProps {
  title: string;
  actions?: ReactNode;
  className?: string;
}

export function AppPageHeader({ title, actions, className }: AppPageHeaderProps) {
  const toggleMobileNav = useSidebarStore((store) => store.toggleMobileNav);

  return (
    <header
      className={cn(
        'flex min-h-12 items-center gap-3 border-b border-border/60 bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6',
        'pt-[calc(0.5rem+env(safe-area-inset-top))]',
        // Positioning context for the overlaid bell below.
        'relative',
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
      <h1 className="min-w-0 flex-1 truncate text-2xl font-semibold tracking-tight">
        {title}
      </h1>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      {/* The bell rides on top of the header's right edge instead of sitting in
          the flex row. As a shrink-0 sibling it took 36px plus a 12px gap out
          of the title's flex-1, which re-truncated the title and re-wrapped
          everything under it -- 5381 differing pixels on the mobile
          /whiteboards shot alone. Overlaying costs the title nothing. Above
          `sm` it goes back into the row, where there is width to share. */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 sm:static sm:translate-y-0">
        <NotificationBell />
      </div>
    </header>
  );
}

const ownHeaderRoutes = [
  '/documents',
  '/recent',
  '/favorites',
  '/templates',
  '/trash',
  '/collections',
  '/daily-notes',
  '/tasks',
  '/calendar',
  '/whiteboards',
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
