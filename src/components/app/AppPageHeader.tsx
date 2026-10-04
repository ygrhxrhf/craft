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
      {/* On a phone the action button keeps the right edge and the bell queues in
          front of it: the bell is 36px plus a 12px gap, and anything that takes
          that out of the row moves the button, which is the one thing here whose
          position readers aim at. The title gives way instead -- it is already
          `truncate` for exactly this. From `sm` up there is width to share, so
          the bell trails the actions the way the desktop header has always drawn
          it. */}
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
