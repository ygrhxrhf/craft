'use client';

import { useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import { useRemindRequestStore } from '@/lib/store/use-remind-request-store';
import {
  REMIND_MENU,
  setBlockReminder,
  setTaskReminder,
  taskItemTarget,
} from '@/components/editor/drag-handle/block-actions';
import { isInstantPreset, type RemindPresetId } from '@/lib/task/remind-presets';

/**
 * G1596: the slash command 「提醒我…」 opens this one chooser. Instant presets write the
 * reminder; the two presets with no local surface (`custom` / `saveForLater`) render disabled
 * rather than silently clearing an existing reminder.
 */
export function RemindMenuHost({ editor }: { editor: Editor }) {
  const request = useRemindRequestStore((state) => state.request);

  useEffect(() => {
    if (!request) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') useRemindRequestStore.getState().close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [request]);

  if (!request) return null;

  const pick = (preset: RemindPresetId) => {
    const { state, view } = editor;
    const index = state.selection.$from.index(0);
    const now = new Date();
    if (taskItemTarget(state, index)) setTaskReminder(state, view.dispatch, index, preset, now);
    else setBlockReminder(state, view.dispatch, index, preset, now);
    useRemindRequestStore.getState().close();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/10"
        onClick={() => useRemindRequestStore.getState().close()}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-label="提醒我…"
        data-testid="remind-menu"
        className="relative w-64 rounded-xl bg-background p-2 shadow-xl"
      >
        {REMIND_MENU.map((preset) => {
          const enabled = isInstantPreset(preset.id);
          return (
            <button
              key={preset.id}
              type="button"
              disabled={!enabled}
              onClick={() => pick(preset.id as RemindPresetId)}
              className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-foreground/4 disabled:opacity-40"
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
