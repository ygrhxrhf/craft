import { create } from 'zustand';

/** G1597/G1598: the slash command opens a four-option date panel for the task around the caret. */
export interface TaskDateMenuState {
  request: number;
  kind: 'deadline' | 'schedule' | null;
  open: (kind: 'deadline' | 'schedule') => void;
  close: () => void;
}

export const useTaskDateMenuStore = create<TaskDateMenuState>((set) => ({
  request: 0,
  kind: null,
  open: (kind) => set((state) => ({ request: state.request + 1, kind })),
  close: () => set({ kind: null }),
}));
