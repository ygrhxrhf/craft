'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { DialogHost } from '@/components/dialog/DialogHost';
import { SyncBoot } from '@/components/sync/SyncBoot';
import { SyncStatusIndicator } from '@/components/sync/SyncStatusIndicator';
import { InputIntentProvider } from '@/components/providers/InputIntentProvider';
import { Toaster } from '@/components/ui/toast';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <InputIntentProvider />
        {children}
        <Toaster />
        <DialogHost />
        <SyncBoot />
        <SyncStatusIndicator />
      </ThemeProvider>
    </SessionProvider>
  );
}
