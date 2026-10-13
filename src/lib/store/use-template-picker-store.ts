import { create } from 'zustand';

import type { Editor } from '@tiptap/react';

/** A collapsed range in the document — the spot a picked template lands on. */
export interface InsertAt {
  from: number;
  to: number;
}

interface TemplatePickerState {
  open: boolean;
  editor: Editor | null;
  at: InsertAt | null;
  openTemplatePicker: (payload: { editor: Editor; at: InsertAt }) => void;
  close: () => void;
}

/**
 * G19 从模板插入: the slash menu hands the command an `editor` and a range, but the choice of
 * template arrives later from a dialog — so the insertion point has to survive that round trip.
 * Holding it here is why the slash query can be cleared immediately instead of sitting in the
 * document waiting for a pick that may never come.
 */
export const useTemplatePickerStore = create<TemplatePickerState>((set) => ({
  open: false,
  editor: null,
  at: null,
  openTemplatePicker: ({ editor, at }) => set({ open: true, editor, at }),
  close: () => set({ open: false, editor: null, at: null }),
}));
