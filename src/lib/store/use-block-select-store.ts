import { create } from 'zustand';

interface BlockSelectState {
  /** G1588：块选择态是否开着。 */
  active: boolean;
  /** 选中的顶层块下标（升序）。 */
  indices: number[];
  begin: (index: number) => void;
  extend: (index: number) => void;
  clear: () => void;
}

/**
 * G1588：官方在块选择态里用 `Shift-↑` 扩选、再按 `Ctrl-G` 成组。本地没有那套态，
 * 于是用一枚 store 记住「当前选了哪几个顶层块」，`Escape` 起手，`Shift-↑/↓` 扩选。
 */
export const useBlockSelectStore = create<BlockSelectState>((set) => ({
  active: false,
  indices: [],
  begin: (index) => set({ active: true, indices: [index] }),
  extend: (index) =>
    set((state) => {
      if (!state.active) return state;
      if (state.indices.includes(index)) return state;
      return { indices: [...state.indices, index].sort((a, b) => a - b) };
    }),
  clear: () => set({ active: false, indices: [] }),
}));
