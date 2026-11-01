'use client';

import { useEffect, useState } from 'react';
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';
import { applyAccent, readAccent } from '@/lib/accent';
import { readUrlOverride, resolveScheme, storedThemeChoice, type ResolvedScheme } from '@/lib/theme-resolution';
import { applyThemeAxes, themeAxes } from '@/lib/theme/theme-axes';
import { readLocalRecords } from '@/components/sync/local-records';
import { getSyncManager } from '@/lib/sync-core';
import { useSession } from 'next-auth/react';

function AccentRestorer() {
  useEffect(() => {
    const stored = readAccent();
    if (stored) applyAccent(stored);
  }, []);
  return null;
}

/**
 * G1384: the two input-media axes the official effect writes next to the scheme. They are derived
 * from media queries and kept in sync while the window is open, so CSS can key on
 * `[data-pointer]` / `[data-scrollbar]` instead of guessing.
 */
function ThemeAxesWriter() {
  useEffect(() => {
    const coarse = window.matchMedia('(pointer: coarse)');
    const persistentScrollbar = window.matchMedia('(scrollbar-gutter: stable)');
    const sync = () =>
      applyThemeAxes(
        document.documentElement,
        themeAxes({ coarsePointer: coarse.matches, persistentScrollbar: persistentScrollbar.matches }),
      );
    sync();
    coarse.addEventListener('change', sync);
    return () => coarse.removeEventListener('change', sync);
  }, []);
  return null;
}

/**
 * G1224 的实现侧：`user.theme` 此前**只写不读**——`getPreferences()` 只被设置面板调用，启动时
 * 从不把已存偏好交给 next-themes ⇒ 换台设备（或清了 localStorage）打开，明明库里写着 `dark`，
 * 渲染出来的却是浅色（探针实测）。这里在启动时经**离线内核的本地镜像**读回它并 `setTheme`：
 * 元数据走内核（不新开 Server Action），且 URL 覆写仍是更高档（`forcedTheme` 压过它）。
 */
function StoredThemeRestorer() {
  const { setTheme } = useTheme();
  const { status, data: session } = useSession();

  useEffect(() => {
    if (status !== 'authenticated') return;
    const userId = session?.user?.id;
    if (!userId) return;

    let alive = true;
    const apply = async () => {
      const rows = await readLocalRecords('user');
      const row = rows.find((r) => r.id === userId && r.op !== 'delete');
      if (!alive || !row) return;
      setTheme(storedThemeChoice(row.data?.theme));
    };
    void apply().catch(() => {});
    // ack+pull 之后镜像里才有权威行 ⇒ 跟着 store 变化再读一次（幂等）。
    const unsubscribe = getSyncManager().onStoreChanged((table) => {
      if (table === 'user') void apply().catch(() => {});
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [status, session?.user?.id, setTheme]);

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

/**
 * G1206: the official resolution leaves a **derived** scheme on the element that is never stored —
 * the panel and CSS read it instead of re-deriving. Locally next-themes owns the class, so the
 * same derived value is mirrored onto `data-resolved-scheme`.
 */
function ResolvedSchemeWriter() {
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'light' || resolvedTheme === 'dark') {
      root.dataset.resolvedScheme = resolvedTheme;
    } else {
      delete root.dataset.resolvedScheme;
    }
  }, [resolvedTheme]);
  return null;
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
      <ThemeAxesWriter />
      <ResolvedSchemeWriter />
      <StoredThemeRestorer />
      {children}
    </NextThemesProvider>
  );
}
