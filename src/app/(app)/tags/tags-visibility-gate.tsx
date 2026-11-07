'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { useSettingsStore } from '@/lib/store/use-settings-store';
import {
  ENABLE_TAGS_IN_SETTINGS,
  TAGS_DISABLED_LINE,
  readTagsHiddenNow,
  serverTagsHidden,
  subscribeTagsVisibility,
} from '@/lib/browse/tag-visibility';

/**
 * G174 — when the space's tag switch is off, tags are hidden *everywhere*, including this page.
 * The disabled line is the official one and its follow-up points back at the settings that undo
 * it (`tags.disabled` → `tags.enable.tags.in.the.settings`).
 */
export function TagsVisibilityGate({ children }: { children: ReactNode }) {
  const hidden = useSyncExternalStore(
    subscribeTagsVisibility,
    readTagsHiddenNow,
    serverTagsHidden,
  );
  const openSettings = useSettingsStore((state) => state.openSettings);

  if (!hidden) return <>{children}</>;

  return (
    <div
      data-testid="tags-disabled"
      className="flex min-h-[72px] flex-col items-start justify-center gap-2 rounded-[10px] bg-foreground/[0.03] px-4 py-3"
    >
      <p className="text-ui leading-[15.6px] text-foreground/55">{TAGS_DISABLED_LINE}</p>
      <button
        type="button"
        onClick={() => openSettings('tags')}
        className="text-ui font-medium text-(--craft-accent) hover:underline"
      >
        {ENABLE_TAGS_IN_SETTINGS}
      </button>
    </div>
  );
}