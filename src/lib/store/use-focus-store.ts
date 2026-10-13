import { create } from 'zustand';

interface FocusState {
  active: boolean;
  toggle: () => void;
  setActive: (active: boolean) => void;
}

/**
 * G11 专注模式. The store holds the flag and nothing else: the sidebar, the top bar and the
 * right panel each *read* it and hide themselves, so leaving focus mode restores the layout by
 * construction — no panel is closed and no `isOpen` flag is moved, which is what "退出后布局还原"
 * asks for without a restore step that can drift out of sync with what the user had open.
 */
export const useFocusStore = create<FocusState>((set) => ({
  active: false,
  toggle: () => set((state) => ({ active: !state.active })),
  setActive: (active) => set({ active }),
}));
