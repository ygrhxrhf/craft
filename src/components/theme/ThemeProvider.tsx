'use client';

import { useEffect } from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { applyAccent, readAccent } from '@/lib/accent';

function AccentRestorer() {
  useEffect(() => {
    const stored = readAccent();
    if (stored) applyAccent(stored);
  }, []);
  return null;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AccentRestorer />
      {children}
    </NextThemesProvider>
  );
}
