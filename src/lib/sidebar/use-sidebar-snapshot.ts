'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getSidebarSnapshot } from '@/actions/sidebar/snapshot';
import { useSidebarStore } from '@/lib/store/use-sidebar-store';

type Snapshot = Awaited<ReturnType<typeof getSidebarSnapshot>>;

/**
 * One fetch shared by every sidebar section. The cache is module-level and keyed by
 * the reload signal plus the route: the four trees mount in the same commit, so the
 * first one starts the request and the rest read the same promise. Keyed on the
 * pathname as well as the version because collection and whiteboard creation does
 * not bump the tree -- navigating into the new entity is what surfaces it.
 */
let cached: { key: string; promise: Promise<Snapshot> } | null = null;

export function useSidebarSnapshot(): Snapshot | null {
  const treeVersion = useSidebarStore((state) => state.treeVersion);
  const pathname = usePathname();
  const key = `${treeVersion}:${pathname}`;
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (cached?.key !== key) {
      const promise = getSidebarSnapshot();
      cached = { key, promise };
      promise.catch(() => {
        // A failed reload must not be replayed from the cache forever.
        if (cached?.key === key) cached = null;
      });
    }
    cached.promise.then(
      (value) => {
        if (!cancelled) setSnapshot(value);
      },
      () => {
        // The sections keep showing what they had, same as a rejected load() did.
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key]);

  return snapshot;
}
