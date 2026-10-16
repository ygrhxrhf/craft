'use client';

import { useEffect, useState } from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { applyAccent, readAccent } from '@/lib/accent';
import { readUrlOverride, resolveScheme, type ResolvedScheme } from '@/lib/theme-resolution';

function AccentRestorer() {
  useEffect(() => {
    const stored = readAccent();
    if (stored) applyAccent(stored);
  }, []);
  return null;
}

/**
 * G1206: the official resolution chain is 特性开关 > URL 覆写 > 存储值 > 系统. Locally there is no
 * feature-flag layer, so the URL override is the top tier — which is exactly what next-themes'
 * `forcedTheme` does (it wins over the stored value without rewriting it). The stored value stays
 * untouched, mirroring the official two-field split where `resolvedColorScheme` is derived and
 * never persisted.
 *
 * `?system` is an override too: per the official `Ik`, it replaces the stored value and follows the
 * OS — so it tracks the media query live instead of freezing the preference at mount.
 */
function useUrlSchemeOverride(): ResolvedScheme | undefined {
  const [forced, setForced] = useState<ResolvedScheme | undefined>(undefined);

  useEffect(() => {
    const override = readUrlOverride(window.location.search);
    if (!override) return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () =>
      setForced(resolveScheme({ url: override, system: media.matches ? 'dark' : 'light' }));
    sync();
    if (override !== 'system') return;

    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  return forced;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const forced = useUrlSchemeOverride();

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      forcedTheme={forced}
    >
      <AccentRestorer />
      {children}
    </NextThemesProvider>
  );
}
